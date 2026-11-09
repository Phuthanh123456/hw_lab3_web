import React, { useRef, useState } from "react";
import { PubgClaimCard } from "./claims/PubgClaimCard.mjs";
import { createPubgClaimStore } from "./claims/pubg-claim-store.mjs";
import { createMockPubgClaimApi, MOCK_PUBG_CLAIM_API_LABEL } from "./claims/mock-pubg-claim-api.mjs";
import { usePubgClaims } from "./claims/usePubgClaims.mjs";
import { resolveDropPhase } from "./domain/pubg-contract.mjs";
import { usePubgAirdropTimer } from "./hooks/usePubgAirdropTimer.mjs";
import { PubgLeaderboard } from "./leaderboard/PubgLeaderboard.mjs";
import { DEMO_STANDINGS_LABEL } from "./leaderboard/demo-pubg-data.mjs";
import { PubgKillFeed } from "./kill-feed/PubgKillFeed.mjs";
import { DEMO_KILL_FEED_LABEL } from "./leaderboard/demo-pubg-data.mjs";

const DEMO_CLAIM_ITEMS = Object.freeze([
  Object.freeze({
    id: "demo-pvs-vip-ticket",
    itemType: "ticket",
    title: "PVS Grand Finals VIP Ticket",
    priceVnd: 750000,
    remainingStock: 18,
    dropEpochMs: 0,
  }),
  Object.freeze({
    id: "demo-gcoin-crate",
    itemType: "crate",
    title: "G-Coin Contraband Crate",
    priceVnd: 120000,
    remainingStock: 32,
    dropEpochMs: 0,
  }),
]);

const MOCK_SCENARIOS = Object.freeze([
  Object.freeze({ value: "success", label: "Simulate success (HTTP 201)" }),
  Object.freeze({ value: "conflict", label: "Simulate Looted Out (HTTP 409)" }),
  Object.freeze({ value: "network-error", label: "Simulate network error" }),
  Object.freeze({ value: "server-error", label: "Simulate server error (HTTP 503)" }),
]);

function createDemoClaimStore(scenarioRef) {
  const claimApi = createMockPubgClaimApi({
    outcomeFor: ({ itemId, requestId }) => {
      const selectedScenario = scenarioRef.current;
      if (!selectedScenario) throw new Error("Select an explicit mock API outcome before claiming.");
      return selectedScenario;
    },
  });
  return createPubgClaimStore({ items: DEMO_CLAIM_ITEMS, claimApi });
}

