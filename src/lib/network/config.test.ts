import { describe, expect, it } from "vitest";
import { getNetworkConfig } from "./config";

describe("getNetworkConfig", () => {
  it("returns a complete devnet tuple", () => {
    expect(getNetworkConfig("devnet")).toMatchObject({
      network: "devnet",
      apiOrigin: "https://txline-dev.txodds.com",
      programId: "6pW64gN1s2uqjHkn1unFeEjAwJkPGHoppGvS715wyP2J",
      txlMint: "4Zao8ocPhmMgq7PdsYWyxvqySMGx7xb9cMftPMkEokRG",
      serviceLevels: [1],
    });
  });

  it("keeps mainnet values together", () => {
    const config = getNetworkConfig("mainnet");
    expect(config.apiOrigin).toBe("https://txline.txodds.com");
    expect(config.serviceLevels).toEqual([1, 12]);
  });
});
