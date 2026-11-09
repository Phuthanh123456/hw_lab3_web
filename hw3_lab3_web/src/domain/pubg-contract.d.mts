export type DropPhase = "WARMUP" | "AIRDROP_LIVE" | "LOOTED_OUT" | "EXPIRED";

export declare const DropPhase: Readonly<{
  WARMUP: "WARMUP";
  AIRDROP_LIVE: "AIRDROP_LIVE";
  LOOTED_OUT: "LOOTED_OUT";
  EXPIRED: "EXPIRED";
}>;

export interface PubgCrateDrop {
  id: string;
  title: string;
  priceVnd: number;
  remainingStock: number;
  dropEpochMs: number;
}

export interface PubgVnSquadStanding {
  squadId: string;
  squadName: string;
  wwcdCount: number;
  placementPts: number;
  killPts: number;
}

export declare function formatVnd(priceVnd: number): string;
export declare function resolveDropPhase(input: {
  remainingMs: number;
  remainingStock: number;
  isExpired?: boolean;
}): DropPhase;
