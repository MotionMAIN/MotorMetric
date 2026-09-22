import Link from "next/link";
import { CheckCircle2, FileSearch, Info, ShieldCheck } from "lucide-react";
import { SearchForm } from "@/components/search-form";
import { ResultList } from "@/components/result-list";
import { FilterDisclosure } from "@/components/filter-disclosure";
import { getLatestStockStatus, searchVehicles } from "@/lib/vehicles/repository";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function getParam(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return Array.isArray(value) ? value[0] : value ?? "";
}

export default async function Home({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const query = getParam(params, "q").trim();
  const stockStatus = await getLatestStockStatus();

  if (!query) {
    return (
      <main>
        <section className="hero">
          <div className="shell">
            <div className="hero-grid">
              <div>
                <h1>Wie viele sind <span>noch da?</span></h1>
                <p className="hero-copy">Durchsuche den deutschen Fahrzeugbestand nach amtlichem Modellnamen oder Schlüsselnummer – mit lokal verfügbaren KBA-Stichtagen seit 2005.</p>
              </div>
              <div className="data-status">
                <strong>Neuester Datenstand</strong>
                <span>{stockStatus ? `${stockStatus.reportingDate} · KBA FZ 6` : "Noch kein Bestand importiert"}</span>
                <span>{stockStatus ? `${new Intl.NumberFormat("de-DE").format(stockStatus.keyCount)} HSN/TSN lokal verfügbar` : "Lokale Datenbank vorbereiten"}</span>
              </div>
            </div>
            <SearchForm />
            <div className="examples">
              <span>Zum Ausprobieren:</span>
              {["S 500", "CL 500", "0710 430"].map((example) => (
                <Link className="example-link" key={example} href={`/?q=${encodeURIComponent(example)}`}>{example}</Link>
              ))}
            </div>
            <div className="trust-strip">
              <div className="trust-item"><FileSearch className="trust-icon" size={22} /><strong>Amtliche Handelsnamen</strong><p>Hersteller, Handelsname und Schlüsselnummern stammen direkt aus KBA FZ 6.</p></div>
              <div className="trust-item"><CheckCircle2 className="trust-icon" size={22} /><strong>Jede Summe ist prüfbar</strong><p>Enthaltene HSN/TSN, Einzelwerte, Quelle und Stichtag bleiben jederzeit sichtbar.</p></div>
              <div className="trust-item"><ShieldCheck className="trust-icon" size={22} /><strong>Unsicherheit bleibt sichtbar</strong><p>Mehrdeutige Zuordnungen werden getrennt gezeigt und nie automatisch eingerechnet.</p></div>
            </div>
          </div>
        </section>
      </main>
    );
  }

  const generation = getParam(params, "generation");
  const facelift = getParam(params, "facelift");
  const drivetrain = getParam(params, "drivetrain");
  const year = getParam(params, "year");
  const manufacturer = getParam(params, "manufacturer");
  const minimumStock = getParam(params, "minimumStock");
  const referenceDecade = getParam(params, "referenceDecade");
  const fuel = getParam(params, "fuel");
  const view = getParam(params, "view") === "registrations" ? "registrations" : "stock";
  const { results, facets, selectedYear } = await searchVehicles(query, { generation, facelift, drivetrain, year, manufacturer, minimumStock, referenceDecade, fuel });
  const hasTechnicalReference = results.some((result) => !["KBA-Typenschlüssel", "KBA-FZ-2-Typ"].includes(result.generation));
  const viewParams = new URLSearchParams({ q: query });
  viewParams.set("year", String(selectedYear));
  if (manufacturer) viewParams.set("manufacturer", manufacturer);
  if (minimumStock) viewParams.set("minimumStock", minimumStock);
  if (referenceDecade) viewParams.set("referenceDecade", referenceDecade);
  if (fuel) viewParams.set("fuel", fuel);
  if (generation) viewParams.set("generation", generation);
  if (facelift) viewParams.set("facelift", facelift);
  if (drivetrain) viewParams.set("drivetrain", drivetrain);
  const activeFilterCount = [manufacturer, minimumStock, referenceDecade, fuel, generation, facelift, drivetrain].filter(Boolean).length;

  return (
    <main className="results-page">
      <div className="shell">
        <SearchForm defaultValue={query} compact />
        <div className="results-head">
          <div><h1>Ergebnisse für „{query}“</h1><p>{hasTechnicalReference ? "Nach Modellgeneration gruppiert, eindeutig zugeordnete Schlüssel summiert." : selectedYear >= 2019 ? "Amtliche HSN/TSN-Typen mit technischen Merkmalen aus KBA SV 4.2." : "Historische KBA-FZ-2-Typzeilen mit TSN und technischen Merkmalen."}</p></div>
          <div className="demo-notice"><strong>Amtlicher Bestand:</strong> Datenstand 1. Januar {selectedYear} aus {selectedYear >= 2019 ? "KBA FZ 6" : "KBA FZ 2"}. Baujahre und Generationen erscheinen erst nach einer belegten Referenzzuordnung.</div>
        </div>
        <div className="workspace">
          <FilterDisclosure activeCount={activeFilterCount}>
            <form className="filter-panel" method="get">
              <input type="hidden" name="q" value={query} />
              <input type="hidden" name="view" value={view} />
              <h2>Ergebnisse filtern</h2>
              <div className="filter-group"><label htmlFor="year">Datenstand</label><select id="year" name="year" defaultValue={String(selectedYear)}>{facets.years.map((availableYear) => <option key={availableYear} value={availableYear}>1. Januar {availableYear}</option>)}</select></div>
              <div className="filter-group"><label htmlFor="manufacturer">Hersteller</label><select id="manufacturer" name="manufacturer" defaultValue={manufacturer}><option value="">Alle Hersteller</option>{facets.manufacturers.map((name) => <option key={name} value={name}>{name}</option>)}</select></div>
              <div className="filter-group"><label htmlFor="minimumStock">Mindestbestand</label><select id="minimumStock" name="minimumStock" defaultValue={minimumStock}><option value="">Kein Minimum</option><option value="10">Mindestens 10</option><option value="100">Mindestens 100</option><option value="1000">Mindestens 1.000</option></select></div>
              {facets.referenceDecades.length > 0 && <div className="filter-group"><label htmlFor="referenceDecade">TSN-Zuteilung</label><select id="referenceDecade" name="referenceDecade" defaultValue={referenceDecade}><option value="">Alle Zeiträume</option>{facets.referenceDecades.map((decade) => <option key={decade} value={decade}>{decade}–{decade + 9}</option>)}</select></div>}
              {facets.fuels.length > 0 && <div className="filter-group"><label htmlFor="fuel">Kraftstoff</label><select id="fuel" name="fuel" defaultValue={fuel}><option value="">Alle Kraftstoffe</option>{facets.fuels.map((fuelName) => <option key={fuelName} value={fuelName}>{fuelName}</option>)}</select></div>}
              {hasTechnicalReference ? <>
                <div className="filter-group"><label htmlFor="generation">Baureihe</label><select id="generation" name="generation" defaultValue={generation}><option value="">Alle Baureihen</option><option>C215</option><option>C216</option><option>W211</option></select></div>
                <div className="filter-group"><label htmlFor="facelift">Modellpflege</label><select id="facelift" name="facelift" defaultValue={facelift}><option value="">Alle Stände</option><option>Vor-Mopf</option><option>Mopf</option></select></div>
                <div className="filter-group"><label htmlFor="drivetrain">Antrieb</label><select id="drivetrain" name="drivetrain" defaultValue={drivetrain}><option value="">Alle Antriebe</option><option>Hinterradantrieb</option><option>4MATIC</option></select></div>
              </> : <div className="filter-note">
                <Info size={16} aria-hidden="true" />
                <p><strong>Baujahr noch nicht ableitbar</strong>Die TSN-Zuteilung grenzt den Zeitraum ein. Für Baureihe und Modellpflege fehlt noch eine belegte Referenz.</p>
              </div>}
              <button className="primary-button filter-submit" type="submit">Filter anwenden</button>
              <Link className="reset-link" href={`/?q=${encodeURIComponent(query)}`}>Filter zurücksetzen</Link>
            </form>
          </FilterDisclosure>
          <div>
            <div className="result-tools">
              <div className="view-switch" aria-label="Datenart auswählen">
                <Link href={`/?${viewParams.toString()}`} aria-current={view === "stock" ? "page" : undefined}>Bestand am Stichtag</Link>
                <Link href={`/?${viewParams.toString()}&view=registrations`} aria-current={view === "registrations" ? "page" : undefined}>Neuzulassungen</Link>
              </div>
              <span className="result-count">{results.length} Treffer</span>
            </div>
            <ResultList results={results} view={view} reportingYear={selectedYear} />
          </div>
        </div>
      </div>
    </main>
  );
}
