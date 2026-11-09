import test from "node:test";
import assert from "node:assert/strict";
import { filterSquadStandings, sortSquadStandings } from "./squad-standings.mjs";
import { DEMO_SQUAD_STANDINGS, DEMO_STANDINGS_LABEL } from "./demo-pubg-data.mjs";

test("demo standings contain the four specified squads and are labeled non-official", () => {
  assert.deepEqual(DEMO_SQUAD_STANDINGS.map(({ squadName }) => squadName), [
    "The Expendables", "Cerberus Esports", "Roy Esports", "AGG",
  ]);
  assert.match(DEMO_STANDINGS_LABEL, /DEMO/);
  assert.match(DEMO_STANDINGS_LABEL, /not official/);
});

test("filters by squad name or stable squad ID and returns an empty result when unmatched", () => {
  assert.deepEqual(filterSquadStandings(DEMO_SQUAD_STANDINGS, "cerberus").map((row) => row.squadId), ["cerberus-esports"]);
  assert.deepEqual(filterSquadStandings(DEMO_SQUAD_STANDINGS, "agg").map((row) => row.squadId), ["agg"]);
  assert.deepEqual(filterSquadStandings(DEMO_SQUAD_STANDINGS, "no such squad"), []);
});

test("sorts numeric scores correctly for every supported metric without mutating input", () => {
  const rows = [
    { squadId: "two", squadName: "Two", wwcdCount: 2, placementPts: 4, killPts: 2 },
    { squadId: "ten", squadName: "Ten", wwcdCount: 10, placementPts: 2, killPts: 10 },
    { squadId: "one", squadName: "One", wwcdCount: 1, placementPts: 10, killPts: 1 },
  ];
  const originalOrder = rows.map((row) => row.squadId);
  assert.deepEqual(sortSquadStandings(rows, { sortBy: "wwcdCount" }).map((row) => row.squadId), ["ten", "two", "one"]);
  assert.deepEqual(sortSquadStandings(rows, { sortBy: "placementPts" }).map((row) => row.squadId), ["one", "two", "ten"]);
  assert.deepEqual(sortSquadStandings(rows, { sortBy: "killPts", direction: "asc" }).map((row) => row.squadId), ["one", "two", "ten"]);
  assert.deepEqual(rows.map((row) => row.squadId), originalOrder);
});

test("stable ties preserve source order and empty inputs remain empty", () => {
  const rows = [
    { squadId: "first", squadName: "First", wwcdCount: 4, placementPts: 10, killPts: 3 },
    { squadId: "second", squadName: "Second", wwcdCount: 4, placementPts: 10, killPts: 3 },
    { squadId: "third", squadName: "Third", wwcdCount: 4, placementPts: 10, killPts: 3 },
  ];
  assert.deepEqual(sortSquadStandings(rows, { sortBy: "wwcdCount" }).map((row) => row.squadId), ["first", "second", "third"]);
  assert.deepEqual(filterSquadStandings([], ""), []);
  assert.deepEqual(sortSquadStandings([], { sortBy: "killPts" }), []);
});
