import { createElement, useMemo, useState } from "react";
import { DEMO_SQUAD_STANDINGS, DEMO_STANDINGS_LABEL } from "./demo-pubg-data.mjs";
import { filterSquadStandings, SQUAD_SORT_FIELDS, sortSquadStandings } from "./squad-standings.mjs";

const FIELD_LABELS = Object.freeze({
  wwcdCount: "WWCD",
  placementPts: "Placement points",
  killPts: "Kill points",
});

export function PubgLeaderboard({
  standings = DEMO_SQUAD_STANDINGS,
  sourceLabel = DEMO_STANDINGS_LABEL,
}) {
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState("wwcdCount");
  const [direction, setDirection] = useState("desc");
  const rows = useMemo(() => sortSquadStandings(
    filterSquadStandings(standings, query),
    { sortBy, direction },
  ), [standings, query, sortBy, direction]);
  const h = createElement;

  return h("section", { className: "pubg-leaderboard", "aria-labelledby": "pubg-leaderboard-title" },
    h("h2", { id: "pubg-leaderboard-title" }, "PUBG Vietnam leaderboard"),
    h("p", { className: "pubg-data-source" }, sourceLabel),
    h("div", { className: "pubg-leaderboard__controls" },
      h("label", null, "Filter squads",
        h("input", {
          type: "search",
          value: query,
          onChange: (event) => setQuery(event.currentTarget.value),
          placeholder: "Search squad name",
        })),
      h("label", null, "Sort by",
        h("select", { value: sortBy, onChange: (event) => setSortBy(event.currentTarget.value) },
          ...SQUAD_SORT_FIELDS.map((field) => h("option", { key: field, value: field }, FIELD_LABELS[field])))),
      h("button", {
        type: "button",
        "aria-label": `Sort ${direction === "desc" ? "ascending" : "descending"}`,
        onClick: () => setDirection((value) => value === "desc" ? "asc" : "desc"),
      }, direction === "desc" ? "Highest first" : "Lowest first"),
    ),
    rows.length === 0
      ? h("p", { role: "status" }, "No squads match this filter.")
      : h("table", null,
        h("caption", null, "PUBG Vietnam squad standings"),
        h("thead", null, h("tr", null,
          h("th", { scope: "col" }, "Squad"),
          ...SQUAD_SORT_FIELDS.map((field) => h("th", {
            key: field,
            scope: "col",
            "aria-sort": sortBy === field ? (direction === "asc" ? "ascending" : "descending") : "none",
          }, FIELD_LABELS[field])))),
        h("tbody", null, ...rows.map((squad) => h("tr", { key: squad.squadId },
          h("th", { scope: "row" }, squad.squadName),
          h("td", null, squad.wwcdCount),
          h("td", null, squad.placementPts),
          h("td", null, squad.killPts),
        )))),
  );
}
