import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";
import readExcelFile from "read-excel-file/node";

export interface Fz2Row {
  identityKey: string;
  manufacturerName: string;
  tradeName: string;
  tsn: string;
  powerKw: number;
  fuelCode: string;
  allWheel: boolean;
  bodyCode: string | null;
  stock: number;
}

export interface Fz2ImportReport {
  checksum: string;
  reportingDate: Date;
  rows: Fz2Row[];
  totalStock: number;
}

function clean(value: unknown): string {
  return String(value ?? "").replace(/\s+/g, " ").trim();
}

function identityKey(row: Omit<Fz2Row, "identityKey">): string {
  const stableTradeName = row.tradeName.replace(/[;,\s]+$/g, "");
  const identity = [
    row.manufacturerName,
    stableTradeName,
    row.tsn,
    row.powerKw,
    row.fuelCode,
    row.allWheel ? "A" : "",
    row.bodyCode ?? "",
  ].join("|").toLocaleUpperCase("de-DE");
  return createHash("sha256").update(identity).digest("hex");
}

function createRow(values: Omit<Fz2Row, "identityKey">): Fz2Row {
  return { ...values, identityKey: identityKey(values) };
}

function deduplicate(rows: Fz2Row[]): Fz2Row[] {
  const unique = new Map<string, Fz2Row>();
  for (const row of rows) {
    const existing = unique.get(row.identityKey);
    unique.set(row.identityKey, existing ? { ...existing, stock: existing.stock + row.stock } : row);
  }
  return [...unique.values()];
}

