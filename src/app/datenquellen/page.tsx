import { prisma } from "@/db/prisma";

export const dynamic = "force-dynamic";

export default async function DataSources() {
  const importedYears = await prisma.stockSnapshot.groupBy({
    by: ["reportingDate"],
    _count: true,
    _sum: { count: true },
    orderBy: { reportingDate: "asc" },
  });
  const historicalYears = await prisma.fz2VehicleSnapshot.groupBy({
    by: ["reportingDate"],
    _count: true,
    orderBy: { reportingDate: "asc" },
  });
  const technicalTypes = await prisma.externalVehicleRecord.count({ where: { dataSource: { key: "kba-sv42" } } });

  return (
    <main className="content-page">
      <div className="shell"><article>
        <h1>Woher die Daten kommen</h1>
        <p>MotorMetric verbindet amtliche Bestandszahlen mit technischen Fahrzeugreferenzen. Beide Ebenen bleiben getrennt versioniert, damit klar ist, welche Quelle welche Aussage trägt.</p>
        <h2>Amtlicher Fahrzeugbestand</h2>
        <p>Bestandszahlen stammen aus den Veröffentlichungen des Kraftfahrt-Bundesamtes. Maßgeblich ist die Kombination aus HSN und TSN am ausgewiesenen Bestandsstichtag. Die Quelldatei und ihre Prüfsumme werden zu jedem Import archiviert.</p>
        <ul className="source-list">
          <li><strong>KBA FZ 6</strong><br />Bestand an Kraftfahrzeugen nach Hersteller und Typ zum 1. Januar eines Berichtsjahres. Lokal importiert: {importedYears.map((item) => item.reportingDate.getUTCFullYear()).join(", ") || "noch keine Jahrgänge"}.<br /><a href="https://data.gov.de/suche/daten/fz-6-2019-bestand-an-kraftfahrzeugen-und-kraftfahrzeuganhangern-nach-hersteller-und-typen-am-1-?ids=fa155491-1a65-4768-b0ce-9e1c07b6df0b">Datensatz und Lizenz bei GovData öffnen</a></li>
          <li><strong>KBA Sonderheft 4 / FZ 2</strong><br />Historische Pkw-Typzeilen mit TSN und technischen Merkmalen. Lokal importiert: {historicalYears.map((item) => item.reportingDate.getUTCFullYear()).join(", ") || "noch keine Jahrgänge"}. Eine zeilenbezogene HSN wird nicht durchgehend veröffentlicht. Vollständige digitale Typhefte vor 2005 sind im bislang erschlossenen KBA-Webarchiv nicht verfügbar; fehlende Jahre werden nicht geschätzt.<br /><a href="https://web.archive.org/web/20060318050607id_/https://www.kba.de/Abt3_neu/KraftfahrzeugStatistiken/Reihen/Reihe2_Sonderheft4_2005.pdf">Amtliches Sonderheft 2005 im Webarchiv öffnen</a></li>
          <li><strong>KBA SV 4.2</strong><br />Amtliche Typreferenz mit TSN-Zuteilungsdatum, Leistung, Hubraum, Kraftstoff-, Aufbau-, Achs- und Sitzdaten. Lokal importiert: {new Intl.NumberFormat("de-DE").format(technicalTypes)} Typen. Das Zuteilungsdatum ist kein Baujahr.<br /><a href="https://www.kba.de/SharedDocs/Downloads/DE/SV/sv42_pdf.pdf">Aktuelles Verzeichnis beim KBA öffnen</a></li>
          <li><strong>KBA FZ 4</strong><br />Historische Neuzulassungen. Diese Zahlen werden niemals als heutiger Bestand ausgegeben.</li>
        </ul>
        <h2>Technische Fahrzeugreferenz</h2>
        <p>SV 4.2 liefert bereits belastbare technische Typmerkmale. Baureihe, Modellgeneration, Facelift und Produktionszeitraum sind darin nicht ausreichend enthalten; dafür wird weiterhin ein separater lizenzierter Fahrzeugdatenstamm benötigt.</p>
        <ul className="source-list">
          <li><strong>DAT / SilverDAT Europa-Code</strong><br />Enthält herstellerübergreifende Fahrzeugdefinitionen, nationale Codes wie HSN/TSN und Produktionszeiträume.<br /><a href="https://www.dat.de/fileadmin/de/download/rechtliches/produktbeschreibung-silverdat-3-pro.pdf">Produktbeschreibung öffnen</a></li>
          <li><strong>TecAlliance / TecDoc</strong><br />Alternative Fahrzeugreferenz mit technischen Typen und einer Zuordnung deutscher KBA-Nummern zu TecDoc-Fahrzeugtypen.<br /><a href="https://www.tecalliance.net/products/cards/tecdoc-catalogue">TecDoc ansehen</a></li>
        </ul>
        <h2>Regel für Zusammenführungen</h2>
        <p>Ein exakter Schlüssel-Treffer ist nur ein Vorschlag. Erst wenn genau eine fachlich passende Zuordnung vorliegt, wird sie aktiv. Mehrdeutige oder widersprüchliche Datensätze landen in einer Prüfliste und werden nicht automatisch summiert.</p>
        <p><strong>Abgrenzung:</strong> Bestandsstichtage und TSN-Zuteilungsdaten sind keine Baujahre. Produktionszeiträume werden erst aus der separat lizenzierten Fahrzeugreferenz übernommen.</p>
      </article></div>
    </main>
  );
}
