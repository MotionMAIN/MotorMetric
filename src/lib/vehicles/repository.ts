import { Prisma } from "@prisma/client";
import { prisma } from "@/db/prisma";
import { searchDemoVehicles } from "./search";
import { parseTechnicalSearch, splitCompactVehicleToken, type TechnicalSearchIntent } from "./search-intent";
import type { SearchFilters, VehicleResult } from "./types";

function formatDate(date: Date): string {
  return new Intl.DateTimeFormat("de-DE", { timeZone: "UTC" }).format(date);
}

function yearRange(year: number) {
  return { gte: new Date(Date.UTC(year, 0, 1)), lt: new Date(Date.UTC(year + 1, 0, 1)) };
}

function fuelName(code: string): string {
  return ({ B: "Benzin", D: "Diesel", E: "Elektro", G: "Gas", H: "Hybrid" } as Record<string, string>)[code]
    ?? `Kraftstoffcode ${code}`;
}

function toVehicleResult(record: Prisma.HsnTsnKeyGetPayload<{
  include: {
    stockSnapshots: { include: { sourceFile: { include: { dataSource: true } } } };
    externalRecords: true;
  };
}>): VehicleResult | null {
  const snapshot = record.stockSnapshots[0];
  if (!snapshot) return null;
  const reference = record.externalRecords[0];
  const raw = reference?.raw;
  const assignedAtValue = raw && typeof raw === "object" && !Array.isArray(raw) && typeof raw.assignedAt === "string"
    ? raw.assignedAt
    : null;
  const assignedAt = assignedAtValue ? new Date(assignedAtValue) : null;
  const referenceYear = assignedAt && !Number.isNaN(assignedAt.valueOf()) ? assignedAt.getUTCFullYear() : undefined;
  const fuel = reference?.engine?.split(" · ")[0];
  const displacementCc = raw && typeof raw === "object" && !Array.isArray(raw) && typeof raw.displacementCc === "number"
    ? raw.displacementCc
    : undefined;
  const drivenAxleCount = raw && typeof raw === "object" && !Array.isArray(raw) && typeof raw.drivenAxleCount === "number"
    ? raw.drivenAxleCount
    : undefined;
  return {
    slug: `kba-${record.hsn.toLocaleLowerCase()}-${record.tsn.toLocaleLowerCase()}`,
    manufacturer: record.manufacturerName,
    family: record.tradeName ?? `${record.hsn}/${record.tsn}`,
    generation: "KBA-Typenschlüssel",
    name: record.tradeName ?? `${record.hsn}/${record.tsn}`,
    productionPeriod: assignedAt ? `TSN zugeteilt ${formatDate(assignedAt)}` : "Baujahre noch nicht zugeordnet",
    facelift: "Nicht zutreffend",
    engine: reference?.engine ?? "Technikdaten noch nicht zugeordnet",
    powerKw: reference?.powerKw ?? 0,
    drivetrain: reference?.drivetrain ?? "Nicht in KBA FZ 6 enthalten",
    reportingDate: formatDate(snapshot.reportingDate),
    source: `${snapshot.sourceFile.dataSource.name}, amtlicher Gesamtbestand`,
    keys: [{ hsn: record.hsn, tsn: record.tsn, tradeName: record.tradeName ?? "Ohne Handelsnamen", stock: snapshot.count, confidence: "Hoch", included: true }],
    registrations: [],
    stockHistory: record.stockSnapshots.map((item) => ({ year: item.reportingDate.getUTCFullYear(), count: item.count })).sort((a, b) => a.year - b.year),
    stock: snapshot.count,
    keyCount: 1,
    uncertainKeyCount: 0,
    keyType: "HSN_TSN",
    referenceYear,
    fuel,
    displacementCc,
    drivenAxleCount,
  };
}

type Fz2Record = Prisma.Fz2VehicleSnapshotGetPayload<{
  include: { sourceFile: { include: { dataSource: true } } };
}>;

