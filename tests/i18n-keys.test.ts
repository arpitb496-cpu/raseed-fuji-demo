/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect } from "vitest";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";

function getLeafValues(obj: Record<string, unknown>, prefix = ""): Array<{ key: string; value: string }> {
  const results: Array<{ key: string; value: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const fullKey = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      results.push(...getLeafValues(v as Record<string, unknown>, fullKey));
    } else if (typeof v === "string") {
      results.push({ key: fullKey, value: v });
    }
  }
  return results;
}

describe("i18n Dictionaries & Rendered Key Leak Guard", () => {
  const RAW_KEY_REGEX = /^[a-z]+(\.[a-z]+)+$/;

  it("verifies en.json contains no raw untranslated dot-separated keys as values", () => {
    const enLeaves = getLeafValues(en);
    for (const { key, value } of enLeaves) {
      expect(
        RAW_KEY_REGEX.test(value.trim()),
        `en.json has raw key string for ${key}: "${value}"`
      ).toBe(false);
    }
  });

  it("verifies hi.json contains no raw untranslated dot-separated keys as values", () => {
    const hiLeaves = getLeafValues(hi);
    for (const { key, value } of hiLeaves) {
      expect(
        RAW_KEY_REGEX.test(value.trim()),
        `hi.json has raw key string for ${key}: "${value}"`
      ).toBe(false);
    }
  });

  it("verifies required footer legal links exist and are translated in both en and hi", () => {
    expect((en as any).footer.terms).toBeDefined();
    expect((en as any).footer.privacy).toBeDefined();
    expect((en as any).footer.risks).toBeDefined();

    expect((hi as any).footer.terms).toBeDefined();
    expect((hi as any).footer.privacy).toBeDefined();
    expect((hi as any).footer.risks).toBeDefined();

    expect(RAW_KEY_REGEX.test((en as any).footer.terms)).toBe(false);
    expect(RAW_KEY_REGEX.test((hi as any).footer.terms)).toBe(false);
    expect(RAW_KEY_REGEX.test((en as any).footer.privacy)).toBe(false);
    expect(RAW_KEY_REGEX.test((hi as any).footer.privacy)).toBe(false);
    expect(RAW_KEY_REGEX.test((en as any).footer.risks)).toBe(false);
    expect(RAW_KEY_REGEX.test((hi as any).footer.risks)).toBe(false);
  });

  it("verifies dictionary key parity between en and hi", () => {
    const enKeys = getLeafValues(en).map((l) => l.key).sort();
    const hiKeys = getLeafValues(hi).map((l) => l.key).sort();

    const missingInHi = enKeys.filter((k) => !hiKeys.includes(k));
    const missingInEn = hiKeys.filter((k) => !enKeys.includes(k));

    expect(missingInHi, `Keys in en.json but missing in hi.json: ${missingInHi.join(", ")}`).toEqual([]);
    expect(missingInEn, `Keys in hi.json but missing in en.json: ${missingInEn.join(", ")}`).toEqual([]);
  });
});
