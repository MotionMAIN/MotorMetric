import { describe, expect, it } from "vitest";
import { parseSv42Text } from "./kba-sv42";

describe("parseSv42Text", () => {
  it("liest die technischen Daten über den amtlichen HSN/TSN-Schlüssel", () => {
    const line = "0710         430       DAIMLERCHRYSLER (D)                                          CL 500                             01.05.1999                  01                0200    0001        225      4966            2        1           4       2340";
    expect(parseSv42Text(line)).toEqual([expect.objectContaining({
      hsn: "0710",
      tsn: "430",
      tradeName: "CL 500",
      assignedAt: new Date("1999-05-01T00:00:00.000Z"),
      fuelCode: "0001",
      powerKw: 225,
      displacementCc: 4966,
      drivenAxleCount: 1,
    })]);
  });
});
