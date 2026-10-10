import { describe, it, expect } from "vitest";
import { EvmAddressSchema, normalizeAddress, areAddressesEqual } from "@/lib/validation/address";

describe("Address Normalization & Zod Validation", () => {
  it("normalizes mixed-case addresses to lowercase via Zod transform", () => {
    const input = "0x565342BEbba269d7211124Ccfd81b4d081f9f23A";
    const parsed = EvmAddressSchema.parse(input);
    expect(parsed).toBe("0x565342bebba269d7211124ccfd81b4d081f9f23a");
  });

  it("trims surrounding whitespace and lowercases", () => {
    const input = "   0x565342BEbba269d7211124Ccfd81b4d081f9f23A   ";
    const parsed = EvmAddressSchema.parse(input);
    expect(parsed).toBe("0x565342bebba269d7211124ccfd81b4d081f9f23a");
  });

  it("rejects non-hex or invalid length addresses", () => {
    expect(() => EvmAddressSchema.parse("0xinvalid")).toThrow(/Invalid EVM address format/);
    expect(() => EvmAddressSchema.parse("565342BEbba269d7211124Ccfd81b4d081f9f23A")).toThrow(/Invalid EVM address format/);
    expect(() => EvmAddressSchema.parse("0x123")).toThrow(/Invalid EVM address format/);
  });

  it("normalizeAddress helper transforms correctly", () => {
    const res = normalizeAddress("0xABCD1234567890ABCD1234567890ABCD12345678");
    expect(res).toBe("0xabcd1234567890abcd1234567890abcd12345678");
  });

  it("areAddressesEqual performs case-insensitive comparison", () => {
    expect(
      areAddressesEqual(
        "0x565342BEbba269d7211124Ccfd81b4d081f9f23A",
        "0x565342bebba269d7211124ccfd81b4d081f9f23a"
      )
    ).toBe(true);

    expect(
      areAddressesEqual(
        "0x565342bebba269d7211124ccfd81b4d081f9f23a",
        "0x0000000000000000000000000000000000000000"
      )
    ).toBe(false);

    expect(areAddressesEqual(null, "0x123")).toBe(false);
  });
});
