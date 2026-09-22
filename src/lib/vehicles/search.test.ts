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

  it("never includes uncertain keys in the stock sum", () => {
    const result = searchDemoVehicles("CL 500").find((candidate) => candidate.uncertainKeyCount > 0);
    expect(result).toBeDefined();
    if (!result) return;
    expect(result.stock).toBe(1832);
    expect(result.uncertainKeyCount).toBe(1);
  });
});
