import { useEffect, useState } from "react";
import { calculateRemainingMs, createPubgAirdropClock } from "./pubg-airdrop-clock.mjs";

/**
 * React 19 countdown hook. serverOffsetMs defaults to zero until a real server
 * clock endpoint supplies an offset. The returned value is always clamped at 0.
 * @param {number} targetEpochMs
 * @param {number} [serverOffsetMs=0]
 */
export function usePubgAirdropTimer(targetEpochMs, serverOffsetMs = 0) {
  const [remainingMs, setRemainingMs] = useState(() =>
    calculateRemainingMs(targetEpochMs, serverOffsetMs),
  );

  useEffect(() => {
    const clock = createPubgAirdropClock({ targetEpochMs, serverOffsetMs });
    return clock.start(setRemainingMs);
  }, [targetEpochMs, serverOffsetMs]);

  return { remainingMs, isLive: remainingMs === 0 };
}