function toFz2VehicleResult(record: Fz2Record, history: Array<{ reportingDate: Date; count: number }> = []): VehicleResult {
  return {
    slug: `kba-fz2-${record.id}`,
    manufacturer: record.manufacturerName,
    family: record.tradeName,
    generation: "KBA-FZ-2-Typ",
    name: record.tradeName,
    productionPeriod: "Keine Baujahre in KBA FZ 2",
    facelift: "Nicht zutreffend",
    engine: `${fuelName(record.fuelCode)}${record.bodyCode ? ` · Aufbau ${record.bodyCode}` : ""}`,
    powerKw: record.powerKw,
    drivetrain: record.allWheel ? "Allrad-Kennzeichen" : "Ohne Allrad-Kennzeichen",
    reportingDate: formatDate(record.reportingDate),
    source: `${record.sourceFile.dataSource.name}, amtlicher Gesamtbestand`,
    keys: [{ hsn: "–", tsn: record.tsn, tradeName: record.tradeName, stock: record.count, confidence: "Hoch", included: true }],
    registrations: [],
    stockHistory: history.map((item) => ({ year: item.reportingDate.getUTCFullYear(), count: item.count })).sort((a, b) => a.year - b.year),
    stock: record.count,
    keyCount: 1,
    uncertainKeyCount: 0,
    keyType: "TSN",
    fuel: fuelName(record.fuelCode),
  };
}

function keyQuery(query: string): { hsn: string; tsn: string } | null {
  const match = query.trim().toUpperCase().match(/^(?:HSN\s*)?(\d{4})[\s/,:-]+(?:TSN\s*)?([A-Z0-9]{3})$/);
  return match ? { hsn: match[1], tsn: match[2] } : null;
}

function matchesCompactQuery(tradeName: string | null, tokens: string[]): boolean {
  const spacedModel = tokens.length === 2 && /^[a-z]{1,3}$/i.test(tokens[0]) && /^\d{2,4}$/.test(tokens[1])
    ? tokens.join("")
    : null;
  const compactModel = tokens.length === 1 && splitCompactVehicleToken(tokens[0]).length > 1
    ? tokens[0]
    : spacedModel;
  if (!compactModel) return true;
  const modelParts = splitCompactVehicleToken(compactModel);
  return new RegExp(`(?:^|[^a-z0-9])${modelParts.join("\\s*")}(?:$|[^a-z0-9])`, "i").test(tradeName ?? "");
}

function newestReferenceFirst(left: VehicleResult, right: VehicleResult): number {
  const yearDifference = (right.referenceYear ?? -Infinity) - (left.referenceYear ?? -Infinity);
  if (yearDifference) return yearDifference;
  return left.name.localeCompare(right.name, "de") || left.keys[0].tsn.localeCompare(right.keys[0].tsn, "de");
}

function kbaTokenCondition(token: string, expandCompact: boolean): Prisma.HsnTsnKeyWhereInput {
  const parts = expandCompact ? splitCompactVehicleToken(token) : [token];
  if (parts.length > 1) {
    return {
      OR: [token, parts.join(" "), parts.join("-")].map((spelling) => ({
        tradeName: { contains: spelling, mode: "insensitive" },
      })),
    };
  }
  return {
    AND: parts.map((part) => ({
      OR: [
        { manufacturerName: { contains: part, mode: "insensitive" } },
        { tradeName: { contains: part, mode: "insensitive" } },
      ],
    })),
  };
}

function fz2TokenCondition(token: string, expandCompact: boolean): Prisma.Fz2VehicleSnapshotWhereInput {
  const parts = expandCompact ? splitCompactVehicleToken(token) : [token];
  if (parts.length > 1) {
    return {
      OR: [token, parts.join(" "), parts.join("-")].map((spelling) => ({
        tradeName: { contains: spelling, mode: "insensitive" },
      })),
    };
  }
  return {
    AND: parts.map((part) => ({
      OR: [
        { manufacturerName: { contains: part, mode: "insensitive" } },
        { tradeName: { contains: part, mode: "insensitive" } },
        { tsn: { equals: part, mode: "insensitive" } },
      ],
    })),
  };
}

export interface VehicleSearchOutcome {
  results: VehicleResult[];
  facets: { years: number[]; manufacturers: string[]; referenceDecades: number[]; fuels: string[] };
  selectedYear: number;
}

