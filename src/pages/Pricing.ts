// pricing.ts
export type Position = 'GK' | 'DEF' | 'MID' | 'FWD';

export type Player = {
    id: string;
    name: string;
    team: string;
    position: Position;
    price: number;

    pointsTotal: number;
    pointsGw: number;
    prevGwPoints: number;

    goals: number;
    assists: number;
    cleanSheets: number;
    greenCards: number;
    yellowCards: number;
    redCards: number;

    createdAt: number;
    updatedAt: number;


    transfersIn?: number;
    transfersOut?: number;
    prevPerfDelta?: number;
    pointsHistory?: number[];
    matchesPlayed?: number;
};

// core price mechanics
export const priceUnit = 0.1;
export const minPrice = 5.0;
export const maxPrice = 18.0;
export const weeklyMaxChange = 1.4;

// demand
export const riseThreshold = 8;   
export const alphaDemand = 0.6;    

// performance
export const lookbackMatched = 2;
export const kPerf = 0.1;         
export const alphaPerf = 0.7;      

// hybrid weighting
export const wDemand = 0.6;       
export const wPerf = 0.4;        

export function clamp(value: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, value));
}
export function roundToNearest(value: number, unit: number): number {
    return Math.round(value / unit) * unit;
}
export function average(arr: number[]): number {
    if (!arr || arr.length === 0) return 0;
    return arr.reduce((s, v) => s + v, 0) / arr.length;
}

export function defaultPool(): Player[] {
    const TEAMS = ['A','B','C','D','E'];
    return Array.from({ length: 40 }).map((_, i) => ({
        id: 'p' + i,
        name: 'Player ' + (i + 1),
        team: TEAMS[i % 5],
        position: (['GK', 'DEF', 'MID', 'FWD'] as const)[i % 4],
        price: 4 + (i % 6),

        pointsTotal: 0,
        pointsGw: 0,
        prevGwPoints: 0,
        goals: 0,
        assists: 0,
        cleanSheets: 0,
        greenCards: 0,
        yellowCards: 0,
        redCards: 0,

        createdAt: Date.now(),
        updatedAt: Date.now(),

        transfersIn: 0,
        transfersOut: 0,
        prevPerfDelta: 0,
        pointsHistory: [],
        matchesPlayed: 0
    }));
}

export function recordGwResult(player: Player, gwPoints: number): Player {
    const history = player.pointsHistory ?? [];
    const newHistory = [gwPoints, ...history].slice(0, 20);

    const matchesPlayed = (player.matchesPlayed ?? 0) + 1;
    const pointsTotal = (player.pointsTotal ?? 0) + gwPoints;

    return {
        ...player,
        pointsGw: gwPoints,
        prevGwPoints: history[0] ?? player.prevGwPoints ?? 0,
        pointsHistory: newHistory,
        matchesPlayed,
        pointsTotal,
        updatedAt: Date.now()
    };
}

export function updatePlayerPrice(playerIn: Player): Player {
    const player: Player = { ...playerIn };

    player.transfersIn = player.transfersIn ?? 0;
    player.transfersOut = player.transfersOut ?? 0;
    player.prevPerfDelta = player.prevPerfDelta ?? 0;
    player.pointsHistory = player.pointsHistory ?? [];
    player.matchesPlayed = player.matchesPlayed ?? 0;

    // Demand
    const net = (player.transfersIn ?? 0) - (player.transfersOut ?? 0);
    // proportional demand so small net moves still create 0.1 deltas (after rounding)
    let demandDelta = (net / riseThreshold) * priceUnit;
    demandDelta = alphaDemand * demandDelta + (1 - alphaDemand) * (player.prevPerfDelta ?? 0);

    // Performance
    const recentSlice = (player.pointsHistory ?? []).slice(0, lookbackMatched);
    console.log(player.pointsTotal);
    console.log(player.matchesPlayed);
    const recentPPG = recentSlice.length > 0 ? average(recentSlice) : average([player.pointsGw || 0, player.prevGwPoints || 0]);
    const baselinePPG =
        (player.matchesPlayed && player.matchesPlayed > 1) ? (player.pointsTotal ?? 0) / player.matchesPlayed : 5;

    console.log({ recentPPG, baselinePPG });

    const perfDiff = recentPPG - baselinePPG;
    console.log(perfDiff);
    let perfDelta = kPerf * perfDiff;
    perfDelta = alphaPerf * perfDelta + (1 - alphaPerf) * (player.prevPerfDelta ?? 0);
    console.log(perfDelta);

    // Hybrid
    let rawDelta = (player.matchesPlayed && player.matchesPlayed > 1) ? wDemand * demandDelta + wPerf * perfDelta : perfDelta;
    rawDelta = clamp(rawDelta, -weeklyMaxChange, weeklyMaxChange);
    console.log(rawDelta);

    let newPrice = (player.price ?? minPrice) + rawDelta;
    newPrice = roundToNearest(newPrice, priceUnit);
    newPrice = clamp(newPrice, minPrice, maxPrice);
    newPrice = Number(newPrice.toFixed(1));

    const updated: Player = {
        ...player,
        price: newPrice,
        prevPerfDelta: perfDelta,
        transfersIn: 0,
        transfersOut: 0,
        updatedAt: Date.now()
    };

    return updated;
}

export function updateAllPlayers(pool: Player[]): Player[] {
    return pool.map(p => updatePlayerPrice(p));
}
