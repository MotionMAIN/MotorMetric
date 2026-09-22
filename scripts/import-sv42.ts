import { execFile } from "node:child_process";
import { mkdtemp, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { ImportStatus, SourceKind } from "@prisma/client";
import { prisma } from "../src/db/prisma";
import { inspectSv42Pdf } from "../src/lib/import/kba-sv42";

const run = promisify(execFile);
const sourcePath = process.argv[2];
const SOURCE_URL = "https://www.kba.de/SharedDocs/Downloads/DE/SV/sv42_pdf.pdf";
if (!sourcePath) throw new Error("Verwendung: npm run import:sv42 -- <sv42.pdf>");

function fuelName(code: string) {
  return ({ "0001": "Benzin", "0002": "Diesel", "0004": "Elektro" } as Record<string, string>)[code] ?? `Kraftstoffcode ${code}`;
}

async function main() {
  const absolutePath = resolve(sourcePath!);
  const temporaryDirectory = await mkdtemp(join(tmpdir(), "bestandfinder-sv42-"));
  try {
    const textPath = join(temporaryDirectory, "sv42.txt");
    await run(process.env.PDFTOTEXT_PATH ?? "pdftotext", ["-layout", absolutePath, textPath]);
    const report = await inspectSv42Pdf(absolutePath, textPath);
    const source = await prisma.dataSource.upsert({
      where: { key: "kba-sv42" },
      update: { homepageUrl: SOURCE_URL },
      create: {
        key: "kba-sv42",
        name: "KBA SV 4.2",
        kind: SourceKind.VEHICLE_REFERENCE,
        homepageUrl: SOURCE_URL,
        licenseNote: "KBA: Vervielfältigung und Verbreitung nur mit vorheriger Zustimmung; vor öffentlichem Betrieb klären.",
        isOfficial: true,
      },
    });
    const existing = await prisma.sourceFile.findUnique({ where: { sha256: report.checksum } });
    const sourceFile = existing ?? await prisma.sourceFile.create({
      data: {
        dataSourceId: source.id,
        name: basename(absolutePath),
        sha256: report.checksum,
        sourceUrl: SOURCE_URL,
        reportingDate: new Date(Date.UTC(2026, 7, 15)),
        archivedPath: relative(process.cwd(), absolutePath),
      },
    });
    const importRun = await prisma.importRun.create({
      data: { sourceFileId: sourceFile.id, status: ImportStatus.VALIDATED, report: { rowCount: report.rows.length } },
    });
    const keys = await prisma.hsnTsnKey.findMany({ select: { id: true, hsn: true, tsn: true } });
    const keyIds = new Map(keys.map((key) => [`${key.hsn}/${key.tsn}`, key.id]));
    await prisma.$transaction(async (tx) => {
      await tx.externalVehicleRecord.deleteMany({ where: { dataSourceId: source.id } });
      const chunkSize = 2_000;
      for (let index = 0; index < report.rows.length; index += chunkSize) {
        await tx.externalVehicleRecord.createMany({
          data: report.rows.slice(index, index + chunkSize).map((row) => ({
            dataSourceId: source.id,
            sourceFileId: sourceFile.id,
            externalId: `${row.hsn}/${row.tsn}`,
            hsnTsnKeyId: keyIds.get(`${row.hsn}/${row.tsn}`),
            manufacturer: row.manufacturer,
            model: row.tradeName,
            powerKw: row.powerKw,
            engine: `${fuelName(row.fuelCode)} · ${row.displacementCc.toLocaleString("de-DE")} cm³`,
            drivetrain: row.drivenAxleCount > 1 ? `${row.drivenAxleCount} Antriebsachsen` : "1 Antriebsachse",
            raw: {
              assignedAt: row.assignedAt.toISOString(),
              brand: row.brand,
              vehicleClass: row.vehicleClass,
              bodyCode: row.bodyCode,
              fuelCode: row.fuelCode,
              displacementCc: row.displacementCc,
              axleCount: row.axleCount,
              drivenAxleCount: row.drivenAxleCount,
              seatCount: row.seatCount,
              grossWeightKg: row.grossWeightKg,
            },
          })),
        });
      }
      await tx.importRun.update({ where: { id: importRun.id }, data: { status: ImportStatus.PUBLISHED, publishedAt: new Date() } });
    }, { maxWait: 10_000, timeout: 120_000 });
    console.log(JSON.stringify({ status: "published", rowCount: report.rows.length, linkedKeys: report.rows.filter((row) => keyIds.has(`${row.hsn}/${row.tsn}`)).length }, null, 2));
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
    await prisma.$disconnect();
  }
}

void main();
