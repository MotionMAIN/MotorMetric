import { createHash } from "node:crypto";
import { parse } from "csv-parse/sync";
import { referenceRowSchema, type ReferenceImportRow } from "./reference-merge";

const requiredHeaders = ["external_id", "hsn", "tsn", "manufacturer", "model"] as const;

export interface ReferenceFileReport {
  checksum: string;
  rows: ReferenceImportRow[];
}

function optional(value: string | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export function inspectReferenceCsv(content: Buffer, providerKey: string): ReferenceFileReport {
  const records = parse(content, {
    bom: true,
    columns: true,
    delimiter: ";",
    skip_empty_lines: true,
    trim: true,
  }) as Record<string, string>[];
  const headers = records.length > 0 ? Object.keys(records[0]) : [];
  for (const header of requiredHeaders) {
    if (!headers.includes(header)) throw new Error(`Pflichtspalte fehlt: ${header}`);
  }

  const seen = new Set<string>();
  const rows = records.map((record, index) => {
    const row = referenceRowSchema.parse({
      providerKey,
      externalId: record.external_id,
      hsn: record.hsn,
      tsn: record.tsn,
      manufacturer: record.manufacturer,
      model: record.model,
      generationCode: optional(record.generation_code),
      productionStart: optional(record.production_start),
      productionEnd: optional(record.production_end),
      powerKw: optional(record.power_kw),
      engine: optional(record.engine),
      drivetrain: optional(record.drivetrain),
    });
    if (seen.has(row.externalId)) throw new Error(`Doppelte external_id in Zeile ${index + 2}: ${row.externalId}`);
    if (row.productionStart && row.productionEnd && row.productionStart > row.productionEnd) {
      throw new Error(`Produktionsende liegt vor Produktionsbeginn in Zeile ${index + 2}.`);
    }
    seen.add(row.externalId);
    return row;
  });

  if (rows.length === 0) throw new Error("Die Referenzdatei enthält keine Datenzeilen.");
  return { checksum: createHash("sha256").update(content).digest("hex"), rows };
}
