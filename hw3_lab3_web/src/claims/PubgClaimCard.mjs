import { createElement } from "react";
import { PubgClaimStatus } from "./pubg-claim-store.mjs";
import { usePubgClaims } from "./usePubgClaims.mjs";

/** Small accessible ticket/crate card; inventory updates arrive from the claim store. */
export function PubgClaimCard({ claimStore, itemId, canClaim = true, claimDisabledReason = "" }) {
  const { items, claim } = usePubgClaims(claimStore);
  const item = items[itemId];
  if (!item) return null;

  const soldOut = item.remainingStock <= 0 || item.claimStatus === PubgClaimStatus.LOOTED_OUT;
  const buttonLabel = item.isClaiming
    ? "Claiming…"
    : item.claimStatus === PubgClaimStatus.CLAIMED
      ? "Claimed"
      : soldOut
        ? "Looted Out"
        : "Claim";
  const statusMessage = item.claimMessage
    || (soldOut ? "Looted Out. No stock is available." : !canClaim ? claimDisabledReason : "");

  return createElement(
    "article",
    { className: "pubg-claim-card", "data-item-id": item.id },
    createElement("h2", null, item.title),
    createElement("p", { className: "pubg-claim-card__price" }, item.formattedPrice),
    createElement("p", { className: "pubg-claim-card__stock" }, `Remaining stock: ${item.remainingStock}`),
    createElement("button", {
      type: "button",
      disabled: !canClaim || item.isClaiming || soldOut || item.claimStatus === PubgClaimStatus.CLAIMED,
      "aria-label": `${buttonLabel} ${item.title}`,
      onClick: () => { void claim(itemId); },
    }, buttonLabel),
    createElement("p", { className: "pubg-claim-card__status", role: "status", "aria-live": "polite" }, statusMessage),
  );
}
