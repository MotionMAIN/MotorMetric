import { describe, expect, it } from "vitest";
import { parseFz2PdfText } from "./kba-fz2";

function documentWith(row: string) {
  return [
    "Titel",
    "Inhalt",
    "Vorspann",
    [
      "Bestand an Personenkraftwagen am 1. Januar 2017 nach Herstellern, Handelsnamen und",
      "ausgewählten Merkmalen",
      "AUDI (D)",
      row,
      "  SONSTIGE/NICHT GETYPT                                              3 774",
    ].join("\n"),
    "Bestand an Personenkraftwagen am 1. Januar 2017 nach Herstellern und Bundesländern",
  ].join("\f");
}

describe("parseFz2PdfText", () => {
  it("liest das historische 2005er Typformat samt Mercedes-Baureihe", () => {
    const text = [
      "Titel",
      "Inhalt",
      "Vorspann",
      "Vorwort",
      [
        "Bestand an Personenkraftwagen am 1. Januar 2005 nach Herstellern und Typen mit ausgewählten Merkmalen",
        "Typ- und Verkaufsbezeichnung",
        "DAIMLERCHRYSLER (D)",
        "220 ( S 500)                             410   220-225KW                 8 847               -          8 793",
      ].join("\n"),
      "Bestand an Personenkraftwagen am 1. Januar 2005 nach Herstellern, Typen und Ländern",
    ].join("\f");

    expect(parseFz2PdfText(text, 2005)).toEqual([expect.objectContaining({
      manufacturerName: "DAIMLERCHRYSLER (D)",
      tradeName: "220 ( S 500)",
      tsn: "410",
      powerKw: 225,
      fuelCode: "B",
      stock: 8847,
    })]);
  });

  it("liest das historische 2006er Handelsnamenformat", () => {
    const text = [
      "Titel",
      "Inhalt",
      "Vorspann",
      "Vorwort",
      [
        "Bestand an Personenkraftwagen am 1. Januar 2006 nach Herstellern, Handelsnamen, ausgewählten Merkmalen und Hubraumklassen",
        "DAIMLERCHRYSLER (D)",
        "  S 500                                           410        0225       B        -      G               8 030                  -",
      ].join("\n"),
      "Bestand an Personenkraftwagen am 1. Januar 2006 nach Herstellern, Handelsnamen, Ländern und Hubraumklassen",
    ].join("\f");

    expect(parseFz2PdfText(text, 2006)).toEqual([expect.objectContaining({
      manufacturerName: "DAIMLERCHRYSLER (D)",
      tradeName: "S 500",
      tsn: "410",
      powerKw: 225,
      fuelCode: "B",
      bodyCode: "G",
      stock: 8030,
    })]);
  });

  it("liest die amtliche TSN-Zeile ohne eine HSN zu erfinden", () => {
    const rows = parseFz2PdfText(
      documentWith("  AUDI A8;AUDI A8, S8, A8L;              ADZ           171     D A       2 177          -"),
      2017,
    );

    expect(rows).toEqual([expect.objectContaining({
      manufacturerName: "AUDI (D)",
      tradeName: "AUDI A8;AUDI A8, S8, A8L;",
      tsn: "ADZ",
      powerKw: 171,
      fuelCode: "D",
      allWheel: true,
      stock: 2177,
    })]);
  });

  it("hält die Identität bei einem abschließenden Semikolon stabil", () => {
    const withSemicolon = parseFz2PdfText(
      documentWith("  AUDI A8;AUDI A8, S8, A8L;              ADZ           171     D A       2 177          -"),
      2017,
    )[0];
    const withoutSemicolon = parseFz2PdfText(
      documentWith("  AUDI A8;AUDI A8, S8, A8L               ADZ           171     D A       2 300          -"),
      2016,
    )[0];

    expect(withSemicolon.identityKey).toBe(withoutSemicolon.identityKey);
  });
});