async function availableYears(): Promise<number[]> {
  const [fz6, fz2] = await Promise.all([
    prisma.stockSnapshot.findMany({ distinct: ["reportingDate"], select: { reportingDate: true } }),
    prisma.fz2VehicleSnapshot.findMany({ distinct: ["reportingDate"], select: { reportingDate: true } }),
  ]);
  return [...new Set([...fz6, ...fz2].map((item) => item.reportingDate.getUTCFullYear()))].sort((a, b) => b - a);
}

async function findKbaRecords(tokens: string[], key: { hsn: string; tsn: string } | null, year: number, expandCompact = false) {
  return prisma.hsnTsnKey.findMany({
    where: {
      ...(key ? key : { AND: tokens.map((token) => kbaTokenCondition(token, expandCompact)) }),
      stockSnapshots: { some: { reportingDate: yearRange(year) } },
    },
    include: {
      stockSnapshots: {
        where: { reportingDate: yearRange(year) },
        orderBy: { reportingDate: "desc" },
        take: 1,
        include: { sourceFile: { include: { dataSource: true } } },
      },
      externalRecords: { where: { dataSource: { key: "kba-sv42" } }, take: 1 },
    },
    orderBy: [{ manufacturerName: "asc" }, { tradeName: "asc" }, { hsn: "asc" }, { tsn: "asc" }],
    take: 100,
  });
}

async function findFz2Records(tokens: string[], year: number, expandCompact = false) {
  return prisma.fz2VehicleSnapshot.findMany({
    where: { reportingDate: yearRange(year), AND: tokens.map((token) => fz2TokenCondition(token, expandCompact)) },
    include: { sourceFile: { include: { dataSource: true } } },
    orderBy: [{ manufacturerName: "asc" }, { tradeName: "asc" }, { tsn: "asc" }],
    take: 100,
  });
}

function mergeRecordsById<T extends { id: number }>(...recordSets: T[][]): T[] {
  return [...new Map(recordSets.flat().map((record) => [record.id, record])).values()];
}

async function findKbaSearchRecords(tokens: string[], key: { hsn: string; tsn: string } | null, year: number) {
  const direct = await findKbaRecords(tokens, key, year);
  if (key || tokens.length !== 1 || splitCompactVehicleToken(tokens[0]).length === 1) return direct;
  return mergeRecordsById(direct, await findKbaRecords(tokens, null, year, true));
}

async function findFz2SearchRecords(tokens: string[], year: number) {
  const direct = await findFz2Records(tokens, year);
  if (tokens.length !== 1 || splitCompactVehicleToken(tokens[0]).length === 1) return direct;
  return mergeRecordsById(direct, await findFz2Records(tokens, year, true));
}

async function findHistoricCandidateYears(tokens: string[]): Promise<number[]> {
  if (!tokens.length) return [];
  const conditions = [tokens].flatMap<Prisma.Fz2VehicleSnapshotWhereInput>((candidateTokens) => {
    const variants: Prisma.Fz2VehicleSnapshotWhereInput[] = [
      { AND: candidateTokens.map((token) => fz2TokenCondition(token, false)) },
    ];
    if (candidateTokens.length === 1 && splitCompactVehicleToken(candidateTokens[0]).length > 1) {
      variants.push({ AND: candidateTokens.map((token) => fz2TokenCondition(token, true)) });
    }
    return variants;
  });
  const matches = await prisma.fz2VehicleSnapshot.findMany({
    where: { OR: conditions },
    distinct: ["reportingDate"],
    select: { reportingDate: true },
    orderBy: { reportingDate: "desc" },
  });
  return matches.map((match) => match.reportingDate.getUTCFullYear());
}

function matchesTechnicalIntent(result: VehicleResult, intent: TechnicalSearchIntent): boolean {
  if (intent.fuel && result.fuel !== intent.fuel) return false;
  if (intent.powerKw !== undefined && result.powerKw !== intent.powerKw) return false;
  if (intent.displacementCc !== undefined) {
    if (result.displacementCc === undefined || Math.abs(result.displacementCc - intent.displacementCc) > 120) return false;
  }
  return true;
}

