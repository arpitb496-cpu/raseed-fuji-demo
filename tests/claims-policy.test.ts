import { describe, it, expect } from "vitest";
import fs from "fs";
import path from "path";
import en from "@/locales/en.json";
import hi from "@/locales/hi.json";

function getLeafStrings(obj: Record<string, unknown>, prefix = ""): Array<{ path: string; text: string }> {
  const result: Array<{ path: string; text: string }> = [];
  for (const [k, v] of Object.entries(obj)) {
    const full = prefix ? `${prefix}.${k}` : k;
    if (v && typeof v === "object" && !Array.isArray(v)) {
      result.push(...getLeafStrings(v as Record<string, unknown>, full));
    } else if (typeof v === "string") {
      result.push({ path: full, text: v });
    }
  }
  return result;
}

/**
 * List of forbidden marketing/financial claims and buzzwords.
 * Positive claims of security, audit status, licensing, yield, or official recognition
 * are strictly forbidden by protocol scope policy.
 */
const FORBIDDEN_CLAIM_PATTERNS: Array<{ name: string; pattern: RegExp; allowFilter?: (match: string, fullText: string) => boolean }> = [
  {
    name: "audited",
    // Disallow claims of being audited; allow explicit negative disclaimers like "no independent audit" or "not audited"
    pattern: /\b(?:audited|ऑडिट)\b/i,
    allowFilter: (_m, full) => /\b(?:no(?:\s+independent)?\s+audit|not\s+audited|audit:\s*none|pending\s+audit)\b/i.test(full),
  },
  {
    name: "secure",
    // Disallow claims of being "secure" as a product claim
    pattern: /\b(?:secure|सुरक्षित)\b/i,
    allowFilter: (_m, full) => /(?:not\s+secure|insecure|`Secure`|Secure\s+cookie)/i.test(full),
  },
  {
    name: "safe",
    // Disallow claims of being "safe"; allow safeParse / typesafe / type-safe
    pattern: /\b(?:safe)\b/i,
    allowFilter: (_m, full) => /(?:safeparse|typesafe|type-safe|thread-safe|not\s+safe)/i.test(full),
  },
  {
    name: "guaranteed",
    pattern: /\b(?:guaranteed|guarantee|गारंटी)\b/i,
    allowFilter: (_m, full) => /\b(?:no\s+guarantee|not\s+guaranteed|without\s+guarantee|no\s+copy\s+makes\s+claims\s+of)\b/i.test(full),
  },
  {
    name: "verified",
    // Disallow claiming protocol, contract or platform is verified; allow technical pending notices or Snowtrace verification
    pattern: /\b(?:verified|सत्यापित)\b/i,
    allowFilter: (_m, full) => /\b(?:verification\s+pending|pending\s+verification|not\s+verified|unverified|verified\s+on\s+Snowtrace)\b/i.test(full),
  },
  {
    name: "official",
    pattern: /\b(?:official|आधिकारिक)\b/i,
    allowFilter: (_m, full) => /\b(?:unofficial|not\s+official)\b/i.test(full),
  },
  {
    name: "licensed",
    pattern: /\b(?:licensed|लाइसेंस)\b/i,
    allowFilter: (_m, full) => /\b(?:unlicensed|not\s+licensed)\b/i.test(full),
  },
  {
    name: "open source",
    pattern: /\b(?:open\s*source|ओपन\s*सोर्स)\b/i,
  },
  {
    name: "yield / APY",
    pattern: /\b(?:yield|apy|apr)\b/i,
    allowFilter: (_m, full) => /\b(?:no\s+copy\s+makes\s+claims\s+of|disclaimers?)\b/i.test(full),
  },
  {
    name: "returns / investment",
    pattern: /\b(?:high\s+returns|investment\s+returns|guaranteed\s+returns|निवेश)\b/i,
    allowFilter: (_m, full) => /\b(?:no\s+copy\s+makes\s+claims\s+of|disclaimers?)\b/i.test(full),
  },
  {
    name: "fake metrics & user counts",
    pattern: /\b(?:\d+[,.]?\d*\s*(?:k\+|m\+|million|thousand)\s*(?:users|merchants|invoices|volume)|trusted\s+by\s+\d+|over\s+\d+\s+happy\s+users)\b/i,
  },
  {
    name: "testimonials & ratings",
    pattern: /\b(?:customer\s+testimonials?|client\s+reviews?|5-star\s+rating|★★★★★)\b/i,
  },
  {
    name: "self-hosted",
    pattern: /\b(?:self[- ]hosted|सेल्फ[- ]होस्टेड)\b/i,
  },
  {
    name: "protocol",
    pattern: /\b(?:protocol|प्रोटोकॉल)\b/i,
    allowFilter: (_m, full) => /\b(?:WalletConnect(?:\s+protocol|\s+v2)?|protocol\s+transport|protocol\s+client|protocol\s+fee)\b/i.test(full),
  },
];

