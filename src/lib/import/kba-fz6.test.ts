import { describe, expect, it } from "vitest";
import { parseKbaFz6Rows } from "./kba-fz6";

const header = [
  null,
  "Hersteller-\nschlüssel-\nnummer",
  "Herstellerklartext",
  "Typ-\nschlüssel-\nnummer",
  "Handelsname",
  "Anzahl",
];

describe("parseKbaFz6Rows", () => {
  it("bewahrt führende Nullen und alphanumerische TSN", () => {
    const rows = parseKbaFz6Rows([
      header,
      [null, "0999", "MERCEDES-BENZ", "AFT", "CL 500", 123],
      [null, 1, "ADLERWERKE", 96, "M 100", 95],
      [null, null, null, null, null, null],
      [null, "© Kraftfahrt-Bundesamt, Flensburg", null, null, null, null],
    ]);

    expect(rows).toEqual([
      { hsn: "0999", manufacturerName: "MERCEDES-BENZ", tsn: "AFT", tradeName: "CL 500", stock: 123 },
      { hsn: "0001", manufacturerName: "ADLERWERKE", tsn: "096", tradeName: "M 100", stock: 95 },
    ]);
  });

  it("fasst amtliche Doppelzeilen mit identischen Bezeichnungen zusammen", () => {
    const rows = parseKbaFz6Rows([
      header,
      [null, "1260", "KIA Motors (SK) ", "AEU", "CEED,PROCEED", 1],
      [null, "1260", "KIA MOTORS (SK)", "AEU", "CEED,PROCEED", 162],
    ]);
    expect(rows[0].stock).toBe(163);
  });

  it("bricht bei widersprüchlichen doppelten Schlüsseln ab", () => {
    expect(() => parseKbaFz6Rows([
      header,
      [null, "0999", "MERCEDES-BENZ", "AFT", "CL 500", 123],
      [null, "0999", "MERCEDES-BENZ", "AFT", "E 420 CDI", 123],
    ])).toThrow("Widersprüchliche doppelte HSN/TSN");
  });

  it("erkennt eine unerwartete Tabellenstruktur", () => {
    expect(() => parseKbaFz6Rows([[null, "HSN", "Hersteller", "TSN", "Name", "Bestand"]]))
      .toThrow("nicht die erwarteten KBA-Spalten");
  });
});
