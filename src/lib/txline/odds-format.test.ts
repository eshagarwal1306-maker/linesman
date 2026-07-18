import { describe, expect, it } from "vitest";
import { decodeOddsMessage, formatDecimalOdds, toDecimalOdds } from "./odds-format";

describe("odds formatting", () => {
  it("converts StablePrice integers to decimal odds", () => {
    expect(toDecimalOdds(2769)).toBeCloseTo(2.769);
    expect(formatDecimalOdds(2.769)).toBe("2.77");
  });

  it("decodes a 1X2 tick into labeled selections", () => {
    const tick = decodeOddsMessage(
      {
        FixtureId: 18257739,
        Ts: 1_784_326_065_619,
        SuperOddsType: "1X2_PARTICIPANT_RESULT",
        MarketPeriod: "half=1",
        PriceNames: ["part1", "draw", "part2"],
        Prices: [3314, 2085, 4576],
        Pct: ["30.175", "47.962", "21.853"],
        InRunning: false,
      },
      { home: "France", away: "England" },
    );
    expect(tick?.marketLabel).toBe("Match result (1X2)");
    expect(tick?.period).toBe("1st half");
    expect(tick?.selections.map((item) => item.label)).toEqual([
      "France",
      "Draw",
      "England",
    ]);
    expect(tick?.selections[0]?.decimalOdds).toBeCloseTo(3.314);
    expect(tick?.selections[0]?.impliedPct).toBeCloseTo(30.175);
  });
});
