# MotorMetric

Öffentliche Fahrzeugsuche für KBA-Bestandsdaten, ergänzt um nachvollziehbare Modell- und Generationszuordnungen.

## Aktueller Stand

Der lokale Entwicklungsstand nutzt echte KBA-Daten von 2005 bis 2026: die archivierten KBA-Sonderhefte für 2005/2006, FZ 2 für 2007–2018, FZ 6 für 2019–2026 und SV 4.2 für technische Typmerkmale. Die Suche zeigt amtliche Einzeltypen, technische Abgrenzungsmerkmale und die jeweilige Bestandsentwicklung. Das TSN-Zuteilungsdatum aus SV 4.2 ist ausdrücklich kein Baujahr; Generation, Modellpflege und Produktionszeitraum folgen erst aus einer dafür lizenzierten Fahrzeugreferenz.

## Lokal starten

```bash
npm install
docker compose up -d database
npm run db:migrate
npm run dev
```

Die Anwendung läuft auf <http://localhost:3000>. PostgreSQL ist lokal nur an `127.0.0.1:5432` gebunden.

## Mit Docker starten

```bash
docker compose up --build
```

Die App ist danach auf <http://localhost:3000> erreichbar. PostgreSQL läuft ausschließlich im Compose-Netz und persistiert in `postgres_data`.

## Datenbank

```bash
cp .env.example .env
npm run db:generate
npx prisma migrate dev --name init
```

Für ein Deployment werden Migrationen vor dem Start mit `npm run db:migrate` ausgeführt. Zugangsdaten gehören im Mittwald Container Hosting in die Umgebungsvariablen, nicht ins Image.

## KBA-Bestände importieren

Die originalen KBA-Dateien werden unverändert unter `data/raw/kba` abgelegt und direkt eingelesen:

```bash
npm run import:stock -- data/raw/kba/fz6_2019.xlsx
npm run import:stock -- data/raw/kba/fz6_2020.xlsx
# entsprechend bis fz6_2026.xlsx
```

Der Import erkennt beide historischen KBA-Tabellenlayouts, berechnet SHA-256, bewahrt führende Nullen und veröffentlicht einen Jahrgang atomar. Identisch bezeichnete amtliche Doppelzeilen werden summiert; widersprüchliche Schlüssel brechen den Import ab. Derselbe Dateistand kann ohne Doppelimport erneut ausgeführt werden.

FZ 6 wurde in dieser granularen HSN/TSN-Form erstmals zum 1. Januar 2019 ausgewertet. Die älteren FZ-2-Jahrgänge werden deshalb getrennt als TSN-Typzeilen importiert:

```bash
PDFTOTEXT_PATH=/pfad/zu/pdftotext npm run import:fz2 -- data/raw/kba/fz2/fz2_2005.pdf
npm run import:fz2 -- data/raw/kba/fz2/fz2_2018.xls
```

Für PDFs wird Poppler (`pdftotext`) und für die amtliche XLS-Datei von 2018 LibreOffice (`soffice`) benötigt. Die FZ-2-Zeilen enthalten keine verlässlich zeilenbezogene HSN und werden daher nicht als exakte HSN/TSN-Zeitreihe ausgegeben.

Die technische KBA-Typenliste SV 4.2 wird lokal separat importiert:

```bash
PDFTOTEXT_PATH=/pfad/zu/pdftotext npm run import:sv42 -- data/raw/kba/sv42.pdf
```

Sie ergänzt exakte HSN/TSN um TSN-Zuteilungsdatum, Leistung, Hubraum, Kraftstoffcode, Aufbau sowie Achs- und Sitzdaten. Vor einem öffentlichen Betrieb müssen die im Dokument genannten KBA-Nutzungsbedingungen geklärt werden.

## Technische Fahrzeugreferenz importieren

Eine lizenzierte Providerlieferung wird als UTF-8-Semikolon-CSV eingelesen:

```bash
npm run import:reference -- ./data/raw/reference/dat-export.csv dat
```

Pflichtspalten sind `external_id`, `hsn`, `tsn`, `manufacturer` und `model`. Optional sind `generation_code`, `production_start`, `production_end`, `power_kw`, `engine` und `drivetrain`. Produktionsdaten verwenden `YYYY-MM-DD`. Der Import speichert den Provider-Rohdatensatz getrennt von den KBA-Beständen und weist aus, wie viele HSN/TSN gefunden wurden.

## Quellenmodell

- KBA FZ 6: aktueller Bestand pro HSN/TSN und Stichtag
- KBA Sonderheft 4 / FZ 2: historische TSN-Typzeilen und Bestand 2005–2018
- KBA SV 4.2: technische Typdaten und TSN-Zuteilungsdatum
- KBA FZ 4: separat geführte historische Neuzulassungen
- DAT SilverDAT oder TecDoc: lizenzierte technische Fahrzeugreferenz
- manuelle Evidenz: nur für geprüfte Sonderfälle

Details stehen in [docs/DATA_SOURCES.md](docs/DATA_SOURCES.md).

Das Importformat ist für digitalisierte Jahrgänge bis 1990 geöffnet. Amtliche, maschinenlesbare Typbestände konnten bislang jedoch nur ab 2005 vollständig beschafft werden. Der belegte Archivstatus und die noch offenen Jahrgänge stehen in [docs/HISTORICAL_ARCHIVE.md](docs/HISTORICAL_ARCHIVE.md).

## Qualitätssicherung

```bash
npm test
npm run typecheck
npm run lint
npm run build
```

Die Tests decken Alias-Suche, HSN/TSN-Suche, beide historischen KBA-Layouts, Identifier mit führenden Nullen, amtliche Doppelzeilen, Referenz-CSV-Validierung und den Mehrquellen-Merge ab.

## Mittwald Container Hosting

Das Repository enthält ein mehrstufiges `Dockerfile` mit Next.js-Standalone-Ausgabe und unprivilegiertem Laufzeitnutzer. Ein Mittwald-Rollout ist bewusst noch nicht Teil des aktuellen Schritts. Vor dem späteren Deployment werden die technische Referenz, Zuordnungsprüfung und Produktionssuche lokal abgeschlossen.
