import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import readXlsxFile, { type Row } from "read-excel-file/node";
import { z } from "zod";

const KBA_SHEET = "FZ 6.1";
const EXPECTED_HEADER = [
  "herstellerschlüsselnummer",
  "herstellerklartext",
  "typschlüsselnummer",
  "handelsname",
  "anzahl",
] as const;

const kbaRowSchema = z.object({
  hsn: z.string().regex(/^\d{4}$/),
  manufacturerName: z.string().trim().min(1).max(240),
  tsn: z.string().trim().toUpperCase().regex(/^[A-Z0-9]{3}$/),
  tradeName: z.string().trim().min(1).max(240),
  stock: z.number().int().nonnegative(),
});

export type KbaStockRow = z.infer<typeof kbaRowSchema>;

export interface KbaFz6Report {
  checksum: string;
  reportingDate: Date;
  rows: KbaStockRow[];
  totalStock: number;
}

function normalizedHeader(value: unknown): string {
  return String(value ?? "")
    .toLocaleLowerCase("de-DE")
    .replace(/[^a-zäöüß]/g, "");
}

function cellText(value: unknown): string {
  return String(value ?? "").trim();
}

function identifier(value: unknown, width: number): string {
  const text = cellText(value);
  return /^\d+$/.test(text) ? text.padStart(width, "0") : text;
}

function parseReportingDate(coverRows: Row[]): Date {
  const monthNumbers: Record<string, number> = {
    januar: 0,
    februar: 1,
    märz: 2,
    april: 3,
    mai: 4,
    juni: 5,
    juli: 6,
    august: 7,
    september: 8,
    oktober: 9,
    november: 10,
    dezember: 11,
  };

  for (const row of coverRows) {
    for (const cell of row) {
      const match = cellText(cell).toLocaleLowerCase("de-DE").match(/(\d{1,2})\.\s+([a-zäöü]+)\s+(\d{4})/);
      if (!match) continue;
      const month = monthNumbers[match[2]];
      if (month === undefined) continue;
      return new Date(Date.UTC(Number(match[3]), month, Number(match[1])));
    }
  }

  throw new Error("Stichtag wurde auf dem KBA-Deckblatt nicht gefunden.");
}

export function parseKbaFz6Rows(sheetRows: Row[]): KbaStockRow[] {
  const headerIndex = sheetRows.findIndex((row) => {
    const headers = row.slice(1, 6).map(normalizedHeader);
    return headers[0].startsWith("hersteller")
      && headers[1] === EXPECTED_HEADER[1]
      && headers[2].startsWith("typ")
      && headers[3] === EXPECTED_HEADER[3]
      && headers[4] === EXPECTED_HEADER[4];
  });
  if (headerIndex < 0) {
    throw new Error("Das Tabellenblatt FZ 6.1 hat nicht die erwarteten KBA-Spalten.");
  }

  const rows: KbaStockRow[] = [];
  const rowIndexByKey = new Map<string, number>();
  let dataStarted = false;

  for (const [offset, row] of sheetRows.slice(headerIndex + 1).entries()) {
    const hsn = identifier(row[1], 4);
    const tsn = identifier(row[3], 3);
    const stock = row[5];

    if (!hsn && !tsn && (stock === null || stock === undefined || stock === "")) continue;
    if (hsn.startsWith("©")) continue;
    if (!/^\d{4}$/.test(hsn) && !dataStarted) continue;

    const parsed = kbaRowSchema.safeParse({
      hsn,
      manufacturerName: cellText(row[2]),
      tsn,
      tradeName: cellText(row[4]),
      stock,
    });
    if (!parsed.success) {
      throw new Error(`Ungültige KBA-Zeile ${headerIndex + offset + 2}: ${parsed.error.issues[0]?.message ?? "unbekannter Fehler"}`);
    }
    dataStarted = true;

    const key = `${parsed.data.hsn}/${parsed.data.tsn}`;
    const existingIndex = rowIndexByKey.get(key);
    if (existingIndex !== undefined) {
      const existing = rows[existingIndex];
      const sameLabels = normalizedHeader(existing.manufacturerName) === normalizedHeader(parsed.data.manufacturerName)
        && normalizedHeader(existing.tradeName) === normalizedHeader(parsed.data.tradeName);
      if (!sameLabels) throw new Error(`Widersprüchliche doppelte HSN/TSN in der KBA-Datei: ${key}`);
      existing.stock += parsed.data.stock;
      continue;
    }
    rowIndexByKey.set(key, rows.length);
    rows.push(parsed.data);
  }

  if (rows.length === 0) throw new Error("Die KBA-Datei enthält keine Bestandszeilen.");
  return rows;
}

export async function inspectKbaFz6Workbook(path: string): Promise<KbaFz6Report> {
  const [file, sheets] = await Promise.all([readFile(path), readXlsxFile(path)]);
  const stockSheet = sheets.find((sheet) => sheet.sheet === KBA_SHEET)
    ?? sheets.find((sheet) => sheet.sheet === "Kfz_u._Kfz_Anh");
  if (!stockSheet) throw new Error(`KBA-Datenblatt fehlt. Gefunden: ${sheets.map((sheet) => sheet.sheet).join(", ")}`);
  const rows = parseKbaFz6Rows(stockSheet.data);

  return {
    checksum: createHash("sha256").update(file).digest("hex"),
    reportingDate: parseReportingDate(sheets.flatMap((sheet) => sheet.data)),
    totalStock: rows.reduce((sum, row) => sum + row.stock, 0),
    rows,
  };
}
