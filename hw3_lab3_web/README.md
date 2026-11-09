# Homework 3: PUBG Vietnam Championship & Airdrop Arena

React 19 demo arena combining an epoch-based airdrop countdown, ticket/crate claim flows, squad standings, and a virtualized kill feed.

All inventory, claim outcomes, standings, and match events are demo data. No live PUBG feed, event clock, or claim backend is connected.

## Run locally

```sh
npm install
npm run dev
```

## Verify and build

```sh
npm test
npm run build
```

Choose a mock claim response in the UI to exercise success, HTTP 409, network error, or HTTP 503 handling.
