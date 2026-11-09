import test from "node:test";
import assert from "node:assert/strict";
import { filterKillFeed, calculateVirtualRange } from "./kill-feed-model.mjs";
import { DEMO_KILL_FEED, DEMO_KILL_FEED_LABEL } from "../leaderboard/demo-pubg-data.mjs";

test("generates a clearly labeled synthetic feed with stable event IDs", () => {
  assert.equal(DEMO_KILL_FEED.length, 160);
  assert.equal(new Set(DEMO_KILL_FEED.map((event) => event.eventId)).size, 160);
  assert.match(DEMO_KILL_FEED_LABEL, /DEMO/);
  assert.match(DEMO_KILL_FEED_LABEL, /not live/);
});

test("kill-feed filters by either participant squad, text, and empty results", () => {
  const squadId = DEMO_KILL_FEED[0].killerSquadId;
  const bySquad = filterKillFeed(DEMO_KILL_FEED, { squadId });
  assert.ok(bySquad.length > 0);
  assert.ok(bySquad.every((event) => event.killerSquadId === squadId || event.victimSquadId === squadId));
  assert.deepEqual(filterKillFeed(DEMO_KILL_FEED, { query: "unmatched event text" }), []);
  assert.deepEqual(filterKillFeed([], { squadId: "all" }), []);
});

test("virtual window renders visible rows plus overscan and advances on scroll", () => {
  const top = calculateVirtualRange({ itemCount: 160, scrollTop: 0, viewportHeight: 320, rowHeight: 64, overscan: 3 });
  assert.deepEqual([top.startIndex, top.endIndex, top.renderedCount], [0, 8, 8]);
  const scrolled = calculateVirtualRange({ itemCount: 160, scrollTop: 640, viewportHeight: 320, rowHeight: 64, overscan: 3 });
  assert.deepEqual([scrolled.startIndex, scrolled.endIndex], [7, 18]);
  assert.equal(scrolled.offsetTop, 448);
  assert.ok(scrolled.renderedCount < 160);
});

test("range recalculates after viewport resize and clamps when filtering shortens the list", () => {
  const originalViewport = calculateVirtualRange({ itemCount: 160, scrollTop: 1000, viewportHeight: 320, rowHeight: 64, overscan: 2 });
  const tallerViewport = calculateVirtualRange({ itemCount: 160, scrollTop: 1000, viewportHeight: 640, rowHeight: 64, overscan: 2 });
  assert.notEqual(originalViewport.endIndex, tallerViewport.endIndex);

  const shortened = calculateVirtualRange({ itemCount: 5, scrollTop: 9000, viewportHeight: 320, rowHeight: 64, overscan: 2 });
  assert.equal(shortened.effectiveScrollTop, 0);
  assert.deepEqual([shortened.startIndex, shortened.endIndex], [0, 5]);
  assert.equal(shortened.bottomHeight, 0);
});
