import { describe, expect, it } from "vitest";
import { fixturesFrom, isHistoricalReplayEligible } from "./fixtures";

describe("fixturesFrom", () => {
  it("maps TxLINE Participant fields into labels", () => {
    const fixtures = fixturesFrom([
      {
        FixtureId: 18143850,
        Participant1: "Vietnam",
        Participant2: "Myanmar",
        Competition: "Friendlies",
        StartTime: 1_784_376_000_000,
        GameState: 1,
      },
    ]);
    expect(fixtures).toEqual([
      expect.objectContaining({
        id: 18143850,
        label: "Vietnam vs Myanmar · Friendlies",
        competition: "Friendlies",
      }),
    ]);
  });
});

describe("isHistoricalReplayEligible", () => {
  it("accepts starts between two weeks and six hours ago", () => {
    const now = Date.UTC(2026, 6, 17, 22, 0, 0);
    expect(isHistoricalReplayEligible(now - 7 * 24 * 60 * 60 * 1_000, now)).toBe(
      true,
    );
    expect(isHistoricalReplayEligible(now - 60 * 60 * 1_000, now)).toBe(false);
  });
});
