/** Illustrative scores only; these are not official PUBG Vietnam results. */
export const DEMO_STANDINGS_LABEL = "DEMO STANDINGS — illustrative scores, not official results";

export const DEMO_SQUAD_STANDINGS = Object.freeze([
  Object.freeze({ squadId: "the-expendables", squadName: "The Expendables", wwcdCount: 2, placementPts: 86, killPts: 54 }),
  Object.freeze({ squadId: "cerberus-esports", squadName: "Cerberus Esports", wwcdCount: 3, placementPts: 72, killPts: 61 }),
  Object.freeze({ squadId: "roy-esports", squadName: "Roy Esports", wwcdCount: 1, placementPts: 91, killPts: 48 }),
  Object.freeze({ squadId: "agg", squadName: "AGG", wwcdCount: 2, placementPts: 78, killPts: 63 }),
]);

const DEMO_SQUADS = Object.freeze([
  Object.freeze({ squadId: "the-expendables", squadName: "The Expendables" }),
  Object.freeze({ squadId: "cerberus-esports", squadName: "Cerberus Esports" }),
  Object.freeze({ squadId: "roy-esports", squadName: "Roy Esports" }),
  Object.freeze({ squadId: "agg", squadName: "AGG" }),
]);

const DEMO_WEAPONS = Object.freeze(["Beryl M762", "M416", "AWM", "SCAR-L", "UMP45"]);

/** Deterministic synthetic feed long enough to exercise scrolling/virtualization. */
export const DEMO_KILL_FEED_LABEL = "DEMO MATCH FEED — generated sample, not live match data";
export const DEMO_KILL_FEED = Object.freeze(Array.from({ length: 160 }, (_, index) => {
  const killerSquad = DEMO_SQUADS[index % DEMO_SQUADS.length];
  const victimSquad = DEMO_SQUADS[(index + 1 + Math.floor(index / DEMO_SQUADS.length)) % DEMO_SQUADS.length];
  return Object.freeze({
    eventId: `demo-kill-${String(index + 1).padStart(3, "0")}`,
    sequence: index + 1,
    killerName: `Demo Player ${String((index * 7) % 64 + 1).padStart(2, "0")}`,
    killerSquadId: killerSquad.squadId,
    killerSquadName: killerSquad.squadName,
    victimName: `Demo Player ${String((index * 11 + 19) % 64 + 1).padStart(2, "0")}`,
    victimSquadId: victimSquad.squadId,
    victimSquadName: victimSquad.squadName,
    weapon: DEMO_WEAPONS[index % DEMO_WEAPONS.length],
  });
}));
