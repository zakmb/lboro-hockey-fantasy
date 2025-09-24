

//TODO: change these to match directory

import { describe, it, expect } from "vitest";
// @ts-ignore
import  { updatePlayerPrice } from "../pages/Pricing";
// @ts-ignore
import { Player } from "./test/types";

function makePlayer(overrides: Partial<Player> = {}): Player {
    return {
        id: "p1",
        name: "Player 1",
        team: "Lboro A",
        position: "FWD",
        price: 6,
        pointsTotal: 30,
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
        // new fields
        transfersIn: 0,
        transfersOut: 0,
        minutesPlayed: 0,
        gamesPlayed: 0,
        ...overrides,
    };
}

describe("updatePlayerPrice", () => {
    it("should increase price when demand is high", () => {
        const player = makePlayer({ transfersIn: 200, transfersOut: 10 });
        const updated = updatePlayerPrice(player, 100);
        expect(updated.price).toBeGreaterThan(player.price);
    });

    it("should decrease price when demand is low", () => {
        const player = makePlayer({ transfersIn: 5, transfersOut: 200 });
        const updated = updatePlayerPrice(player, 100);
        expect(updated.price).toBeLessThan(player.price);
    });

    it("should increase price when recent performance is strong", () => {
        const player = makePlayer({
            pointsGw: 12,
            prevGwPoints: 2,
            gamesPlayed: 5,
            pointsTotal: 20,
        });
        const updated = updatePlayerPrice(player, 100);
        expect(updated.price).toBeGreaterThan(player.price);
    });

    it("should decrease price when recent performance is weak", () => {
        const player = makePlayer({
            pointsGw: 0,
            prevGwPoints: 0,
            gamesPlayed: 10,
            pointsTotal: 80, // good baseline
        });
        const updated = updatePlayerPrice(player, 100);
        expect(updated.price).toBeLessThan(player.price);
    });

    it("should cap price change to max step", () => {
        const player = makePlayer({
            transfersIn: 10000,
            transfersOut: 0,
            pointsGw: 50,
            prevGwPoints: 40,
            gamesPlayed: 1,
            pointsTotal: 50,
        });
        const updated = updatePlayerPrice(player, 100);
        expect(updated.price - player.price).toBeLessThanOrEqual(0.3);
    });

    it("should not drop below minimum price (e.g. 4.0)", () => {
        const player = makePlayer({ price: 4.1, transfersIn: 0, transfersOut: 500 });
        const updated = updatePlayerPrice(player, 100);
        expect(updated.price).toBeGreaterThanOrEqual(4.0);
    });
});
