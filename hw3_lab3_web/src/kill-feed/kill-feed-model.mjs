/** Filter synthetic or API-provided kill events by team and text. */
export function filterKillFeed(events, { squadId = "all", query = "" } = {}) {
  if (!Array.isArray(events)) throw new TypeError("events must be an array.");
  const normalized = String(query).trim().toLocaleLowerCase("vi-VN");
  return events.filter((event) => {
    const matchesSquad = squadId === "all"
      || event.killerSquadId === squadId
      || event.victimSquadId === squadId;
    if (!matchesSquad) return false;
    if (!normalized) return true;
    return [event.killerName, event.killerSquadName, event.victimName, event.victimSquadName, event.weapon]
      .some((field) => String(field ?? "").toLocaleLowerCase("vi-VN").includes(normalized));
  });
}

/**
 * Calculate a fixed-row virtual window with overscan and scroll clamping.
 * endIndex is exclusive. Clamping is important when filtering reduces the list
 * while the scroll container is near its former bottom.
 */
export function calculateVirtualRange({
  itemCount,
  scrollTop,
  viewportHeight,
  rowHeight,
  overscan = 4,
}) {
  if (!Number.isInteger(itemCount) || itemCount < 0) throw new RangeError("itemCount must be a non-negative integer.");
  if (!Number.isFinite(scrollTop) || !Number.isFinite(viewportHeight) || viewportHeight < 0) {
    throw new RangeError("scrollTop and non-negative viewportHeight must be finite.");
  }
  if (!Number.isFinite(rowHeight) || rowHeight <= 0) throw new RangeError("rowHeight must be positive.");
  if (!Number.isInteger(overscan) || overscan < 0) throw new RangeError("overscan must be a non-negative integer.");

  const totalHeight = itemCount * rowHeight;
  const maxScrollTop = Math.max(0, totalHeight - viewportHeight);
  const effectiveScrollTop = Math.min(Math.max(0, scrollTop), maxScrollTop);
  const startIndex = Math.max(0, Math.floor(effectiveScrollTop / rowHeight) - overscan);
  const endIndex = Math.min(itemCount, Math.ceil((effectiveScrollTop + viewportHeight) / rowHeight) + overscan);

  return Object.freeze({
    startIndex,
    endIndex,
    offsetTop: startIndex * rowHeight,
    totalHeight,
    bottomHeight: Math.max(0, totalHeight - endIndex * rowHeight),
    effectiveScrollTop,
    renderedCount: endIndex - startIndex,
  });
}
