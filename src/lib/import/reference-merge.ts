import { z } from "zod";

const keyPart = z.string().trim().min(1).max(8).transform((value) => value.toUpperCase());

export const stockRowSchema = z.object({
  hsn: keyPart,
  tsn: keyPart,
  stock: z.coerce.number().int().nonnegative(),
  reportingDate: z.coerce.date(),
});

export const referenceRowSchema = z.object({
  providerKey: z.string().min(1),
  externalId: z.string().min(1),
  hsn: keyPart,
  tsn: keyPart,
  manufacturer: z.string().min(1),
  model: z.string().min(1),
  generationCode: z.string().optional(),
  productionStart: z.coerce.date().optional(),
  productionEnd: z.coerce.date().optional(),
  powerKw: z.coerce.number().int().positive().optional(),
  engine: z.string().optional(),
  drivetrain: z.string().optional(),
});

export type StockImportRow = z.infer<typeof stockRowSchema>;
export type ReferenceImportRow = z.infer<typeof referenceRowSchema>;

export interface MappingProposal {
  hsn: string;
  tsn: string;
  stock: number;
  reference: ReferenceImportRow | null;
  status: "confirmed" | "review";
  confidence: "high" | "medium" | "low";
  reason: string;
}

function vehicleKey(row: { hsn: string; tsn: string }): string {
  return `${row.hsn}/${row.tsn}`;
}

export function mergeStockWithReferenceData(
  rawStockRows: unknown[],
  rawReferenceRows: unknown[],
): MappingProposal[] {
  const stockRows = rawStockRows.map((row) => stockRowSchema.parse(row));
  const referenceRows = rawReferenceRows.map((row) => referenceRowSchema.parse(row));
  const referencesByKey = new Map<string, ReferenceImportRow[]>();

  for (const reference of referenceRows) {
    const key = vehicleKey(reference);
    const matches = referencesByKey.get(key) ?? [];
    matches.push(reference);
    referencesByKey.set(key, matches);
  }

  return stockRows.map((stock) => {
    const matches = referencesByKey.get(vehicleKey(stock)) ?? [];
    if (matches.length === 0) {
      return {
        ...stock,
        reference: null,
        status: "review",
        confidence: "low",
        reason: "Keine Fahrzeugreferenz für diese HSN/TSN gefunden.",
      };
    }

    if (matches.length > 1) {
      return {
        ...stock,
        reference: null,
        status: "review",
        confidence: "medium",
        reason: `${matches.length} Fahrzeugreferenzen teilen sich diese HSN/TSN; eine manuelle Abgrenzung ist nötig.`,
      };
    }

    return {
      ...stock,
      reference: matches[0],
      status: "confirmed",
      confidence: "high",
      reason: "Eindeutiger HSN/TSN-Treffer in der Fahrzeugreferenz.",
    };
  });
}