function formatCountdown(remainingMs) {
  const totalSeconds = Math.ceil(remainingMs / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return [hours, minutes, seconds].map((part) => String(part).padStart(2, "0")).join(":");
}

function AirdropCountdown({ targetEpochMs, serverOffsetMs, remainingStock }) {
  const { remainingMs, isLive } = usePubgAirdropTimer(targetEpochMs, serverOffsetMs);
  const phase = resolveDropPhase({ remainingMs, remainingStock });
  const phaseLabel = {
    WARMUP: "WARMUP",
    AIRDROP_LIVE: "AIRDROP LIVE · DEMO",
    LOOTED_OUT: "LOOTED OUT",
    EXPIRED: "EXPIRED",
  }[phase];

  return (
    <section className="panel airdrop-panel" aria-labelledby="airdrop-title">
      <div className="section-kicker">01 / AIRDROP WINDOW</div>
      <div className="airdrop-panel__heading">
        <div>
          <h2 id="airdrop-title">PVS Finals Airdrop</h2>
          <p className={`phase-badge phase-badge--${phase.toLowerCase().replaceAll("_", "-")}`}>
            <span aria-hidden="true" />{phaseLabel}
          </p>
        </div>
        <div className="countdown" role="timer" aria-label={`${phaseLabel}; ${formatCountdown(remainingMs)} remaining`}>
          <span className="countdown__caption">{isLive ? "DROP WINDOW OPEN" : "DROP OPENS IN"}</span>
          <strong>{formatCountdown(remainingMs)}</strong>
        </div>
      </div>
      <p className="data-note">Demo event clock · local time · server offset: {serverOffsetMs} ms · no event server connected.</p>
    </section>
  );
}

export default function App() {
  const scenarioRef = useRef("");
  const [scenario, setScenario] = useState("");
  const [claimStore] = useState(() => createDemoClaimStore(scenarioRef));
  const { items } = usePubgClaims(claimStore);
  const [targetEpochMs] = useState(() => Date.now() + 15 * 60 * 1000);
  const totalStock = Object.values(items).reduce((total, item) => total + item.remainingStock, 0);
  const serverOffsetMs = 0;

  function handleScenarioChange(event) {
    scenarioRef.current = event.currentTarget.value;
    setScenario(event.currentTarget.value);
  }

  return (
    <main className="arena-shell">
      <header className="arena-header">
        <div className="brand-row">
          <div className="brand-mark" aria-hidden="true">PVS</div>
          <div>
            <p className="eyebrow">KRAFTON × PUBG VIETNAM SERIES</p>
            <h1>Championship <span>&amp; Airdrop Arena</span></h1>
          </div>
        </div>
        <p className="arena-intro">Tickets, G-Coin drops, squad standings, and match feed in one arena.</p>
        <p className="demo-banner" role="note"><strong>DEMO EXPERIENCE</strong> — inventory, standings, match feed, and claim outcomes are simulated. No live PUBG data or backend is connected.</p>
      </header>

      <div className="arena-top-grid">
        <AirdropCountdown
          targetEpochMs={targetEpochMs}
          serverOffsetMs={serverOffsetMs}
          remainingStock={totalStock}
        />
        <section className="panel claim-panel" aria-labelledby="claim-title">
          <div className="section-kicker">02 / TICKETS &amp; CRATES</div>
          <div className="panel-heading">
            <div>
              <h2 id="claim-title">Claim arena items</h2>
              <p>Choose a response scenario to exercise the optimistic claim flow.</p>
            </div>
          </div>
          <label className="mock-scenario-label" htmlFor="mock-outcome">Mock API outcome</label>
          <select id="mock-outcome" className="mock-scenario" value={scenario} onChange={handleScenarioChange}>
            <option value="">Select a simulated response…</option>
            {MOCK_SCENARIOS.map((choice) => <option key={choice.value} value={choice.value}>{choice.label}</option>)}
          </select>
          <p className="data-note">{MOCK_PUBG_CLAIM_API_LABEL}. Outcomes are explicit test scenarios, not server responses.</p>
          <div className="claim-cards">
            {Object.values(items).map((item) => (
              <PubgClaimCard
                key={item.id}
                claimStore={claimStore}
                itemId={item.id}
                canClaim={Boolean(scenario)}
                claimDisabledReason="Choose a mock response above before claiming."
              />
            ))}
          </div>
        </section>
      </div>

      <div className="arena-bottom-grid">
        <section className="panel" aria-labelledby="leaderboard-section-title">
          <div className="section-kicker">03 / COMPETITIVE STANDINGS</div>
          <div className="panel-heading">
            <div>
              <h2 id="leaderboard-section-title">PUBG Vietnam leaderboard</h2>
              <p>Explore WWCD, placement, and kill point rankings.</p>
            </div>
            <span className="source-pill">DEMO DATA</span>
          </div>
          <PubgLeaderboard sourceLabel={DEMO_STANDINGS_LABEL} />
        </section>

        <section className="panel" aria-labelledby="feed-section-title">
          <div className="section-kicker">04 / MATCH EVENTS</div>
          <div className="panel-heading">
            <div>
              <h2 id="feed-section-title">Squad kill feed</h2>
              <p>Filter match events and scroll the virtualized feed.</p>
            </div>
            <span className="source-pill">DEMO DATA</span>
          </div>
          <PubgKillFeed sourceLabel={DEMO_KILL_FEED_LABEL} />
        </section>
      </div>

      <footer className="arena-footer">
        <span>Prototype arena · demo inventory is not purchasable.</span>
        <span>Source labels distinguish simulation from live service data.</span>
      </footer>
    </main>
  );
}
