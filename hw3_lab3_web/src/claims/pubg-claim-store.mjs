import { formatVnd } from "../domain/pubg-contract.mjs";

export const PubgClaimStatus = Object.freeze({
  IDLE: "IDLE",
  PENDING: "PENDING",
  CLAIMED: "CLAIMED",
  LOOTED_OUT: "LOOTED_OUT",
  ERROR: "ERROR",
});

function validateItem(item) {
  if (!item || typeof item.id !== "string" || item.id.length === 0) {
    throw new TypeError("Each claim item needs a non-empty string id.");
  }
  if (typeof item.title !== "string" || !Number.isFinite(item.priceVnd)) {
    throw new TypeError(`Claim item ${item.id} needs a title and finite priceVnd.`);
  }
  if (!Number.isFinite(item.remainingStock) || item.remainingStock < 0) {
    throw new RangeError(`Claim item ${item.id} needs non-negative remainingStock.`);
  }
}

/**
 * Create an optimistic inventory store. State and request revisions are keyed
 * by item id, so resolving one item's request never restores another item.
 * @param {{ items: Array<object>, claimApi: { claim: (request: object) => Promise<{status:number,body?:unknown}> } }} options
 */
export function createPubgClaimStore({ items, claimApi } = {}) {
  if (!Array.isArray(items)) throw new TypeError("An initial items array is required.");
  if (typeof claimApi?.claim !== "function") throw new TypeError("A claim API adapter is required.");

  const records = new Map();
  const revisions = new Map();
  const inFlight = new Map();
  const subscribers = new Set();
  let nextRequestId = 1;
  let snapshot = Object.freeze({});

  for (const item of items) {
    validateItem(item);
    if (records.has(item.id)) throw new TypeError(`Duplicate claim item id: ${item.id}.`);
    records.set(item.id, {
      item: Object.freeze({ ...item }),
      status: PubgClaimStatus.IDLE,
      message: "",
      result: null,
    });
    revisions.set(item.id, 0);
  }

  function publish() {
    const next = {};
    for (const [id, record] of records) {
      next[id] = Object.freeze({
        ...record.item,
        formattedPrice: formatVnd(record.item.priceVnd),
        claimStatus: record.status,
        claimMessage: record.message,
        claimResult: record.result,
        isClaiming: inFlight.has(id),
      });
    }
    snapshot = Object.freeze(next);
    for (const subscriber of [...subscribers]) {
      try {
        subscriber();
      } catch {
        // One UI subscriber must not prevent other subscribers receiving state.
      }
    }
  }

  function subscribe(callback) {
    if (typeof callback !== "function") throw new TypeError("Subscriber must be a function.");
    subscribers.add(callback);
    return () => subscribers.delete(callback);
  }

  function getSnapshot() {
    return snapshot;
  }

  function replaceItem(item) {
    validateItem(item);
    if (!records.has(item.id)) throw new RangeError(`Unknown claim item id: ${item.id}.`);
    const current = records.get(item.id);
    records.set(item.id, {
      item: Object.freeze({ ...item }),
      status: current.status === PubgClaimStatus.PENDING ? PubgClaimStatus.IDLE : current.status,
      message: "Inventory refreshed.",
      result: null,
    });
    revisions.set(item.id, revisions.get(item.id) + 1);
    publish();
  }

  function finish(operation, response, error) {
    const { itemId } = operation;
    if (inFlight.get(itemId) !== operation) {
      return { ok: false, ignored: true, reason: "stale-response" };
    }
    inFlight.delete(itemId);

    // A newer inventory refresh superseded this operation. Drop its response;
    // never overwrite the newer state with an old success or rollback snapshot.
    if (revisions.get(itemId) !== operation.appliedRevision) {
      publish();
      return { ok: false, ignored: true, reason: "stale-response" };
    }

    const current = records.get(itemId);
    const status = response?.status ?? error?.status ?? error?.response?.status;
    const responseBody = response?.body ?? response?.data ?? error?.response?.body ?? error?.response?.data;
    if (Number.isInteger(status) && status >= 200 && status < 300) {
      records.set(itemId, {
        item: current.item,
        status: PubgClaimStatus.CLAIMED,
        message: responseBody?.message ?? "Claim confirmed by the configured API response.",
        result: responseBody ?? response ?? error?.response ?? error,
      });
      revisions.set(itemId, operation.appliedRevision + 1);
      publish();
      return { ok: true, itemId, response };
    }

    const isConflict = status === 409;
    const detail = responseBody?.message ?? error?.message;
    records.set(itemId, {
      item: Object.freeze({ ...current.item, remainingStock: operation.previousStock }),
      status: isConflict ? PubgClaimStatus.LOOTED_OUT : PubgClaimStatus.ERROR,
      message: isConflict
        ? `Looted Out (HTTP 409). ${detail ?? "The server marked this item sold out."} Inventory restored to ${operation.previousStock}.`
        : `Claim failed${Number.isInteger(status) ? ` (HTTP ${status})` : " (network error)"}. Inventory restored. ${detail ?? "Please retry."}`,
      result: isConflict ? responseBody ?? response ?? error?.response ?? error : null,
    });
    revisions.set(itemId, operation.appliedRevision + 1);
    publish();
    return {
      ok: false,
      itemId,
      conflict: isConflict,
      status: Number.isInteger(status) ? status : undefined,
      error: error ?? null,
      response: response ?? null,
    };
  }

  async function claim(itemId) {
    const current = records.get(itemId);
    if (!current) return { ok: false, reason: "unknown-item" };
    if (inFlight.has(itemId)) return { ok: false, ignored: true, reason: "claim-in-flight" };
    if (current.item.remainingStock <= 0) {
      records.set(itemId, {
        ...current,
        status: PubgClaimStatus.LOOTED_OUT,
        message: "Looted Out. No stock is available.",
      });
      publish();
      return { ok: false, conflict: true, reason: "no-stock" };
    }

    const operation = {
      itemId,
      previousStock: current.item.remainingStock,
      requestId: `pubg-claim-${nextRequestId++}`,
      appliedRevision: 0,
    };
    inFlight.set(itemId, operation);
    const optimisticItem = Object.freeze({
      ...current.item,
      remainingStock: operation.previousStock - 1,
    });
    records.set(itemId, {
      item: optimisticItem,
      status: PubgClaimStatus.PENDING,
      message: `Claim pending. Stock optimistically reduced to ${optimisticItem.remainingStock}.`,
      result: null,
    });
    operation.appliedRevision = revisions.get(itemId) + 1;
    revisions.set(itemId, operation.appliedRevision);
    publish();

    try {
      const response = await claimApi.claim({
        itemId,
        itemType: current.item.itemType,
        title: current.item.title,
        requestId: operation.requestId,
      });
      return finish(operation, response, null);
    } catch (error) {
      return finish(operation, null, error instanceof Error ? error : new Error(String(error)));
    }
  }

  publish();
  return Object.freeze({
    label: claimApi.label ?? "Configured claim API adapter",
    isMock: claimApi.isMock === true,
    subscribe,
    getSnapshot,
    replaceItem,
    claim,
  });
}
