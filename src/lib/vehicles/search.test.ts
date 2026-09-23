import { describe, expect, it } from "vitest";
import { searchDemoVehicles } from "./search";

describe("vehicle search", () => {
  it("finds CL 500 generations without a space", () => {
    const results = searchDemoVehicles("CL500");
    expect(results.map((result) => result.generation)).toEqual(["C215", "C216", "C216", "C216"]);
  });

  it("does not expose internal chassis codes as a search language", () => {
    expect(searchDemoVehicles("C216")).toEqual([]);
  });

  it("finds a technical HSN/TSN query", () => {
    const results = searchDemoVehicles("HSN 0999 TSN AFT");
    expect(results.map((result) => result.generation)).toContain("W211");
  });

  it("finds every vehicle matching a standalone HSN", () => {
    const results = searchDemoVehicles("0999");

    expect(results).toHaveLength(3);
    expect(results.every((result) => result.keys.some((key) => key.hsn === "0999"))).toBe(true);
  });

  it("finds every vehicle matching a standalone TSN", () => {
    const results = searchDemoVehicles("AFT");

    expect(results).toHaveLength(2);
    expect(results.every((result) => result.keys.some((key) => key.tsn === "AFT"))).toBe(true);
  });

  it("never includes uncertain keys in the stock sum", () => {
    const result = searchDemoVehicles("CL 500").find((candidate) => candidate.uncertainKeyCount > 0);
    expect(result).toBeDefined();
    if (!result) return;
    expect(result.stock).toBe(1832);
    expect(result.uncertainKeyCount).toBe(1);
  });
});