export async function searchVehicles(query: string, filters: SearchFilters = {}): Promise<VehicleSearchOutcome> {
  const years = await availableYears();
  const hasExplicitYear = Boolean(filters.year?.trim());
  const requestedYear = Number(filters.year);
  const selectedYear = years.includes(requestedYear) ? requestedYear : (years[0] ?? new Date().getUTCFullYear());
  const key = keyQuery(query);
  const intent = parseTechnicalSearch(query);
  const tokens = intent.textTokens.slice(0, 6);
  let results: VehicleResult[];

  if (selectedYear >= 2019) {
    const records = await findKbaSearchRecords(tokens, key, selectedYear);
    results = records
      .filter((record) => matchesCompactQuery(record.tradeName, tokens))
      .map(toVehicleResult)
      .filter((result): result is VehicleResult => result !== null)
      .filter((result) => matchesTechnicalIntent(result, intent));
  } else {
    const records = key ? [] : await findFz2SearchRecords(tokens, selectedYear);
    results = records
      .filter((record) => matchesCompactQuery(record.tradeName, tokens))
      .map((record) => toFz2VehicleResult(record))
      .filter((result) => matchesTechnicalIntent(result, intent));
  }

  const manufacturers = [...new Set(results.map((result) => result.manufacturer))].sort((a, b) => a.localeCompare(b, "de"));
  const referenceDecades = [...new Set(results.flatMap((result) => result.referenceYear ? [Math.floor(result.referenceYear / 10) * 10] : []))].sort((a, b) => a - b);
  const fuels = [...new Set(results.flatMap((result) => result.fuel ? [result.fuel] : []))].sort((a, b) => a.localeCompare(b, "de"));
  const minimumStock = Math.max(0, Number(filters.minimumStock) || 0);
  if (filters.manufacturer) results = results.filter((result) => result.manufacturer === filters.manufacturer);
  if (minimumStock) results = results.filter((result) => result.stock >= minimumStock);
  if (filters.referenceDecade) {
    const decade = Number(filters.referenceDecade);
    results = results.filter((result) => result.referenceYear !== undefined && result.referenceYear >= decade && result.referenceYear < decade + 10);
  }
  if (filters.fuel) results = results.filter((result) => result.fuel === filters.fuel);
  results.sort(newestReferenceFirst);
  if (!results.length && !hasExplicitYear && !key) {
    for (const fallbackYear of await findHistoricCandidateYears(tokens)) {
      const fallback = await searchVehicles(query, { ...filters, year: String(fallbackYear) });
      if (fallback.results.length) return fallback;
    }
  }
  if (!results.length && process.env.DEMO_DATA_FALLBACK === "true" && years.length === 0) results = searchDemoVehicles(query, filters);
  return { results, facets: { years, manufacturers, referenceDecades, fuels }, selectedYear };
}

export async function getVehicle(slug: string): Promise<VehicleResult | null> {
  const fz2Match = slug.match(/^kba-fz2-(\d+)$/);
  if (fz2Match) {
    const record = await prisma.fz2VehicleSnapshot.findUnique({
      where: { id: Number(fz2Match[1]) },
      include: { sourceFile: { include: { dataSource: true } } },
    });
    if (!record) return null;
    const history = await prisma.fz2VehicleSnapshot.findMany({
      where: { identityKey: record.identityKey },
      select: { reportingDate: true, count: true },
      orderBy: { reportingDate: "asc" },
    });
    return toFz2VehicleResult(record, history);
  }

  const match = slug.match(/^kba-(\d{4})-([a-z0-9]{3})$/i);
  if (!match) return null;
  const record = await prisma.hsnTsnKey.findUnique({
    where: { hsn_tsn: { hsn: match[1], tsn: match[2].toUpperCase() } },
    include: {
      stockSnapshots: { orderBy: { reportingDate: "desc" }, include: { sourceFile: { include: { dataSource: true } } } },
      externalRecords: { where: { dataSource: { key: "kba-sv42" } }, take: 1 },
    },
  });
  return record ? toVehicleResult(record) : null;
}

export async function getLatestStockStatus() {
  const latestSnapshot = await prisma.stockSnapshot.findFirst({ orderBy: { reportingDate: "desc" }, select: { reportingDate: true } });
  if (!latestSnapshot) return null;
  const latest = await prisma.stockSnapshot.aggregate({
    where: { reportingDate: latestSnapshot.reportingDate },
    _count: true,
    _sum: { count: true },
  });
  return { reportingDate: formatDate(latestSnapshot.reportingDate), keyCount: latest._count, totalStock: latest._sum.count ?? 0 };
}
