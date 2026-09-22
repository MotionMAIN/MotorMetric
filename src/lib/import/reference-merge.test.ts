import { describe, expect, it } from "vitest";
import { mergeStockWithReferenceData } from "./reference-merge";

const stock = [{ hsn: "0999", tsn: "AFU", stock: 926, reportingDate: "2025-01-01" }];

describe("mergeStockWithReferenceData", () => {
  it("confirms only one exact HSN/TSN reference", () => {
    const result = mergeStockWithReferenceData(stock, [{
      providerKey: "tecdoc",
      externalId: "ktype-1",
      hsn: "0999",
      tsn: "afu",
      manufacturer: "Mercedes-Benz",
      model: "CL 500",
      generationCode: "C216",
    }]);

    expect(result[0]).toMatchObject({ status: "confirmed", confidence: "high" });
    expect(result[0].reference?.generationCode).toBe("C216");
  });

  it("keeps ambiguous references out of automatic aggregation", () => {
    const references = ["pre", "facelift"].map((externalId) => ({
      providerKey: "vehicle-provider",
      externalId,
      hsn: "0999",
      tsn: "AFU",
      manufacturer: "Mercedes-Benz",
      model: "CL 500",
    }));

    const result = mergeStockWithReferenceData(stock, references);
    expect(result[0]).toMatchObject({ status: "review", confidence: "medium", reference: null });
  });
});
