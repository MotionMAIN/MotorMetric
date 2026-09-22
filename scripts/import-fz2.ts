import { execFile } from "node:child_process";
import { mkdtemp, readdir, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { basename, extname, join, relative, resolve } from "node:path";
import { promisify } from "node:util";
import { ImportStatus, SourceKind } from "@prisma/client";
import { prisma } from "../src/db/prisma";
import { createFz2Report } from "../src/lib/import/kba-fz2";

const run = promisify(execFile);
const PARSER_VERSION = 2;
const KBA_SOURCE_URL = "https://www.kba.de/DE/Statistik/Produktkatalog/produkte/Fahrzeuge/fz2_b_uebersicht.html";
const ARCHIVED_SOURCE_URLS: Record<number, string> = {
  2005: "https://web.archive.org/web/20060318050607id_/https://www.kba.de/Abt3_neu/KraftfahrzeugStatistiken/Reihen/Reihe2_Sonderheft4_2005.pdf",
  2006: "https://web.archive.org/web/20061009052543id_/https://www.kba.de/Abt3_neu/KraftfahrzeugStatistiken/Reihen/Reihe2_Sonderheft4_2006.pdf",
};
const sourcePaths = process.argv.slice(2);

if (sourcePaths.length === 0) {
  console.error("Verwendung: npm run import:fz2 -- <fz2_2005.pdf> ... <fz2_2018.xls>");
  process.exit(1);
}

function yearFromFilename(path: string): number {
  const match = basename(path).match(/(?:19|20)\d{2}/);
  const year = Number(match?.[0]);
  if (year < 1990 || year > 2018) throw new Error(`Kein unterstütztes historisches Jahr 1990–2018 im Dateinamen: ${path}`);
  return year;
}

async function prepareSource(path: string, temporaryDirectory: string): Promise<string> {
  const extension = extname(path).toLowerCase();
  if (extension === ".pdf") {
    const target = join(temporaryDirectory, `${basename(path, extension)}.txt`);
    await run(process.env.PDFTOTEXT_PATH ?? "pdftotext", ["-layout", path, target]);
    return target;
  }
  if (extension === ".xls") {
    await run(process.env.SOFFICE_PATH ?? "soffice", [
      "--headless",
      "--convert-to",
      "xlsx",
      "--outdir",
      temporaryDirectory,
      path,
    ]);
    const candidates = await readdir(temporaryDirectory);
    const converted = candidates.find((candidate) => candidate === `${basename(path, extension)}.xlsx`);
    if (!converted) throw new Error(`LibreOffice hat ${basename(path)} nicht in XLSX umgewandelt.`);
    return join(temporaryDirectory, converted);
  }
  if (extension === ".xlsx") return path;
  throw new Error(`Nicht unterstütztes FZ-2-Format: ${extension}`);
}

async function importSource(path: string) {
  const absolutePath = resolve(path);
  const year = yearFromFilename(absolutePath);
  const sourceUrl = ARCHIVED_SOURCE_URLS[year] ?? KBA_SOURCE_URL;
  const temporaryDirectory = await mkdtemp(join(tmpdir(), `bestandfinder-fz2-${year}-`));
  try {
    const parsedPath = await prepareSource(absolutePath, temporaryDirectory);
    const report = await createFz2Report(absolutePath, parsedPath, year);
    const source = await prisma.dataSource.upsert({
      where: { key: "kba-fz2" },
      update: { homepageUrl: KBA_SOURCE_URL },
      create: {
        key: "kba-fz2",
        name: "KBA FZ 2",
        kind: SourceKind.KBA_STOCK,
        homepageUrl: KBA_SOURCE_URL,
        licenseNote: "Amtliche Statistik des Kraftfahrt-Bundesamts; Quellenhinweis bei Weiterverwendung erforderlich.",
        isOfficial: true,
      },
    });
    const existingFile = await prisma.sourceFile.findUnique({
      where: { sha256: report.checksum },
      include: { importRuns: { where: { status: ImportStatus.PUBLISHED } } },
    });
    const currentImportExists = existingFile?.importRuns.some((run) => (
      typeof run.report === "object"
      && run.report !== null
      && !Array.isArray(run.report)
      && run.report.parserVersion === PARSER_VERSION
    ));
    if (currentImportExists) {
      return { year, status: "already-published", rowCount: report.rows.length, totalStock: report.totalStock };
    }

    const sourceFile = existingFile ?? await prisma.sourceFile.create({
      data: {
        dataSourceId: source.id,
        name: basename(absolutePath),
        sha256: report.checksum,
        sourceUrl,
        reportingDate: report.reportingDate,
        archivedPath: relative(process.cwd(), absolutePath),
      },
    });
    const importRun = await prisma.importRun.create({
      data: {
        sourceFileId: sourceFile.id,
        status: ImportStatus.VALIDATED,
        report: { parserVersion: PARSER_VERSION, year, rowCount: report.rows.length, totalStock: report.totalStock },
      },
    });

    try {
      await prisma.$transaction(async (tx) => {
        await tx.fz2VehicleSnapshot.deleteMany({ where: { reportingDate: report.reportingDate } });
        const chunkSize = 5_000;
        for (let index = 0; index < report.rows.length; index += chunkSize) {
          await tx.fz2VehicleSnapshot.createMany({
            data: report.rows.slice(index, index + chunkSize).map((row) => ({
              sourceFileId: sourceFile.id,
              reportingDate: report.reportingDate,
              identityKey: row.identityKey,
              manufacturerName: row.manufacturerName,
              tradeName: row.tradeName,
              tsn: row.tsn,
              powerKw: row.powerKw,
              fuelCode: row.fuelCode,
              allWheel: row.allWheel,
              bodyCode: row.bodyCode,
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
        data: { status: ImportStatus.FAILED, report: { year, error: error instanceof Error ? error.message : "Unbekannter Importfehler" } },
      });
      throw error;
    }
    return { year, status: "published", rowCount: report.rows.length, totalStock: report.totalStock };
  } finally {
    await rm(temporaryDirectory, { recursive: true, force: true });
  }
}

async function main() {
  try {
    for (const sourcePath of sourcePaths) {
      console.log(JSON.stringify(await importSource(sourcePath)));
    }
  } catch (error) {
    console.error(error instanceof Error ? error.message : "Unbekannter Importfehler");
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

void main();
