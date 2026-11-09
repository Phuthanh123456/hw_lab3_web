/** @typedef {"WARMUP" | "AIRDROP_LIVE" | "LOOTED_OUT" | "EXPIRED"} DropPhase */

/** @type {Readonly<Record<DropPhase, DropPhase>>} */
export const DropPhase = Object.freeze({
  WARMUP: "WARMUP",
  AIRDROP_LIVE: "AIRDROP_LIVE",
  LOOTED_OUT: "LOOTED_OUT",
  EXPIRED: "EXPIRED",
});

/**
 * @typedef {Object} PubgCrateDrop
 * @property {string} id
 * @property {string} title
 * @property {number} priceVnd
 * @property {number} remainingStock
 * @property {number} dropEpochMs
 */

/**
 * @typedef {Object} PubgVnSquadStanding
 * @property {string} squadId
 * @property {string} squadName
 * @property {number} wwcdCount
 * @property {number} placementPts
 * @property {number} killPts
 */

const vndFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
});

/** @param {number} priceVnd */
export function formatVnd(priceVnd) {
  if (!Number.isFinite(priceVnd)) {
    throw new TypeError("VND price must be a finite number.");
  }
  return vndFormatter.format(priceVnd);
}

/**
 * Resolve the phase using the countdown and stock contract.
 * EXPIRED is externally supplied because PubgCrateDrop has no expiry timestamp.
 * @param {{ remainingMs: number, remainingStock: number, isExpired?: boolean }} input
 * @returns {DropPhase}
 */
export function resolveDropPhase({ remainingMs, remainingStock, isExpired = false }) {
  if (!Number.isFinite(remainingMs) || remainingMs < 0) {
    throw new RangeError("remainingMs must be a finite, non-negative number.");
  }
  if (!Number.isFinite(remainingStock) || remainingStock < 0) {
    throw new RangeError("remainingStock must be a finite, non-negative number.");
  }
  if (isExpired) return DropPhase.EXPIRED;
  if (remainingMs > 0) return DropPhase.WARMUP;
  if (remainingStock === 0) return DropPhase.LOOTED_OUT;
  return DropPhase.AIRDROP_LIVE;
}
