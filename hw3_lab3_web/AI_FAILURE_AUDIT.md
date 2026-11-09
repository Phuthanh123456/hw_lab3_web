# AI Failure Audit — HW3

This audit records defects actually found in HW3 code or generated project patches during implementation/review. It does not treat missing backend data, unrun tools, or hypothetical risks as defects. Two entries are implementation defects; one is a documentation-patch defect.

## 1. Rejected HTTP 409 was not recognized as Looted Out

- **Location:** Initial implementation of `src/claims/pubg-claim-store.mjs`, `finish()` response classification. The earlier branch read only `response.status` and required `!error` before classifying a 409.
- **Evidence / scenario:** During code review, an Axios-style client response was considered: the claim Promise rejects with `error.response.status === 409` and `error.response.data`, rather than resolving a response object. The earlier branch would see no `response.status`, mark the outcome as a generic error, and fail to expose `LOOTED_OUT`. The regression case is now in `src/claims/pubg-claim-store.test.mjs:43-57` as “a rejected HTTP-client 409 response also rolls back exact stock.” No pre-fix failing test output was retained; this was found by inspection and then covered by the new regression test.
- **Impact:** The item stock could roll back, but the UI would report a generic failure instead of the server's sold-out conflict state.
- **Fix:** Extract status/body from either a resolved response or `error.status` / `error.response.status` and its body. Classify 409 independently of whether the client resolved or rejected.
- **Result after fix:** The regression test passes; it verifies status 409, conflict state, exact stock restoration, Looted Out status, and server message.

## 2. The first rejected-409 fix dropped the server's conflict detail

- **Location:** Follow-up patch to `src/claims/pubg-claim-store.mjs`, conflict message construction in `finish()`.
- **Evidence / reproduction:** After adding rejected-response support, `src/claims/pubg-claim-store.test.mjs` was run with an error containing `response.data.message = "Server says Looted Out."`. The test failed: expected `/Server says Looted Out/`, received `Looted Out (HTTP 409). Inventory restored to 6.` The assertions before the message assertion confirmed status and stock rollback; the missing server detail was the defect.
- **Impact:** Users received a generic sold-out notice with no explanation returned by the server.
- **Fix:** Include `responseBody.message` (or the error message) in the conflict status text while retaining the exact pre-request stock value.
- **Result after fix:** The same rejected-409 test passes and checks that the server detail is visible.

## 3. A generated WBS patch contained a non-Vietnamese character

- **Location:** `TASK_DECOMPOSITION.md`, T03 acceptance criterion.
- **Evidence / reproduction:** File inspection showed the phrase `môց nhầm`, where the character in `ց` was not Vietnamese `g`. This was a generated documentation-patch typo found during review, not an application behavior failure.
- **Impact:** The acceptance criterion was malformed and harder to read.
- **Fix:** Replaced it with `không bị nhầm`.
- **Result after fix:** The current T03 text reads naturally as “được đánh dấu mock và không bị nhầm là dữ liệu PUBG Vietnam Championship chính thức.”

These three entries are the only defects counted here. No additional defects or test failures are inferred from them.
