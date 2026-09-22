import { relative, resolve } from "node:path";
import { ImportStatus, Prisma, SourceKind } from "@prisma/client";
import { prisma } from "../src/db/prisma";
import { inspectKbaFz6Workbook } from "../src/lib/import/kba-fz6";

const KBA_SOURCE_URL = "https://www.kba.de/DE/Statistik/Produktkatalog/produkte/Fahrzeuge/fz6_b_uebersicht.html";
const sourcePath = process.argv[2];

if (!sourcePath) {
  console.error("Verwendung: npm run import:stock -- <pfad-zur-kba-fz6.xlsx>");
  process.exit(1);
}

async function upsertKeys(
  tx: Prisma.TransactionClient,
  rows: Awaited<ReturnType<typeof inspectKbaFz6Workbook>>["rows"],
) {
  const chunkSize = 750;
  for (let index = 0; index < rows.length; index += chunkSize) {
    const values = rows.slice(index, index + chunkSize).map((row) => Prisma.sql`(
      ${row.hsn}, ${row.tsn}, ${row.manufacturerName}, ${row.tradeName}
    )`);
    await tx.$executeRaw(Prisma.sql`
      INSERT INTO "HsnTsnKey" ("hsn", "tsn", "manufacturerName", "tradeName")
      VALUES ${Prisma.join(values)}
      ON CONFLICT ("hsn", "tsn") DO UPDATE SET
        "manufacturerName" = EXCLUDED."manufacturerName",
        "tradeName" = EXCLUDED."tradeName"
    `);
  }
}

async function importWorkbook(path: string) {
  const absolutePath = resolve(path);
  const report = await inspectKbaFz6Workbook(absolutePath);
  const source = await prisma.dataSource.upsert({
    where: { key: "kba-fz6" },
    update: { homepageUrl: KBA_SOURCE_URL },
    create: {
      key: "kba-fz6",
      name: "KBA FZ 6",
      kind: SourceKind.KBA_STOCK,
      homepageUrl: KBA_SOURCE_URL,
      licenseNote: "Amtliche Statistik des Kraftfahrt-Bundesamts; Quellenhinweis bei Weiterverwendung erforderlich.",
      isOfficial: true,
    },
  });

  const existingFile = await prisma.sourceFile.findUnique({
    where: { sha256: report.checksum },
    include: { importRuns: { where: { status: ImportStatus.PUBLISHED }, take: 1 } },
  });
  if (existingFile?.importRuns.length) {
    return { status: "already-published", sourceFileId: existingFile.id, report };
  }

  const sourceFile = existingFile ?? await prisma.sourceFile.create({
    data: {
      dataSourceId: source.id,
      name: absolutePath.split("/").at(-1) ?? "fz6.xlsx",
      sha256: report.checksum,
      sourceUrl: KBA_SOURCE_URL,
      reportingDate: report.reportingDate,
      archivedPath: relative(process.cwd(), absolutePath),
    },
  });
  const importRun = await prisma.importRun.create({
    data: {
      sourceFileId: sourceFile.id,
      status: ImportStatus.VALIDATED,
      report: {
        checksum: report.checksum,
        rowCount: report.rows.length,
        totalStock: report.totalStock,
        reportingDate: report.reportingDate.toISOString(),
      },
    },
  });

  try {
    await prisma.$transaction(async (tx) => {
      await upsertKeys(tx, report.rows);
      const keys = await tx.hsnTsnKey.findMany({ select: { id: true, hsn: true, tsn: true } });
      const ids = new Map(keys.map((key) => [`${key.hsn}/${key.tsn}`, key.id]));

      await tx.stockSnapshot.deleteMany({ where: { reportingDate: report.reportingDate } });
      const chunkSize = 5_000;
      for (let index = 0; index < report.rows.length; index += chunkSize) {
        await tx.stockSnapshot.createMany({
          data: report.rows.slice(index, index + chunkSize).map((row) => ({
            hsnTsnKeyId: ids.get(`${row.hsn}/${row.tsn}`)!,
            sourceFileId: sourceFile.id,
            reportingDate: report.reportingDate,
            count: row.stock,
          })),
        });
      }

      await tx.importRun.update({
        where: { id: importRun.id },
        data: { status: ImportStatus.PUBLISHED, publishedAt: new Date() },
      });
    }, { maxWait: 10_000, timeout: 120_000 });
  } catch (error) {
    await prisma.importRun.update({
      where: { id: importRun.id },
      data: {
        status: ImportStatus.FAILED,
        report: {
          checksum: report.checksum,
          rowCount: report.rows.length,
          error: error instanceof Error ? error.message : "Unbekannter Importfehler",
        },
      },
    });
    throw error;
  }

  return { status: "published", sourceFileId: sourceFile.id, report };
}

async function main() {
  try {
    const result = await importWorkbook(sourcePath!);
    console.log(JSON.stringify({
      status: result.status,
      sourceFileId: result.sourceFileId,
      checksum: result.report.checksum,
      reportingDate: result.report.reportingDate.toISOString().slice(0, 10),
      rowCount: result.report.rows.length,
      totalStock: result.report.totalStock,
    }, null, 2));
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unbekannter Importfehler");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
