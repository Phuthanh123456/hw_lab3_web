import { useCallback, useSyncExternalStore } from "react";

/** React adapter for the observable claim store; the store owns optimistic state. */
export function usePubgClaims(claimStore) {
  if (!claimStore || typeof claimStore.subscribe !== "function" || typeof claimStore.getSnapshot !== "function") {
    throw new TypeError("A PubgClaimStore is required.");
  }

  const items = useSyncExternalStore(
    claimStore.subscribe,
    claimStore.getSnapshot,
    claimStore.getSnapshot,
  );
  const claim = useCallback((itemId) => claimStore.claim(itemId), [claimStore]);

  return { items, claim, apiLabel: claimStore.label, isMock: claimStore.isMock };
}
