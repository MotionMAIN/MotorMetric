import Link from "next/link";
import { ArrowLeft, CircleAlert } from "lucide-react";
import { notFound } from "next/navigation";
import { getVehicle } from "@/lib/vehicles/repository";

function formatNumber(value: number) {
  return new Intl.NumberFormat("de-DE").format(value);
}

export default async function VehicleDetail({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const vehicle = await getVehicle(slug);
  if (!vehicle) notFound();

  const maxRegistration = Math.max(...vehicle.registrations.map((item) => item.count));
  const maxStock = Math.max(...(vehicle.stockHistory ?? []).map((item) => item.count));

  return (
    <main className="detail-page">
      <div className="shell">
        <Link className="back-link" href={`/?q=${encodeURIComponent(vehicle.family)}`}><ArrowLeft size={16} /> Zurück zu den Ergebnissen</Link>
        <header className="detail-hero">
          <div>
            <h1>{vehicle.name} <span className="text-[#1859d1]">{vehicle.generation}</span></h1>
            <p>{vehicle.manufacturer} · {vehicle.productionPeriod} · {vehicle.facelift}</p>
          </div>
          <div className="headline-stock"><strong>{formatNumber(vehicle.stock)}</strong><span>Bestand am KBA-Stichtag {vehicle.reportingDate}</span></div>
        </header>

        <div className="detail-grid">
          <div>
            <section aria-labelledby="technical-data">
              <h2 className="section-title" id="technical-data">Technische Einordnung</h2>
              <div className="facts">
                <div className="fact"><span>Baureihe</span><strong>{vehicle.generation}</strong></div>
                <div className="fact"><span>{vehicle.keyType === "TSN" ? "Baujahrstatus" : vehicle.referenceYear ? "TSN-Zuteilung" : "Produktionszeitraum"}</span><strong>{vehicle.productionPeriod}</strong></div>
                <div className="fact"><span>Modellstand</span><strong>{vehicle.facelift}</strong></div>
                <div className="fact"><span>Motorisierung</span><strong>{vehicle.engine}</strong></div>
                <div className="fact"><span>Leistung</span><strong>{vehicle.powerKw > 0 ? `${vehicle.powerKw} kW` : "Noch nicht zugeordnet"}</strong></div>
                <div className="fact"><span>Antrieb</span><strong>{vehicle.drivetrain}</strong></div>
              </div>
            </section>

            <section className="table-section" aria-labelledby="included-keys">
              <h2 className="section-title" id="included-keys">{vehicle.keyType === "TSN" ? "Amtliche FZ-2-Typzeile" : "Enthaltene HSN/TSN"}</h2>
              <table className="key-table">
                <thead><tr><th>HSN</th><th>TSN</th><th>KBA-Handelsname</th><th>Zuordnung</th><th className="number">Bestand</th></tr></thead>
                <tbody>
                  {vehicle.keys.map((key) => (
                    <tr key={`${key.hsn}-${key.tsn}`} className={key.included ? undefined : "excluded"}>
                      <td>{key.hsn}</td><td>{key.tsn}</td><td>{key.tradeName}</td>
                      <td><span className={`badge ${key.included ? "success" : "warning"}`}>{vehicle.keyType === "TSN" ? "Amtliche FZ-2-Zeile" : vehicle.generation === "KBA-Typenschlüssel" ? "Amtlicher Schlüssel" : key.included ? `Eindeutig · ${key.confidence}` : `Nicht summiert · ${key.confidence}`}</span></td>
                      <td className="number">{formatNumber(key.stock)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {vehicle.uncertainKeyCount > 0 && <div className="context-note"><CircleAlert size={18} /><div><strong>Ungeprüfte Zuordnung nicht eingerechnet.</strong><br />Mindestens eine HSN/TSN könnte zu dieser Variante gehören, ist aber noch nicht eindeutig genug belegt.</div></div>}
            </section>

            {(vehicle.stockHistory?.length ?? 0) > 1 && <section className="timeline-section" aria-labelledby="stock-history">
              <h2 className="section-title" id="stock-history">Bestandsentwicklung</h2>
              <div className="timeline" role="img" aria-label={`Bestand nach KBA-Stichtag: ${vehicle.stockHistory!.map((item) => `${item.year} ${item.count}`).join(", ")}`}>
                {vehicle.stockHistory!.map((item) => (
                  <div className="bar-item" key={item.year}><div className="bar" style={{ height: `${Math.max(8, item.count / maxStock * 110)}px` }} /><span>{item.year}<br />{formatNumber(item.count)}</span></div>
                ))}
              </div>
              <div className="context-note"><CircleAlert size={18} /><div><strong>Jährlicher Gesamtbestand dieses HSN/TSN-Schlüssels.</strong><br />Die Werte sind Stichtagsbestände zum 1. Januar und keine Baujahre oder Neuzulassungen.</div></div>
            </section>}

            {vehicle.registrations.length > 0 && <section className="timeline-section" aria-labelledby="registrations">
              <h2 className="section-title" id="registrations">Historische Neuzulassungen</h2>
              <div className="timeline" role="img" aria-label={`Neuzulassungen: ${vehicle.registrations.map((item) => `${item.year} ${item.count}`).join(", ")}`}>
                {vehicle.registrations.map((item) => (
                  <div className="bar-item" key={item.year}><div className="bar" style={{ height: `${Math.max(8, item.count / maxRegistration * 110)}px` }} /><span>{item.year}<br />{formatNumber(item.count)}</span></div>
                ))}
              </div>
              <div className="context-note"><CircleAlert size={18} /><div><strong>Nicht mit dem heutigen Bestand vergleichbar.</strong><br />Diese Werte zeigen damalige Neuzulassungen, nicht wie viele Fahrzeuge dieses Zulassungsjahres heute noch angemeldet sind.</div></div>
            </section>}
          </div>

          <aside aria-label="Quellen und Berechnung">
            <div className="source-box"><h3>Bestandsquelle</h3><p>{vehicle.source}<br />Stichtag: {vehicle.reportingDate}</p></div>
            <div className="source-box"><h3>Fahrzeugreferenz</h3><p>{vehicle.referenceYear ? "Leistung, Hubraum, Kraftstoff, Achsen und TSN-Zuteilungsdatum stammen aus KBA SV 4.2. Das Zuteilungsdatum ist kein Baujahr." : "Technische Modellinformationen werden getrennt vom KBA-Bestand geführt. Bauzeit, Generation und Motorisierung werden erst nach dem Import einer belegten Fahrzeugreferenz angezeigt."}</p></div>
            <div className="source-box"><h3>Berechnungsweg</h3><p>{vehicle.keyType === "TSN" ? "Dieser historische FZ-2-Datensatz zeigt eine amtliche TSN-Typzeile. Eine eindeutige HSN wird in dieser Tabelle nicht zeilenweise veröffentlicht." : vehicle.generation === "KBA-Typenschlüssel" ? "Dieser Datensatz zeigt genau einen amtlichen HSN/TSN-Schlüssel. Eine Modellgeneration ist noch nicht zugeordnet." : `Die Summe enthält ${vehicle.keyCount} aktive, eindeutige HSN/TSN-Zuordnung${vehicle.keyCount === 1 ? "" : "en"}. Unsichere Schlüssel bleiben sichtbar, aber unberücksichtigt.`}</p></div>
          </aside>
        </div>
      </div>
    </main>
  );
}
