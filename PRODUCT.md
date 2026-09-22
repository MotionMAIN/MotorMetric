# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Stack

Next.js mit TypeScript, PostgreSQL, Prisma ORM und Tailwind CSS. Die Anwendung wird vollständig containerisiert und für ein späteres Deployment im Mittwald Container Hosting vorbereitet.

## Users

Private Autoenthusiasten in Deutschland, die den amtlichen Fahrzeugbestand anhand geläufiger Modellnamen recherchieren möchten, ohne KBA-Fachwissen oder HSN/TSN-Kenntnisse vorauszusetzen.

## Product Purpose

„MotorMetric“ macht KBA-Bestandsdaten über verständliche Modellnamen, Baureihen und Varianten auffindbar. Erfolg bedeutet, dass Nutzer eine Suche wie „CL500“ korrekt den belastbar zugeordneten Generationen und Varianten zuordnen und jede aggregierte Bestandszahl bis zu den enthaltenen HSN/TSN-Kombinationen nachvollziehen können.

## Positioning

Die Anwendung verbindet amtliche Bestandszahlen mit einer quellenbelegten, vertrauensbewerteten Zuordnung zu enthusiastengerechten Modellbegriffen. Sie behauptet keine Genauigkeit, wo Zuordnungen unsicher sind, und trennt aktuellen Bestand strikt von historischen Neuzulassungen.

## Operating Context

Der Hauptablauf beginnt mit einer fehlertoleranten Suche nach Modellname oder HSN/TSN. Ergebnisse werden nach Generation und Variante gruppiert, lassen sich fachlich filtern und öffnen ihre vollständige Berechnungsgrundlage. Historische Neuzulassungen sind eine separate Ansicht mit erklärendem Kontext.

## Capabilities and Constraints

- Normalisierte Alias-Suche für Modellschreibweisen wie „CL500“, „CL 500“, „Mercedes CL500“, „E420CDI“, „HSN 0999 TSN AFT“ und „0999 AFT“. Interne Baureihencodes wie „W220“, „C216“ oder „E46“ sind keine unterstützte Suchsprache.
- Automatische Aggregation ausschließlich für eindeutige, aktive HSN/TSN-Zuordnungen; unsichere Zuordnungen bleiben separat sichtbar.
- Filter nach Baureihe, Produktionszeitraum, Vor-Mopf/Mopf, Motorisierung und Antrieb.
- Nachweis von Quelle, Bestandsstichtag, Zuordnungsstatus und Vertrauensstufe.
- Kein scheinbar exakter aktueller Bestandsfilter nach Erstzulassungsjahr ohne kompatible amtliche Datengrundlage.
- Wiederholbarer, validierender KBA-Import mit Prüfsumme, unverändertem Rohdatenarchiv und atomarer Veröffentlichung.
- Gummble dient als Entwicklungsreferenz für UX-Muster. Die öffentliche Suche und bereits importierte Daten dürfen keine MCP-Laufzeitabhängigkeit haben.
- Responsive, barrierearme Oberfläche und serverseitige Suche/Aggregation.

## Brand Commitments

Produktname „MotorMetric“ – ein technisches Recherchewerkzeug für nachvollziehbare Fahrzeugbestände und Typenschlüssel. Die Sprache ist sachlich, präzise und enthusiastennah, ohne Behördenjargon, Spekulation oder werbliche Übertreibung.

## Evidence on Hand

Das Produktbriefing liegt unter `/Users/jlampe/.codex/attachments/3a263f62-a2b5-45ab-9477-1bc985ff188f/Eingefügter Text.txt`. Echte KBA-Quelldateien und belastbare HSN/TSN-Zuordnungsdaten liegen noch nicht vor; Beispieldaten müssen eindeutig als Demonstrationsdaten gekennzeichnet werden.

## Product Principles

- Datenwahrheit vor scheinbarer Vollständigkeit.
- Jede Summe bleibt bis zur amtlichen Schlüsselzeile überprüfbar.
- Geläufige Modellbegriffe führen, technische Schlüssel bleiben zugänglich.
- Aktueller Bestand und historische Neuzulassungen werden nie vermischt.
- Import und Veröffentlichung sind reproduzierbar und ausfallsicher.

## Accessibility & Inclusion

Die Kernsuche, Filter, Ergebnisgruppen und Details müssen per Tastatur und Screenreader bedienbar sein. Status, Unsicherheit und Datenarten dürfen nicht allein durch Farbe vermittelt werden.
