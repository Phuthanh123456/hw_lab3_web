export const SQUAD_SORT_FIELDS = Object.freeze(["wwcdCount", "placementPts", "killPts"]);

/** Filter squad names/IDs without changing the provided array. */
export function filterSquadStandings(standings, query = "") {
  if (!Array.isArray(standings)) throw new TypeError("standings must be an array.");
  const normalized = String(query).trim().toLocaleLowerCase("vi-VN");
  if (!normalized) return [...standings];
  return standings.filter((squad) =>
    `${squad.squadName} ${squad.squadId}`.toLocaleLowerCase("vi-VN").includes(normalized));
}

/** Stable numeric sort; ties retain their original order. */
export function sortSquadStandings(standings, { sortBy = "wwcdCount", direction = "desc" } = {}) {
  if (!Array.isArray(standings)) throw new TypeError("standings must be an array.");
  if (!SQUAD_SORT_FIELDS.includes(sortBy)) throw new RangeError(`Unsupported squad sort field: ${sortBy}.`);
  if (direction !== "asc" && direction !== "desc") throw new RangeError("direction must be asc or desc.");

  const factor = direction === "asc" ? 1 : -1;
  return standings
    .map((squad, originalIndex) => {
      if (!Number.isFinite(squad[sortBy])) {
        throw new TypeError(`${sortBy} must be numeric for squad ${squad.squadId}.`);
      }
      return { squad, originalIndex };
    })
    .sort((a, b) => factor * (a.squad[sortBy] - b.squad[sortBy]) || a.originalIndex - b.originalIndex)
    .map(({ squad }) => squad);
}