const manufacturerPattern = /^[A-ZÄÖÜ][A-ZÄÖÜ .,&+()'\/-]+$/;

function tablePages(text: string, startText: string, endTexts: string[]): string[] {
  const pages = text.split("\f");
  const compact = pages.map((page) => page.replace(/\s+/g, " "));
  const start = compact.findIndex((page, index) => index >= 3 && page.includes(startText));
  if (start < 0) return [];
  const endOffset = compact.slice(start + 1).findIndex((page) => endTexts.some((endText) => page.includes(endText)));
  return pages.slice(start, endOffset < 0 ? pages.length : start + 1 + endOffset);
}

function parseFz2Rows(
  pages: string[],
  parseLine: (line: string, manufacturer: string) => Fz2Row | null,
): Fz2Row[] {
  const rows: Fz2Row[] = [];
  let manufacturer = "";
  for (const page of pages) {
    for (const rawLine of page.split(/\r?\n/)) {
      const normalizedLine = rawLine.replace(/\t/g, "    ");
      const row = manufacturer ? parseLine(normalizedLine, manufacturer) : null;
      if (row) {
        rows.push(row);
        continue;
      }
      const heading = clean(normalizedLine);
      if (manufacturerPattern.test(heading)) {
        manufacturer = heading.toLocaleUpperCase("de-DE");
      }
    }
  }
  return deduplicate(rows);
}

function parseLegacyTypePdfText(text: string): Fz2Row[] {
  const pages = tablePages(
    text,
    "nach Herstellern und Typen mit ausgewählten Merkmalen",
    ["nach Herstellern, Typen und Ländern"],
  ).filter((page) => page.includes("Typ- und Verkaufsbezeichnung"));
  return parseFz2Rows(pages, (line, manufacturer) => {
    const match = line.match(/^\s*(.*?)\s{2,}([A-Z0-9]{3})\s{2,}(.+?)\s{2,}(\d{1,3}(?: \d{3})*)\s{2,}/);
    if (!match) return null;
    const tradeName = clean(match[1]);
    const powerMatch = match[3].match(/(\d{2,3})\s*KW$/i) ?? match[3].match(/-(\d{2,3})$/);
    const stock = Number(match[4].replace(/\s/g, ""));
    if (!tradeName || tradeName.includes("ZUSAMMEN") || !Number.isSafeInteger(stock)) return null;
    const technicalName = match[3].toLocaleUpperCase("de-DE");
    return createRow({
      manufacturerName: manufacturer,
      tradeName,
      tsn: match[2],
      powerKw: powerMatch ? Number(powerMatch[1]) : 0,
      fuelCode: /(?:^|[- ])D(?:[-\d]|$)/.test(technicalName) || /(?:CDI|DIESEL)/i.test(tradeName) ? "D" : "B",
      allWheel: /(?:^|-)A(?:-|$)/.test(technicalName),
      bodyCode: null,
      stock,
    });
  });
}

function parse2006PdfText(text: string): Fz2Row[] {
  const pages = tablePages(
    text,
    "nach Herstellern, Handelsnamen, ausgewählten Merkmalen und Hubraumklassen",
    ["nach Herstellern, Handelsnamen, Ländern und Hubraumklassen"],
  );
  return parseFz2Rows(pages, (line, manufacturer) => {
    const match = line.match(/^\s{2}(.*?)\s{2,}([A-Z0-9]{3})\s+0*(\d{1,3})\s+([A-Z])\s+([A-])\s+([A-Z-])\s{2,}(\d{1,3}(?: \d{3})*)\s{2,}/);
    if (!match) return null;
    const tradeName = clean(match[1]);
    const stock = Number(match[7].replace(/\s/g, ""));
    if (!tradeName || !Number.isSafeInteger(stock)) return null;
    return createRow({
      manufacturerName: manufacturer,
      tradeName,
      tsn: match[2],
      powerKw: Number(match[3]),
      fuelCode: match[4],
      allWheel: match[5] === "A",
      bodyCode: match[6] === "-" ? null : match[6],
      stock,
    });
  });
}

export function parseFz2PdfText(text: string, year: number): Fz2Row[] {
  if (year <= 2005) return parseLegacyTypePdfText(text);
  if (year === 2006) return parse2006PdfText(text);
  const pages = tablePages(text, "nach Herstellern, Handelsnamen", [
    "nach Herstellern und Bundesländern",
    "nach Herstellern und Ländern",
  ]);
  if (!pages.length) throw new Error(`FZ-2-Tabelle für ${year} wurde im PDF nicht gefunden.`);
  const rowPattern = /^\s{2}(.*?)\s{2,}([A-Z0-9]{3})\s+(\d{1,3})\s+([A-Z])((?:\s+[A-Z]){0,2})\s{2,}(.+)$/;
  return parseFz2Rows(pages, (normalizedLine, manufacturer) => {
      const match = normalizedLine.match(rowPattern);
      if (!match) return null;
      const tradeName = clean(match[1]);
      if (!tradeName || tradeName.toLocaleUpperCase("de-DE").includes("SONSTIGE")) return null;
      const featureCodes = clean(match[5]).split(" ").filter(Boolean);
      const allWheel = featureCodes[0] === "A";
      const bodyCode = featureCodes[allWheel ? 1 : 0] ?? null;
      const stockText = match[6].trim().split(/\s{2,}/)[0];
      const stock = Number(stockText.replace(/\s/g, ""));
      if (!Number.isSafeInteger(stock) || stock < 0) return null;

      return createRow({
        manufacturerName: manufacturer,
        tradeName,
        tsn: match[2],
        powerKw: Number(match[3]),
        fuelCode: match[4],
        allWheel,
        bodyCode,
        stock,
      });
  });
}

export async function parseFz2Workbook(path: string): Promise<Fz2Row[]> {
  const sheets = await readExcelFile(path);
  const sheet = sheets.find((candidate) => candidate.sheet === "FZ 2.2");
  if (!sheet) throw new Error("Tabellenblatt FZ 2.2 wurde nicht gefunden.");

  const rows: Fz2Row[] = [];
  let manufacturer = "";
  for (const cells of sheet.data.slice(9)) {
    const manufacturerCell = clean(cells[1]);
    if (manufacturerCell && !manufacturerCell.includes("ZUSAMMEN")) {
      manufacturer = manufacturerCell.toLocaleUpperCase("de-DE");
    }
    const tradeName = clean(cells[2]);
    const tsn = clean(cells[3]).toUpperCase();
    const powerKw = Number(cells[4]);
    const fuelCode = clean(cells[5]).toUpperCase();
    const stock = Number(cells[8]);
    if (!manufacturer || !tradeName || tradeName.toUpperCase().includes("SONSTIGE")) continue;
    if (!/^[A-Z0-9]{3}$/.test(tsn) || !Number.isSafeInteger(powerKw) || !fuelCode) continue;
    if (!Number.isSafeInteger(stock) || stock < 0) continue;

    rows.push(createRow({
      manufacturerName: manufacturer,
      tradeName,
      tsn,
      powerKw,
      fuelCode,
      allWheel: clean(cells[6]).toUpperCase() === "A",
      bodyCode: clean(cells[7]).toUpperCase() || null,
      stock,
    }));
  }
  return deduplicate(rows);
}

export async function createFz2Report(
  originalPath: string,
  parsedPath: string,
  year: number,
): Promise<Fz2ImportReport> {
  const original = await readFile(originalPath);
  const rows = originalPath.toLowerCase().endsWith(".pdf")
    ? parseFz2PdfText(await readFile(parsedPath, "utf8"), year)
    : await parseFz2Workbook(parsedPath);
  if (rows.length < 1_000) throw new Error(`FZ 2 ${year} enthält unerwartet nur ${rows.length} verwertbare Zeilen.`);
  return {
    checksum: createHash("sha256").update(original).digest("hex"),
    reportingDate: new Date(Date.UTC(year, 0, 1)),
    rows,
    totalStock: rows.reduce((sum, row) => sum + row.stock, 0),
  };
}
