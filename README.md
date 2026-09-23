<div align="center">
  <img src="./public/motormetric-icon.png" width="88" height="88" alt="MotorMetric Logo" />
  <h1>MotorMetric</h1>
  <p>Amtliche Fahrzeugbestände verständlich durchsuchen.</p>
  <p>
    <a href="https://motormetric.de"><strong>Website öffnen</strong></a>
    ·
    <a href="./docs/DATA_SOURCES.md">Datenquellen</a>
    ·
    <a href="./docs/HISTORICAL_ARCHIVE.md">Archivstatus</a>
  </p>
</div>

MotorMetric ist ein unabhängiges Recherchewerkzeug für deutsche KBA-Fahrzeugdaten. Die Anwendung macht amtliche Bestandszahlen über geläufige Modellnamen sowie vollständige HSN/TSN-Kombinationen auffindbar und hält jede angezeigte Summe bis zu den zugrunde liegenden Schlüsselzeilen nachvollziehbar.

> **Live:** [motormetric.de](https://motormetric.de)

## Funktionen

- Fehlertolerante Modellsuche, beispielsweise `CL500`, `CL 500`, `S500` oder `E420CDI`
- Exakte Suche nach vollständiger HSN/TSN, beispielsweise `0999 AFT`
- Aktuelle KBA-Bestände von 2019 bis 2026
- Historische KBA-Typbestände von 2005 bis 2018
- Technische Merkmale aus KBA SV 4.2, unter anderem Leistung, Hubraum und Kraftstoffart
- Filter nach Datenstand, Hersteller, Mindestbestand, TSN-Zuteilung und Kraftstoff
- Detailansichten mit Schlüsselnummern, Quellen, Stichtag und Bestandsentwicklung
- Responsive Oberfläche für Desktop und Mobilgeräte

Interne Baureihencodes wie `W220`, `C216` oder `E46` sind bewusst keine unterstützte Suchsprache. Eine TSN allein ist nicht eindeutig; erst die Kombination aus HSN und TSN bezeichnet einen konkreten KBA-Fahrzeugtyp.

## Datenstand und Grenzen

| Datenquelle | Abdeckung | Verwendung |
| --- | --- | --- |
| KBA FZ 6 | 2019–2026 | Bestand je HSN/TSN und Stichtag |
| KBA Sonderheft 4 / FZ 2 | 2005–2018 | Historische TSN-Typzeilen und Bestände |
| KBA SV 4.2 | aktueller Import | Technische Typmerkmale und TSN-Zuteilungsdatum |
| KBA FZ 4 | getrennte Datenart | Historische Neuzulassungen |

Bestandsstichtag, TSN-Zuteilungsdatum und Baujahr sind unterschiedliche Angaben. MotorMetric leitet deshalb keine Baujahre oder Modellgenerationen aus ungeeigneten KBA-Feldern ab. Vollständige maschinenlesbare Typbestände vor 2005 konnten bislang nicht belastbar beschafft werden und werden nicht geschätzt.

Ausführliche Informationen stehen in [Datenquellen und Merge-Strategie](docs/DATA_SOURCES.md) sowie im [historischen Archivstatus](docs/HISTORICAL_ARCHIVE.md).

## Technischer Aufbau

- Next.js und TypeScript
- PostgreSQL
- Prisma ORM
- Docker und Docker Compose
- Vitest
- Mittwald Container Hosting

Die KBA-Bestände und technische Referenzdaten werden getrennt gespeichert. Nur belegte Zuordnungen dürfen in aggregierte Modellsummen einfließen; mehrdeutige Zuordnungen bleiben separat sichtbar.

## Lokal entwickeln

Voraussetzungen sind Node.js 22+, Docker und Docker Compose.

```bash
git clone https://github.com/MotionMAIN/MotorMetrics.git
cd MotorMetrics
cp .env.example .env
npm ci
docker compose up -d database
npm run db:migrate
npm run dev
```

Die Anwendung ist anschließend unter [localhost:3000](http://localhost:3000) erreichbar. Ohne importierte KBA-Daten verwendet die lokale Entwicklungsumgebung die als solche gekennzeichneten Demonstrationsdaten.

Alternativ startet der komplette Stack einschließlich Migrationen in Docker:

```bash
docker compose up --build
```

PostgreSQL persistiert im Volume `postgres_data`. Beim lokalen Einzelstart ist die Datenbank ausschließlich an `127.0.0.1:5432` gebunden.

## KBA-Daten importieren

Originaldateien werden lokal unter `data/raw/kba` abgelegt und sind nicht Bestandteil des Repositories.

```bash
# FZ 6, Beispieljahr 2026
npm run import:stock -- data/raw/kba/fz6_2026.xlsx

# Historische FZ-2-Datei
PDFTOTEXT_PATH=/pfad/zu/pdftotext npm run import:fz2 -- data/raw/kba/fz2/fz2_2005.pdf

# Technische KBA-Typenliste
PDFTOTEXT_PATH=/pfad/zu/pdftotext npm run import:sv42 -- data/raw/kba/sv42.pdf
```

PDF-Importe benötigen Poppler (`pdftotext`), ältere Tabellen gegebenenfalls LibreOffice (`soffice`). Die Importe prüfen Dateiformat und Prüfsumme, bewahren führende Nullen und veröffentlichen jeden Jahrgang atomar.

Eine lizenzierte technische Fahrzeugreferenz kann separat als UTF-8-Semikolon-CSV importiert werden:

```bash
npm run import:reference -- data/raw/reference/provider-export.csv dat
```

## Qualitätssicherung

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Die Tests decken Suchnormalisierung, HSN/TSN-Verarbeitung, historische KBA-Layouts, Importvalidierung, führende Nullen und den Mehrquellen-Merge ab.

## Deployment

Das mehrstufige [`Dockerfile`](Dockerfile) erzeugt eine Next.js-Standalone-Anwendung mit unprivilegiertem Laufzeitnutzer. Das Produktionsimage wird als

```text
ghcr.io/motionmain/motormetric:latest
```

bereitgestellt und im Mittwald Container Hosting gemeinsam mit PostgreSQL betrieben. Geheimnisse und Datenbankzugänge werden ausschließlich als Umgebungsvariablen konfiguriert und nicht in das Image eingebaut.

Ein stabiler SemVer-Tag veröffentlicht automatisch die getaggte Version und aktualisiert gleichzeitig `latest`:

```bash
git tag v0.0.1
git push origin v0.0.1
```

Der Workflow akzeptiert ausschließlich Tag-Pushes des Repository-Inhabers `MotionMAIN` und erzeugt anschließend `ghcr.io/motionmain/motormetric:v0.0.1` sowie `ghcr.io/motionmain/motormetric:latest`. Vorabversionen wie `v0.0.2-rc.1` werden bewusst nicht veröffentlicht.

Nach einem erfolgreichen Push zieht Mittwald `latest` für den bereits konfigurierten MotorMetric-Service und erstellt diesen neu. Dafür müssen im GitHub-Repository das Secret `MITTWALD_API_TOKEN` und die Variable `STACK_ID` hinterlegt sein. Der Workflow verändert die Stack-Konfiguration nicht und bricht ab, wenn im Stack nicht genau ein Service dieses Image verwendet.

## Hinweis

MotorMetric ist kein Angebot des Kraftfahrt-Bundesamtes und steht in keiner Verbindung zum KBA. Quellen, Datenstände und methodische Einschränkungen werden innerhalb der Anwendung ausdrücklich ausgewiesen.
