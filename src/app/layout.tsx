import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL("https://motormetric.de"),
  title: "MotorMetric – Amtliche Fahrzeugbestände entschlüsselt",
  description: "Durchsuche den deutschen Fahrzeugbestand nach Modell, Baureihe oder HSN/TSN.",
  icons: { icon: "/motormetric-icon.png", apple: "/motormetric-icon.png" },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="de">
      <body>
        {/*
          THESIS: Ein ruhiges Recherchewerkzeug macht amtliche Bestandsdaten über verständliche Modellnamen prüfbar und verweigert die Optik eines Auto-Marktplatzes.
          OWN-WORLD: Helles Arbeitslicht, kühles Blau, Graphit, feine Tabellenlinien und großzügige Weißräume; klare Grotesk-Schrift mit tabellarischen Zahlen.
          FIRST-VIEW: Wortmarke, Datenstand und eine dominante Suche führen ohne Marketingumweg zu gruppierten Generationen.
          SIGNATURE: Jede Bestandszahl öffnet ihre HSN/TSN-Berechnungsbasis direkt in der Ergebniszeile.
          RISK: Hohe Informationsdichte darf auf kleinen Displays weder die Quellenhinweise noch unsichere Zuordnungen verdrängen.
        */}
        <header className="site-header">
          <div className="shell header-inner">
            <Link href="/" className="brand" aria-label="MotorMetric Startseite">
              <Image className="brand-mark" src="/motormetric-icon.png" width={32} height={32} alt="" priority />
              <span>MotorMetric</span>
            </Link>
            <nav className="main-nav" aria-label="Hauptnavigation">
              <Link href="/?q=CL500">Fahrzeugsuche</Link>
              <Link href="/datenquellen">Datenquellen</Link>
            </nav>
          </div>
        </header>
        {children}
        <footer className="site-footer">
          <div className="shell footer-inner">
            <p>MotorMetric · Amtliche Fahrzeugbestände entschlüsselt</p>
            <div><Link href="/datenquellen">Methodik</Link><span aria-hidden="true">·</span><a href="mailto:hallo@motormetric.de">Kontakt</a></div>
          </div>
        </footer>
      </body>
    </html>
  );
}
