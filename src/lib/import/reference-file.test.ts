import { describe, expect, it } from "vitest";
import { inspectReferenceCsv } from "./reference-file";

describe("inspectReferenceCsv", () => {
  it("liest Technik- und Bauzeitdaten mit führenden Nullen", () => {
    const content = Buffer.from([
      "external_id;hsn;tsn;manufacturer;model;generation_code;production_start;production_end;power_kw;engine;drivetrain",
      "dat-1;0710;430;Mercedes-Benz;CL 500;C215;1999-01-01;2006-12-31;225;5,0 l V8;Hinterradantrieb",
    ].join("\n"));

    const result = inspectReferenceCsv(content, "dat");
    expect(result.rows[0]).toMatchObject({
      externalId: "dat-1",
      hsn: "0710",
      tsn: "430",
      generationCode: "C215",
      powerKw: 225,
    });
  });

  it("weist doppelte Provider-IDs zurück", () => {
    const content = Buffer.from([
      "external_id;hsn;tsn;manufacturer;model",
      "same;0710;430;Mercedes-Benz;CL 500",
      "same;0710;429;Mercedes-Benz;CL 500",
    ].join("\n"));
    expect(() => inspectReferenceCsv(content, "dat")).toThrow("Doppelte external_id");
  });
});
