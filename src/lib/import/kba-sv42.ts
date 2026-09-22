import { createHash } from "node:crypto";
import { readFile } from "node:fs/promises";

export interface Sv42Row {
  hsn: string;
  tsn: string;
  manufacturer: string;
  brand: string | null;
  tradeName: string;
  assignedAt: Date;
  vehicleClass: string;
  bodyCode: string;
  fuelCode: string;
  powerKw: number;
  displacementCc: number;
  axleCount: number;
  drivenAxleCount: number;
  seatCount: number;
  grossWeightKg: number;
}

function parseGermanDate(value: string): Date | null {
  const match = value.match(/^(\d{2})\.(\d{2})\.(\d{4})$/);
  return match ? new Date(Date.UTC(Number(match[3]), Number(match[2]) - 1, Number(match[1]))) : null;
}

export function parseSv42Text(text: string): Sv42Row[] {
  const rows: Sv42Row[] = [];
  for (const line of text.split(/\r?\n/)) {
    const hsn = line.slice(0, 4);
    const tsn = line.slice(13, 16);
    if (!/^\d{4}$/.test(hsn) || !/^[A-Z0-9]{3}$/.test(tsn)) continue;
    const tradeName = line.slice(84, 119).trim();
    const fields = line.slice(119).trim().split(/\s+/);
    if (!tradeName || fields.length !== 10) continue;
    const assignedAt = parseGermanDate(fields[0]);
    const numbers = fields.slice(4).map(Number);
    if (!assignedAt || numbers.some((value) => !Number.isSafeInteger(value))) continue;
    rows.push({
      hsn,
      tsn,
      manufacturer: line.slice(23, 55).trim(),
      brand: line.slice(55, 84).trim() || null,
      tradeName,
      assignedAt,
      vehicleClass: fields[1],
      bodyCode: fields[2],
      fuelCode: fields[3],
      powerKw: numbers[0],
      displacementCc: numbers[1],
      axleCount: numbers[2],
      drivenAxleCount: numbers[3],
      seatCount: numbers[4],
      grossWeightKg: numbers[5],
    });
  }
  return rows;
}

export async function inspectSv42Pdf(pdfPath: string, textPath: string) {
  const [pdf, text] = await Promise.all([readFile(pdfPath), readFile(textPath, "utf8")]);
  const rows = parseSv42Text(text);
  if (rows.length < 10_000) throw new Error(`SV 4.2 enthält unerwartet nur ${rows.length} Datensätze.`);
  return { checksum: createHash("sha256").update(pdf).digest("hex"), rows };
}
