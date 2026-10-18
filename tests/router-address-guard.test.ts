import { describe, it, expect } from "vitest";
import { isConfiguredAddress, PLACEHOLDER_ADDRESS } from "@/config/network";

describe("Router Address Validation Guard (isConfiguredAddress)", () => {
  it("returns false for undefined, null, empty string, and incomplete 0x prefix", () => {
    expect(isConfiguredAddress(undefined)).toBe(false);
    expect(isConfiguredAddress(null)).toBe(false);
    expect(isConfiguredAddress("")).toBe(false);
    expect(isConfiguredAddress("0x")).toBe(false);
  });

  it("returns false for malformed addresses or invalid characters", () => {
    expect(isConfiguredAddress("not-an-address")).toBe(false);
    expect(isConfiguredAddress("0x123")).toBe(false);
    expect(isConfiguredAddress("0x" + "1".repeat(39))).toBe(false);
    expect(isConfiguredAddress("0x" + "1".repeat(41))).toBe(false);
    expect(isConfiguredAddress("0x" + "z".repeat(40))).toBe(false);
    expect(isConfiguredAddress("1".repeat(40))).toBe(false);
  });

  it("returns false for zero address in lowercase, uppercase, and mixed case", () => {
    expect(isConfiguredAddress("0x0000000000000000000000000000000000000000")).toBe(false);
    expect(isConfiguredAddress("0X0000000000000000000000000000000000000000")).toBe(false);
    expect(isConfiguredAddress("0x0000000000000000000000000000000000000000".toUpperCase())).toBe(false);
    expect(isConfiguredAddress(PLACEHOLDER_ADDRESS)).toBe(false);
  });

  it("returns true for a valid non-zero 40-hex address (using dummy test addresses, never real router)", () => {
    const dummyAddress = "0x1111111111111111111111111111111111111111";
    expect(isConfiguredAddress(dummyAddress)).toBe(true);

    const dummyMixedCase = "0xAbCd111111111111111111111111111111111111";
    expect(isConfiguredAddress(dummyMixedCase)).toBe(true);
  });
});
