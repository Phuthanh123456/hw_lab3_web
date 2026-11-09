import test from "node:test";
import assert from "node:assert/strict";
import { createPubgClaimStore, PubgClaimStatus } from "./pubg-claim-store.mjs";
import { createMockPubgClaimApi, MOCK_PUBG_CLAIM_API_LABEL } from "./mock-pubg-claim-api.mjs";

function makeItem(id, remainingStock, itemType = "ticket") {
  return { id, itemType, title: `Demo ${itemType}`, priceVnd: 250000, remainingStock, dropEpochMs: 1234 };
}

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

test("successful claim deducts stock immediately and commits only on a 2xx response", async () => {
  const api = createMockPubgClaimApi({ outcomeFor: () => "success" });
  const store = createPubgClaimStore({ items: [makeItem("vip", 3)], claimApi: api });
  assert.equal(store.isMock, true);
  assert.equal(store.label, MOCK_PUBG_CLAIM_API_LABEL);

  const result = await store.claim("vip");
  assert.equal(result.ok, true);
  assert.equal(store.getSnapshot().vip.remainingStock, 2);
  assert.equal(store.getSnapshot().vip.claimStatus, PubgClaimStatus.CLAIMED);
  assert.equal(store.getSnapshot().vip.claimResult.mock, true);
  assert.match(store.getSnapshot().vip.formattedPrice, /250/);
});

test("HTTP 409 restores the exact pre-request stock and marks Looted Out", async () => {
  const api = createMockPubgClaimApi({ outcomeFor: () => "conflict" });
  const store = createPubgClaimStore({ items: [makeItem("crate", 7, "crate")], claimApi: api });
  const pending = store.claim("crate");
  assert.equal(store.getSnapshot().crate.remainingStock, 6);
  const result = await pending;
  assert.equal(result.status, 409);
  assert.equal(store.getSnapshot().crate.remainingStock, 7);
  assert.equal(store.getSnapshot().crate.claimStatus, PubgClaimStatus.LOOTED_OUT);
  assert.match(store.getSnapshot().crate.claimMessage, /Looted Out/);
});

test("a rejected HTTP-client 409 response also rolls back exact stock", async () => {
  const conflict = Object.assign(new Error("Request failed with status 409"), {
    response: { status: 409, data: { code: "LOOTED_OUT", message: "Server says Looted Out." } },
  });
  const store = createPubgClaimStore({
    items: [makeItem("vip", 6)],
    claimApi: { claim: async () => { throw conflict; } },
  });
  const result = await store.claim("vip");
  assert.equal(result.status, 409);
  assert.equal(result.conflict, true);
  assert.equal(store.getSnapshot().vip.remainingStock, 6);
  assert.equal(store.getSnapshot().vip.claimStatus, PubgClaimStatus.LOOTED_OUT);
  assert.match(store.getSnapshot().vip.claimMessage, /Server says Looted Out/);
});

test("double-click while the same item request is pending sends one request", async () => {
  const response = deferred();
  let requests = 0;
  const api = createMockPubgClaimApi({ outcomeFor: () => { requests += 1; return response.promise; } });
  const store = createPubgClaimStore({ items: [makeItem("vip", 2)], claimApi: api });
  const first = store.claim("vip");
  const second = await store.claim("vip");
  assert.equal(store.getSnapshot().vip.remainingStock, 1);
  assert.equal(store.getSnapshot().vip.isClaiming, true);
  assert.equal(second.ignored, true);
  assert.equal(second.reason, "claim-in-flight");
  assert.equal(requests, 1);
  response.resolve("success");
  assert.equal((await first).ok, true);
  assert.equal(requests, 1);
});

test("network errors roll back stock and expose a retryable error", async () => {
  const api = createMockPubgClaimApi({ outcomeFor: () => "network-error" });
  const store = createPubgClaimStore({ items: [makeItem("crate", 4, "crate")], claimApi: api });
  const result = await store.claim("crate");
  assert.equal(result.ok, false);
  assert.equal(store.getSnapshot().crate.remainingStock, 4);
  assert.equal(store.getSnapshot().crate.claimStatus, PubgClaimStatus.ERROR);
  assert.match(store.getSnapshot().crate.claimMessage, /network error/);
});

test("concurrent claims on different items settle independently without cross-rollback", async () => {
  const ticketResponse = deferred();
  const crateResponse = deferred();
  const api = createMockPubgClaimApi({
    outcomeFor: ({ itemId }) => itemId === "vip" ? ticketResponse.promise : crateResponse.promise,
  });
  const store = createPubgClaimStore({
    items: [makeItem("vip", 5, "ticket"), makeItem("gcoin", 9, "crate")],
    claimApi: api,
  });
  const ticketClaim = store.claim("vip");
  const crateClaim = store.claim("gcoin");
  assert.deepEqual(
    [store.getSnapshot().vip.remainingStock, store.getSnapshot().gcoin.remainingStock],
    [4, 8],
  );

  crateResponse.resolve("conflict");
  await crateClaim;
  assert.deepEqual(
    [store.getSnapshot().vip.remainingStock, store.getSnapshot().gcoin.remainingStock],
    [4, 9],
  );
  ticketResponse.resolve("success");
  await ticketClaim;
  assert.deepEqual(
    [store.getSnapshot().vip.remainingStock, store.getSnapshot().gcoin.remainingStock],
    [4, 9],
  );
  assert.equal(store.getSnapshot().vip.claimStatus, PubgClaimStatus.CLAIMED);
  assert.equal(store.getSnapshot().gcoin.claimStatus, PubgClaimStatus.LOOTED_OUT);
});

test("stale response cannot overwrite a newer inventory snapshot", async () => {
  const response = deferred();
  const api = createMockPubgClaimApi({ outcomeFor: () => response.promise });
  const store = createPubgClaimStore({ items: [makeItem("vip", 5)], claimApi: api });
  const pending = store.claim("vip");
  assert.equal(store.getSnapshot().vip.remainingStock, 4);
  store.replaceItem(makeItem("vip", 11));
  response.resolve("conflict");
  const result = await pending;
  assert.equal(result.reason, "stale-response");
  assert.equal(store.getSnapshot().vip.remainingStock, 11);
  assert.equal(store.getSnapshot().vip.isClaiming, false);
  assert.equal(store.getSnapshot().vip.claimStatus, PubgClaimStatus.IDLE);
});

test("a non-409 HTTP error rolls back without being mislabeled Looted Out", async () => {
  const api = createMockPubgClaimApi({ outcomeFor: () => ({ status: 503, body: { message: "Service unavailable" } }) });
  const store = createPubgClaimStore({ items: [makeItem("vip", 2)], claimApi: api });
  const result = await store.claim("vip");
  assert.equal(result.status, 503);
  assert.equal(store.getSnapshot().vip.remainingStock, 2);
  assert.equal(store.getSnapshot().vip.claimStatus, PubgClaimStatus.ERROR);
  assert.doesNotMatch(store.getSnapshot().vip.claimMessage, /Looted Out/);
});
