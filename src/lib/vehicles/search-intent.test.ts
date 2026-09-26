import { describe, expect, it } from "vitest";
import {
  findModelNameParts,
  manufacturerSearchTerms,
  parseTechnicalSearch,
  searchableVehicleTokens,
  splitCompactVehicleToken,
} from "./search-intent";

describe("parseTechnicalSearch", () => {
  it("trennt Modell, Generation, Hubraum und TDI-Suchabsicht", () => {
    expect(parseTechnicalSearch("a8 d2 3.3 tdi")).toEqual({
      textTokens: ["a8", "d2"],
      displacementCc: 3300,
      fuel: "Diesel",
    });
  });

  it("erkennt eine angehängte kW-Angabe", () => {
    expect(parseTechnicalSearch("CL 500 225kW")).toEqual({
      textTokens: ["CL", "500"],
      powerKw: 225,
    });
  });

  it("trennt ein direkt angehängtes Kraftstoffkürzel vom Modell", () => {
    expect(parseTechnicalSearch("e420cdi")).toEqual({
      textTokens: ["e420"],
      fuel: "Diesel",
    });
  });

  it("zerlegt kompakte Modellnamen an Buchstaben-Ziffer-Grenzen", () => {
    expect(splitCompactVehicleToken("e420")).toEqual(["e", "420"]);
    expect(splitCompactVehicleToken("c63amg")).toEqual(["c", "63", "amg"]);
  });

  it("erkennt einen Modellnamen auch hinter einem Hersteller", () => {
    expect(findModelNameParts(["Mercedes", "CL", "500"])).toEqual(["CL", "500"]);
    expect(findModelNameParts(["Mercedes", "CL500"])).toEqual(["CL", "500"]);
  });

  it("übersetzt Mercedes in belegte KBA-Herstellerbezeichnungen", () => {
    expect(manufacturerSearchTerms("Mercedes")).toEqual(["Mercedes", "Daimler"]);
    expect(manufacturerSearchTerms("Mercedes-Benz")).toEqual(["Mercedes-Benz", "Daimler"]);
    expect(manufacturerSearchTerms("Audi")).toEqual(["Audi"]);
  });

  it("behandelt einen ergänzenden W-Baureihencode nicht als amtlichen Handelsnamen", () => {
    expect(searchableVehicleTokens(["w211", "e420"])).toEqual(["e420"]);
    expect(searchableVehicleTokens(["w211"])).toEqual(["w211"]);
  });
});
