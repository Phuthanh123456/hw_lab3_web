import { createElement, useMemo, useState } from "react";
import { DEMO_KILL_FEED, DEMO_KILL_FEED_LABEL, DEMO_SQUAD_STANDINGS } from "../leaderboard/demo-pubg-data.mjs";
import { filterKillFeed } from "./kill-feed-model.mjs";
import { useVirtualRows } from "./useVirtualRows.mjs";

export function PubgKillFeed({
  events = DEMO_KILL_FEED,
  squads = DEMO_SQUAD_STANDINGS,
  sourceLabel = DEMO_KILL_FEED_LABEL,
  height = "min(320px, 45vh)",
  rowHeight = 64,
  overscan = 4,
}) {
  const [squadId, setSquadId] = useState("all");
  const [query, setQuery] = useState("");
  const filteredEvents = useMemo(() => filterKillFeed(events, { squadId, query }), [events, squadId, query]);
  const { scrollRef, range } = useVirtualRows({
    itemCount: filteredEvents.length,
    rowHeight,
    overscan,
    initialViewportHeight: typeof height === "number" ? height : 320,
  });
  const h = createElement;
  const visibleEvents = filteredEvents.slice(range.startIndex, range.endIndex);

  return h("section", { className: "pubg-kill-feed", "aria-labelledby": "pubg-kill-feed-title" },
    h("h2", { id: "pubg-kill-feed-title" }, "Kill feed"),
    h("p", { className: "pubg-data-source" }, sourceLabel),
    h("div", { className: "pubg-kill-feed__controls" },
      h("label", null, "Filter by squad",
        h("select", { value: squadId, onChange: (event) => setSquadId(event.currentTarget.value) },
          h("option", { value: "all" }, "All squads"),
          ...squads.map((squad) => h("option", { key: squad.squadId, value: squad.squadId }, squad.squadName))),
      ),
      h("label", null, "Search kill feed",
        h("input", {
          type: "search",
          value: query,
          onChange: (event) => setQuery(event.currentTarget.value),
          placeholder: "Player, squad, or weapon",
        })),
    ),
    filteredEvents.length === 0
      ? h("p", { role: "status" }, "No kill-feed events match this filter.")
      : h("div", {
        ref: scrollRef,
        className: "pubg-kill-feed__scroll-region",
        role: "region",
        tabIndex: 0,
        "aria-label": `Kill-feed events, ${filteredEvents.length} matching rows`,
        style: { height: typeof height === "number" ? `${height}px` : height, overflowY: "auto" },
      }, h("ul", {
        role: "list",
        "aria-label": "Kill-feed events",
        style: { position: "relative", height: range.totalHeight, margin: 0, padding: 0, listStyle: "none" },
      }, ...visibleEvents.map((event, localIndex) => {
        if (typeof event.eventId !== "string" || event.eventId.length === 0) {
          throw new TypeError("Each virtualized kill-feed event needs a stable eventId.");
        }
        const absoluteIndex = range.startIndex + localIndex;
        return h("li", {
          key: event.eventId,
          role: "listitem",
          "aria-posinset": absoluteIndex + 1,
          "aria-setsize": filteredEvents.length,
          "data-event-id": event.eventId,
          style: {
            position: "absolute",
            insetInline: 0,
            top: absoluteIndex * rowHeight,
            height: rowHeight,
            overflow: "hidden",
          },
        }, `${event.killerName} (${event.killerSquadName}) eliminated ${event.victimName} (${event.victimSquadName}) with ${event.weapon}`);
      }))),
  );
}