describe("Claims Policy Verification (Scope & Compliance)", () => {
  describe("i18n locale dictionaries (en.json & hi.json)", () => {
    it("scans en.json for forbidden claims and fails on any match", () => {
      const enLeaves = getLeafStrings(en);
      const violations: string[] = [];

      for (const { path: keyPath, text } of enLeaves) {
        for (const { name, pattern, allowFilter } of FORBIDDEN_CLAIM_PATTERNS) {
          if (pattern.test(text)) {
            const allowed = allowFilter ? allowFilter(text, text) : false;
            if (!allowed) {
              violations.push(`en.json [${keyPath}]: violates '${name}' -> "${text}"`);
            }
          }
        }
      }

      expect(violations, `Forbidden claims found in en.json:\n${violations.join("\n")}`).toEqual([]);
    });

    it("scans hi.json for forbidden claims and fails on any match", () => {
      const hiLeaves = getLeafStrings(hi);
      const violations: string[] = [];

      for (const { path: keyPath, text } of hiLeaves) {
        for (const { name, pattern, allowFilter } of FORBIDDEN_CLAIM_PATTERNS) {
          if (pattern.test(text)) {
            const allowed = allowFilter ? allowFilter(text, text) : false;
            if (!allowed) {
              violations.push(`hi.json [${keyPath}]: violates '${name}' -> "${text}"`);
            }
          }
        }
      }

      expect(violations, `Forbidden claims found in hi.json:\n${violations.join("\n")}`).toEqual([]);
    });
  });

  describe("Public Page Sources", () => {
    const PUBLIC_PAGES = [
      "src/app/page.tsx",
      "src/app/about/how-it-works/page.tsx",
      "src/app/security/page.tsx",
      "src/app/legal/terms/page.tsx",
      "src/app/legal/privacy/page.tsx",
      "src/app/legal/risks/page.tsx",
    ];

    it.each(PUBLIC_PAGES)("scans %s for forbidden claims", (relativeFilePath) => {
      const absolutePath = path.resolve(process.cwd(), relativeFilePath);
      expect(fs.existsSync(absolutePath), `File must exist: ${relativeFilePath}`).toBe(true);

      const content = fs.readFileSync(absolutePath, "utf-8");
      // Remove comments and imports to scan visible copy / JSX
      const lines = content.split("\n");
      const violations: string[] = [];

      lines.forEach((line, lineNum) => {
        const trimmed = line.trim();
        // Skip import lines, comments, and icon names
        if (
          trimmed.startsWith("import") ||
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*")
        ) {
          return;
        }

        for (const { name, pattern, allowFilter } of FORBIDDEN_CLAIM_PATTERNS) {
          if (pattern.test(trimmed)) {
            const allowed = allowFilter ? allowFilter(trimmed, trimmed) : false;
            if (!allowed) {
              violations.push(`${relativeFilePath}:${lineNum + 1}: violates '${name}' -> "${trimmed}"`);
            }
          }
        }
      });

      expect(
        violations,
        `Forbidden claims detected in ${relativeFilePath}:\n${violations.join("\n")}`
      ).toEqual([]);
    });
  });

  describe("PDF & Invoice/Receipt Templates", () => {
    const PDF_TEMPLATES = ["src/lib/pdf/generate-invoice-pdf.ts"];

    it.each(PDF_TEMPLATES)("scans %s for forbidden claims (protocol, audited, official, etc.)", (relativeFilePath) => {
      const absolutePath = path.resolve(process.cwd(), relativeFilePath);
      expect(fs.existsSync(absolutePath), `File must exist: ${relativeFilePath}`).toBe(true);

      const content = fs.readFileSync(absolutePath, "utf-8");
      const lines = content.split("\n");
      const violations: string[] = [];

      lines.forEach((line, lineNum) => {
        const trimmed = line.trim();
        // Skip imports, comments, css font declarations, type annotations
        if (
          trimmed.startsWith("import") ||
          trimmed.startsWith("//") ||
          trimmed.startsWith("/*") ||
          trimmed.startsWith("*") ||
          trimmed.startsWith("type ") ||
          trimmed.startsWith("interface ")
        ) {
          return;
        }

        for (const { name, pattern, allowFilter } of FORBIDDEN_CLAIM_PATTERNS) {
          if (pattern.test(trimmed)) {
            const allowed = allowFilter ? allowFilter(trimmed, trimmed) : false;
            if (!allowed) {
              violations.push(`${relativeFilePath}:${lineNum + 1}: violates '${name}' -> "${trimmed}"`);
            }
          }
        }
      });

      expect(
        violations,
        `Forbidden claims detected in ${relativeFilePath}:\n${violations.join("\n")}`
      ).toEqual([]);
    });
  });

  describe("Documentation (README.md & docs/*.md)", () => {
    const DOC_FILES = [
      "README.md",
      ...fs
        .readdirSync(path.resolve(process.cwd(), "docs"))
        .filter((file) => file.endsWith(".md") && file !== "VERIFY_ROUTER.md")
        .map((file) => `docs/${file}`),
    ];

    it.each(DOC_FILES)(
      "scans %s for forbidden claims (protocol, verified, audited, official, etc.)",
      (relativeFilePath) => {
        const absolutePath = path.resolve(process.cwd(), relativeFilePath);
        expect(fs.existsSync(absolutePath), `File must exist: ${relativeFilePath}`).toBe(true);

        const content = fs.readFileSync(absolutePath, "utf-8");
        const lines = content.split("\n");
        const violations: string[] = [];

        lines.forEach((line, lineNum) => {
          const trimmed = line.trim();
          if (trimmed.length === 0) return;
          if (trimmed.startsWith("- ❌") || trimmed.startsWith("* ❌")) return;

          for (const { name, pattern, allowFilter } of FORBIDDEN_CLAIM_PATTERNS) {
            if (pattern.test(trimmed)) {
              const allowed = allowFilter ? allowFilter(trimmed, trimmed) : false;
              if (!allowed) {
                violations.push(
                  `${relativeFilePath}:${lineNum + 1}: violates '${name}' -> "${trimmed}"`
                );
              }
            }
          }
        });

        expect(
          violations,
          `Forbidden claims detected in ${relativeFilePath}:\n${violations.join("\n")}`
        ).toEqual([]);
      }
    );
  });
});
