export const MOCK_PUBG_CLAIM_API_LABEL = "DEMO MOCK API — no backend connection";

/**
 * Explicit scenario-driven adapter for local claim tests/demos. It has no
 * default success path: callers must provide the outcome for each request.
 * @param {{ outcomeFor: (request: Readonly<object>) => ("success" | "conflict" | "network-error" | { status: number, body?: unknown } | Promise<unknown>) }} options
 */
export function createMockPubgClaimApi({ outcomeFor } = {}) {
  if (typeof outcomeFor !== "function") {
    throw new TypeError("Mock claim API requires an explicit outcomeFor callback.");
  }

  return Object.freeze({
    label: MOCK_PUBG_CLAIM_API_LABEL,
    isMock: true,
    async claim(request) {
      const outcome = await outcomeFor(Object.freeze({ ...request }));
      if (outcome === "network-error") throw new TypeError("Simulated network failure from mock adapter.");
      if (outcome === "success") {
        return {
          status: 201,
          body: {
            mock: true,
            requestId: request.requestId,
            itemId: request.itemId,
            claimId: `demo-claim-${request.requestId}`,
            message: "Mock claim accepted.",
          },
        };
      }
      if (outcome === "conflict") {
        return { status: 409, body: { mock: true, code: "LOOTED_OUT", message: "Mock conflict: Looted Out." } };
      }
      if (outcome && Number.isInteger(outcome.status)) return outcome;
      throw new TypeError("Mock outcome must explicitly select success, conflict, network-error, or an HTTP response.");
    },
  });
}
