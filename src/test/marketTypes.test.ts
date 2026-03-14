import { describe, it, expect } from "vitest";
import { formatPercent, formatUSD, formatProtocolLabel, type Market } from "../lib/marketTypes";

// ── formatPercent ─────────────────────────────────────────────────────────────

describe("formatPercent", () => {
  it("formats a typical APY value", () => {
    expect(formatPercent(4.52)).toBe("4.52%");
  });

  it("formats zero", () => {
    expect(formatPercent(0)).toBe("0.00%");
  });

  it("formats sub-0.01 values with <0.01%", () => {
    expect(formatPercent(0.001)).toBe("<0.01%");
    expect(formatPercent(0.009)).toBe("<0.01%");
  });

  it("returns — for null", () => {
    expect(formatPercent(null)).toBe("—");
  });

  it("returns — for undefined", () => {
    expect(formatPercent(undefined)).toBe("—");
  });

  it("formats 100%", () => {
    expect(formatPercent(100)).toBe("100.00%");
  });

  it("handles negative values (borrow edge case)", () => {
    expect(formatPercent(-0.5)).toBe("-0.50%");
  });
});

// ── formatUSD ──────────────────────────────────────────────────────────────────

describe("formatUSD", () => {
  it("formats billions", () => {
    expect(formatUSD(1_500_000_000)).toBe("$1.50B");
  });

  it("formats millions", () => {
    expect(formatUSD(42_000_000)).toBe("$42.00M");
  });

  it("formats thousands", () => {
    expect(formatUSD(500_000)).toBe("$500.00K");
  });

  it("formats sub-thousand", () => {
    expect(formatUSD(999)).toBe("$999.00");
  });

  it("returns — for null", () => {
    expect(formatUSD(null)).toBe("—");
  });

  it("formats zero", () => {
    expect(formatUSD(0)).toBe("$0.00");
  });
});

// ── formatProtocolLabel ────────────────────────────────────────────────────────

describe("formatProtocolLabel", () => {
  const makeMarket = (protocolName: string): Pick<Market, "protocol" | "protocolName" | "poolName" | "marketUid"> => ({
    protocol: "AAVE_V3",
    protocolName,
    poolName: "Core",
    marketUid: "AAVE_V3:1:USDC",
  });

  it("returns protocolName as-is (backend is source of truth)", () => {
    expect(formatProtocolLabel(makeMarket("Aave V3 Core (Ethereum)"))).toBe("Aave V3 Core (Ethereum)");
  });

  it("handles Base chain label", () => {
    expect(formatProtocolLabel(makeMarket("Aave V3 Core (Base)"))).toBe("Aave V3 Core (Base)");
  });

  it("handles Morpho Blue", () => {
    expect(formatProtocolLabel(makeMarket("Morpho Blue (Ethereum)"))).toBe("Morpho Blue (Ethereum)");
  });
});

// ── Rate normalization logic (mirrors backend normalizeRatePercent) ─────────────

describe("rate normalization heuristic", () => {
  // Backend normalizePercent: if Math.abs(n) <= 1, multiply by 100, else pass through
  function normalizePercent(raw: number): number | null {
    if (!Number.isFinite(raw)) return null;
    return Math.abs(raw) <= 1 ? raw * 100 : raw;
  }

  // normalizeRatePercent: pass through (1Delta returns percentages already)
  function normalizeRatePercent(raw: number): number | null {
    if (!Number.isFinite(raw)) return null;
    return raw;
  }

  it("normalizePercent: converts decimal utilization 0.75 → 75", () => {
    expect(normalizePercent(0.75)).toBe(75);
  });

  it("normalizePercent: passes through already-percent value 85", () => {
    expect(normalizePercent(85)).toBe(85);
  });

  it("normalizePercent: handles 0", () => {
    expect(normalizePercent(0)).toBe(0);
  });

  it("normalizePercent: handles 1 (edge case — treated as decimal = 100%)", () => {
    expect(normalizePercent(1)).toBe(100);
  });

  it("normalizeRatePercent: passes through APY already as percent (e.g. 4.52)", () => {
    expect(normalizeRatePercent(4.52)).toBe(4.52);
  });

  it("normalizeRatePercent: does NOT multiply sub-1 values (sub-1% APY is valid)", () => {
    // 0.5 from 1Delta means 0.5%, not 50%
    expect(normalizeRatePercent(0.5)).toBe(0.5);
  });

  it("UtilBar receives percent value, must NOT multiply by 100 again", () => {
    // Bug check: utilizationRate from backend is already in percent (e.g. 75)
    // UtilBar pct should be Math.min(100, Math.max(0, value)) not value*100
    const utilizationRateFromBackend = 75; // 75%
    const pct = Math.min(100, Math.max(0, utilizationRateFromBackend)); // correct
    expect(pct).toBe(75);

    const pctWrong = Math.min(100, Math.max(0, utilizationRateFromBackend * 100));
    expect(pctWrong).toBe(100); // Would wrongly show 100% for any util > 1%
  });
});

// ── Chain/protocol label parsing ───────────────────────────────────────────────

describe("parseChainFromLabel", () => {
  function parseChainFromLabel(label: string): { name: string; chain: string | null } {
    const match = label.match(/^(.+?)\s*\((\w+)\)$/);
    if (match) return { name: match[1], chain: match[2] };
    return { name: label, chain: null };
  }

  it("extracts chain from 'Aave V3 Core (Ethereum)'", () => {
    const result = parseChainFromLabel("Aave V3 Core (Ethereum)");
    expect(result.name).toBe("Aave V3 Core");
    expect(result.chain).toBe("Ethereum");
  });

  it("extracts chain from 'Compound Blue (Base)'", () => {
    const result = parseChainFromLabel("Compound Blue (Base)");
    expect(result.name).toBe("Compound Blue");
    expect(result.chain).toBe("Base");
  });

  it("returns null chain when no parentheses", () => {
    const result = parseChainFromLabel("Morpho Blue");
    expect(result.name).toBe("Morpho Blue");
    expect(result.chain).toBeNull();
  });
});
