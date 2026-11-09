import test from "node:test";
import assert from "node:assert/strict";
import { DropPhase, formatVnd, resolveDropPhase } from "./pubg-contract.mjs";

test("exposes the four specified drop phases", () => {
  assert.deepEqual(Object.values(DropPhase), ["WARMUP", "AIRDROP_LIVE", "LOOTED_OUT", "EXPIRED"]);
});

test("formats finite VND prices with the vi-VN currency formatter", () => {
  assert.equal(formatVnd(5000000), new Intl.NumberFormat("vi-VN", { style: "currency", currency: "VND" }).format(5000000));
  assert.throws(() => formatVnd(Number.NaN), TypeError);
});

test("transitions warmup to live at zero, sold-out to looted-out, and external expiry to expired", () => {
  assert.equal(resolveDropPhase({ remainingMs: 1, remainingStock: 4 }), DropPhase.WARMUP);
  assert.equal(resolveDropPhase({ remainingMs: 0, remainingStock: 4 }), DropPhase.AIRDROP_LIVE);
  assert.equal(resolveDropPhase({ remainingMs: 0, remainingStock: 0 }), DropPhase.LOOTED_OUT);
  assert.equal(resolveDropPhase({ remainingMs: 0, remainingStock: 4, isExpired: true }), DropPhase.EXPIRED);
  assert.throws(() => resolveDropPhase({ remainingMs: -1, remainingStock: 4 }), RangeError);
});
