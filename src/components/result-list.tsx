import Link from "next/link";
import { ChevronRight, Info } from "lucide-react";
import type { VehicleResult } from "@/lib/vehicles/types";

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

export function ResultList({ results, view, reportingYear }: { results: VehicleResult[]; view: "stock" | "registrations"; reportingYear: number }) {
  const groups = results.reduce((grouped, result) => {
    const groupKey = `${result.manufacturer} · ${result.generation}`;
    const variants = grouped.get(groupKey) ?? [];
    variants.push(result);
    grouped.set(groupKey, variants);
    return grouped;
  }, new Map<string, VehicleResult[]>());

  if (results.length === 0) {
    return (
      <div className="empty-state">
        <h2>Kein eindeutiger Treffer</h2>
        <p>Prüfe die Schreibweise oder suche direkt nach einer HSN/TSN. Unsichere Zuordnungen werden nicht als exakte Modellsumme ausgegeben.</p>
      </div>
    );
  }

  return (
    <>
      {[...groups.entries()].map(([groupKey, variants]) => {
        const generation = variants[0].generation;
        const total = variants.reduce((sum, variant) => sum + variant.stock, 0);
        const isRawKbaGroup = generation === "KBA-Typenschlüssel" || generation === "KBA-FZ-2-Typ";
        const isFz2Group = generation === "KBA-FZ-2-Typ";
        const registrationTotal = variants.reduce(
          (sum, variant) => sum + variant.registrations.reduce((variantSum, item) => variantSum + item.count, 0),
          0,
        );
        return (
          <section className="generation-block" key={groupKey}>
            <header className="generation-head">
              <div className="generation-title">
                <h2>{variants[0].manufacturer} · {generation}</h2>
                <span>{variants[0].productionPeriod}</span>
              </div>
              <div className="generation-total">
                <strong>{view === "stock" ? isRawKbaGroup ? `${variants.length} ${isFz2Group ? "Typzeilen" : "Schlüssel"}` : formatNumber(total) : registrationTotal > 0 ? formatNumber(registrationTotal) : "–"}</strong>
                <span>{view === "stock" ? isRawKbaGroup ? "einzeln amtlich belegt" : "eindeutig zugeordnet" : registrationTotal > 0 ? "damalige Neuzulassungen" : "noch nicht importiert"}</span>
              </div>
            </header>
            {variants.map((variant) => (
              <article className="variant-row" key={variant.slug}>
                <div className="variant-main">
                  <strong>{variant.name}</strong>
                  <span>{variant.engine}{variant.powerKw > 0 ? ` · ${variant.powerKw} kW` : ""}</span>
                  <div className="badges">
                    {variant.facelift !== "Nicht zutreffend" && <span className="badge">{variant.facelift}</span>}
                    {variant.drivetrain === "4MATIC" && <span className="badge success">4MATIC</span>}
                    {variant.uncertainKeyCount > 0 && <span className="badge warning">{variant.uncertainKeyCount} ungeprüft</span>}
                  </div>
                </div>
                <div className="variant-tech"><strong>{variant.drivetrain}</strong><span>{variant.productionPeriod}</span></div>
                <div className="key-count">{variant.keyCount === 1
                  ? variant.keyType === "TSN" ? `TSN ${variant.keys[0].tsn}` : `${variant.keys[0].hsn}/${variant.keys[0].tsn}`
                  : `${variant.keyCount} HSN/TSN`}<br />{variant.keyCount === 1 ? "amtlicher Schlüssel" : "in Summe"}</div>
                <div className="stock-value">
                  <strong>{view === "stock" ? formatNumber(variant.stock) : variant.registrations.length > 0 ? formatNumber(variant.registrations.reduce((sum, item) => sum + item.count, 0)) : "–"}</strong>
                  <span>{view === "stock" ? `Stand ${variant.reportingDate}` : variant.registrations.length > 0 ? "im gezeigten Zeitraum" : "noch nicht importiert"}</span>
                </div>
                <Link href={`/vehicles/${variant.slug}`} className="row-link" aria-label={`${variant.name} ${generation} im Detail öffnen`}>
                  <ChevronRight size={20} />
                </Link>
              </article>
            ))}
          </section>
        );
      })}
      <div className="context-note">
        <Info size={18} aria-hidden="true" />
        <div><strong>Bestand und Neuzulassung sind verschiedene Messgrößen.</strong><br />Die Bestandszahl zeigt die am genannten KBA-Stichtag registrierten Fahrzeuge. Die Jahresansicht zeigt damalige Neuzulassungen und nicht, wie viele davon am jüngsten Stichtag noch zugelassen waren.{reportingYear <= 2007 && " Bis einschließlich 2007 enthält der KBA-Bestand auch vorübergehend stillgelegte Fahrzeuge und ist deshalb nicht direkt mit späteren Stichtagen vergleichbar."}</div>
      </div>
    </>
  );
}
