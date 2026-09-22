# Datenquellen und Merge-Strategie

MotorMetric behandelt Bestandszahlen und Fahrzeugwissen als getrennte Wahrheiten. Eine Quelle darf die jeweils andere nicht stillschweigend ersetzen.

## 1. Amtliche Bestands- und Zulassungsdaten

Primärquelle ist das Kraftfahrt-Bundesamt:

- **FZ 6** liefert den Bestand nach Hersteller und Typ zum 1. Januar eines Berichtsjahres. Die HSN/TSN-Auswertung beginnt 2019; lokal liegen alle amtlichen Jahrgänge 2019–2026 vor.
- **Sonderheft 4 / FZ 2** liefert für die lokal verfügbaren Jahrgänge 2005–2018 historische Pkw-Typzeilen mit Handelsname, TSN und technischen Merkmalen. Weil die HSN dort nicht verlässlich zeilenbezogen veröffentlicht wird, bleibt diese Reihe getrennt von FZ 6. Für 1990–2004 liegen derzeit keine vollständig digitalisierten amtlichen Typhefte vor; diese Lücke wird nicht mit Schätzwerten gefüllt.
- **SV 4.2** verknüpft HSN/TSN mit dem amtlichen Zuteilungsdatum und technischen Typmerkmalen wie Leistung, Hubraum, Kraftstoffcode, Aufbau, Achsen und Sitzplätzen. Das Zuteilungsdatum ist kein Bau- oder Produktionsjahr.
- **FZ Hersteller/Handelsnamen** löst HSN/TSN auf die amtlichen Hersteller- und Handelsnamen auf.
- **FZ 4** wird ausschließlich als historische Neuzulassungsstatistik importiert.

Katalog: <https://data.gov.de/suche?publisher=Kraftfahrt-Bundesamt+(KBA)>

Diese Daten besitzen die Bestandswahrheit, reichen allein aber nicht für Baureihe, Modellgeneration, Facelift und einen belastbaren Produktionszeitraum.

SV 4.2 ist kostenfrei abrufbar, enthält jedoch einen Vorbehalt für Vervielfältigung und Verbreitung. Die lokale Entwicklung darf damit arbeiten; vor dem öffentlichen Hosting ist die konkrete Nutzung mit dem KBA zu klären.

Bestandsjahr und Baujahr sind verschiedene Dimensionen. Ein FZ-6-Stichtag sagt, wie viele Fahrzeuge mit einem Schlüssel an diesem Tag registriert waren. Er sagt nicht, wann diese Fahrzeuge gebaut oder erstmals zugelassen wurden.

## 2. Fahrzeugreferenzdaten

Für die technische Anreicherung ist ein lizenzierter Fahrzeugdatenanbieter vorgesehen. Zwei belastbare Kandidaten sind:

- **DAT / SilverDAT Europa-Code**: herstellerübergreifender Fahrzeugstamm, nationale Codes wie HSN/TSN sowie Produktionszeiträume auf Monatsebene. Die Daten sind lizenzpflichtig und per Schnittstelle oder Datenlieferung verfügbar.
- **TecAlliance / TecDoc Reference Data bzw. Web Service**: standardisierte Fahrzeugtypen mit technischer Beschreibung; der Vehicle-Service kann deutsche KBA-Nummern auf TecDoc-Fahrzeugtypen abbilden. Ebenfalls lizenzpflichtig.

DAT: <https://www.dat.de/fileadmin/de/download/rechtliches/produktbeschreibung-silverdat-3-pro.pdf>

TecAlliance: <https://www.tecalliance.net/products/cards/tecdoc-catalogue>

Kostenlose Drittseiten werden nicht automatisiert übernommen, solange Nutzungsrechte, Vollständigkeit und Herkunft nicht belastbar geklärt sind. Das GDV-Typklassenverzeichnis kann eine weitere Evidenzquelle sein, ist aber nicht automatisch der kanonische Fahrzeugstamm.

## 3. Merge-Regel

1. KBA-Zeilen werden unverändert anhand `HSN + TSN + Stichtag` gespeichert.
2. Referenzdaten werden separat mit Anbieter-ID, Rohdatensatz, Importdatei und Lizenzhinweis archiviert.
3. Ein exakter HSN/TSN-Treffer erzeugt zunächst einen Zuordnungsvorschlag.
4. Nur genau ein fachlich passender Referenzdatensatz darf automatisch den Status `CONFIRMED/HIGH` erhalten.
5. Mehrere Treffer, widersprüchliche Bauzeiträume oder fehlende Schlüssel landen in `REVIEW` und fließen nicht in eine Modellsumme ein.
6. Manuelle Bestätigungen speichern Zeitpunkt, Evidenz und Gültigkeitszeitraum.
7. Jede öffentliche Summe referenziert die enthaltenen HSN/TSN und den KBA-Stichtag; technische Angaben nennen ihre eigene Referenzquelle.

Damit bleibt ein späterer Wechsel von DAT zu TecDoc oder ein Parallelabgleich möglich, ohne historische KBA-Bestände umzuschreiben.

## 4. Lokaler Importstatus

| Stichtag | HSN/TSN | Gesamtbestand |
| --- | ---: | ---: |
| 01.01.2019 | 54.673 | 57.333.713 |
| 01.01.2020 | 56.394 | 58.256.135 |
| 01.01.2021 | 58.021 | 59.167.774 |
| 01.01.2022 | 59.384 | 59.818.601 |
| 01.01.2023 | 60.402 | 60.317.419 |
| 01.01.2024 | 61.294 | 60.896.022 |
| 01.01.2025 | 62.392 | 61.373.096 |
| 01.01.2026 | 63.260 | 61.690.665 |

Zusätzlich sind 155.260 historische Typzeilen für die vierzehn Stichtage 2005–2018 sowie 34.277 SV-4.2-Typreferenzen (davon 30.111 mit einem lokal vorhandenen FZ-6-Schlüssel verknüpft) importiert.

Diese Kontrollsummen werden nach jedem Neuimport gegen die Datenbank geprüft. Die Originaldateien bleiben lokal und sind wegen ihrer Größe und Herkunft nicht Teil des Git-Repositories.
