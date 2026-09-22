import { readFile } from "node:fs/promises";
import { relative, resolve } from "node:path";
import { ImportStatus, SourceKind } from "@prisma/client";
import { prisma } from "../src/db/prisma";
import { inspectReferenceCsv } from "../src/lib/import/reference-file";

const sourcePath = process.argv[2];
const providerKey = process.argv[3]?.trim().toLocaleLowerCase();

if (!sourcePath || !providerKey) {
  console.error("Verwendung: npm run import:reference -- <referenz.csv> <provider-key>");
  process.exit(1);
}

async function main() {
  try {
    const absolutePath = resolve(sourcePath!);
    const file = await readFile(absolutePath);
    const report = inspectReferenceCsv(file, providerKey!);
    const source = await prisma.dataSource.upsert({
      where: { key: `vehicle-reference-${providerKey}` },
      update: {},
      create: {
        key: `vehicle-reference-${providerKey}`,
        name: `Fahrzeugreferenz ${providerKey!.toUpperCase()}`,
        kind: SourceKind.VEHICLE_REFERENCE,
        licenseNote: "Nutzung nur im Umfang des jeweiligen Providervertrags.",
        isOfficial: false,
      },
    });
    const existingFile = await prisma.sourceFile.findUnique({
      where: { sha256: report.checksum },
      include: { importRuns: { where: { status: ImportStatus.PUBLISHED }, take: 1 } },
    });
    if (existingFile?.importRuns.length) {
      console.log(JSON.stringify({ status: "already-published", rowCount: report.rows.length }, null, 2));
      return;
    }

    const sourceFile = existingFile ?? await prisma.sourceFile.create({
      data: {
        dataSourceId: source.id,
        name: absolutePath.split("/").at(-1) ?? "vehicle-reference.csv",
        sha256: report.checksum,
        archivedPath: relative(process.cwd(), absolutePath),
      },
    });
    const run = await prisma.importRun.create({
      data: {
        sourceFileId: sourceFile.id,
        status: ImportStatus.VALIDATED,
        report: { checksum: report.checksum, rowCount: report.rows.length },
      },
    });

    try {
      const keys = await prisma.hsnTsnKey.findMany({ select: { id: true, hsn: true, tsn: true } });
      const keyIds = new Map(keys.map((key) => [`${key.hsn}/${key.tsn}`, key.id]));
      const matched = report.rows.filter((row) => keyIds.has(`${row.hsn}/${row.tsn}`)).length;

      await prisma.$transaction(async (tx) => {
        await tx.externalVehicleRecord.deleteMany({ where: { dataSourceId: source.id } });
        const chunkSize = 5_000;
        for (let index = 0; index < report.rows.length; index += chunkSize) {
          await tx.externalVehicleRecord.createMany({
            data: report.rows.slice(index, index + chunkSize).map((row) => ({
              dataSourceId: source.id,
              sourceFileId: sourceFile.id,
              externalId: row.externalId,
              hsnTsnKeyId: keyIds.get(`${row.hsn}/${row.tsn}`),
              manufacturer: row.manufacturer,
              model: row.model,
              generationCode: row.generationCode,
              productionStart: row.productionStart,
              productionEnd: row.productionEnd,
              powerKw: row.powerKw,
              engine: row.engine,
              drivetrain: row.drivetrain,
              raw: {
                providerKey: row.providerKey,
                externalId: row.externalId,
                hsn: row.hsn,
                tsn: row.tsn,
                manufacturer: row.manufacturer,
                model: row.model,
                generationCode: row.generationCode ?? null,
                productionStart: row.productionStart?.toISOString() ?? null,
                productionEnd: row.productionEnd?.toISOString() ?? null,
                powerKw: row.powerKw ?? null,
                engine: row.engine ?? null,
                drivetrain: row.drivetrain ?? null,
              },
            })),
          });
        }
        await tx.importRun.update({
          where: { id: run.id },
          data: {
            status: ImportStatus.PUBLISHED,
            publishedAt: new Date(),
            report: {
              checksum: report.checksum,
              rowCount: report.rows.length,
              matchedKbaKeys: matched,
              unmatchedKbaKeys: report.rows.length - matched,
            },
          },
        });
      }, { maxWait: 10_000, timeout: 120_000 });

      console.log(JSON.stringify({
        status: "published",
        rowCount: report.rows.length,
        matchedKbaKeys: matched,
        unmatchedKbaKeys: report.rows.length - matched,
      }, null, 2));
    } catch (error) {
      await prisma.importRun.update({
        where: { id: run.id },
        data: {
          status: ImportStatus.FAILED,
          report: { error: error instanceof Error ? error.message : "Unbekannter Importfehler" },
        },
      });
      throw error;
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unbekannter Importfehler");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
