import Link from "next/link";

export default function NotFound() {
  return <main className="content-page"><div className="shell"><article><h1>Fahrzeug nicht gefunden</h1><p>Diese Variante existiert nicht oder wurde noch nicht veröffentlicht.</p><p><Link className="reset-link" href="/">Zur Fahrzeugsuche</Link></p></article></div></main>;
}
