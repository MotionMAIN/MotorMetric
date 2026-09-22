import type { VehicleVariant } from "./types";

export const demoVehicles: VehicleVariant[] = [
  {
    slug: "mercedes-cl-500-c215",
    manufacturer: "Mercedes-Benz",
    family: "CL 500",
    generation: "C215",
    name: "CL 500",
    productionPeriod: "1999–2006",
    facelift: "Nicht zutreffend",
    engine: "5,0 l V8 Benzin",
    powerKw: 225,
    drivetrain: "Hinterradantrieb",
    reportingDate: "01.01.2025",
    source: "KBA-Bestand, Demoauszug · Zuordnung beispielhaft",
    keys: [
      { hsn: "0710", tsn: "419", tradeName: "CL 500", stock: 1832, confidence: "Hoch", included: true },
      { hsn: "0999", tsn: "AFT", tradeName: "CL 500", stock: 74, confidence: "Mittel", included: false }
    ],
    registrations: [{ year: 2000, count: 2812 }, { year: 2001, count: 2440 }, { year: 2002, count: 1968 }]
  },
  {
    slug: "mercedes-cl-500-c216-vormopf",
    manufacturer: "Mercedes-Benz",
    family: "CL 500",
    generation: "C216",
    name: "CL 500",
    productionPeriod: "2006–2010",
    facelift: "Vor-Mopf",
    engine: "5,5 l V8 Benzin",
    powerKw: 285,
    drivetrain: "Hinterradantrieb",
    reportingDate: "01.01.2025",
    source: "KBA-Bestand, Demoauszug · Zuordnung beispielhaft",
    keys: [
      { hsn: "0999", tsn: "AFU", tradeName: "CL 500", stock: 926, confidence: "Hoch", included: true },
      { hsn: "1313", tsn: "ACZ", tradeName: "CL 500", stock: 211, confidence: "Hoch", included: true }
    ],
    registrations: [{ year: 2007, count: 1321 }, { year: 2008, count: 981 }, { year: 2009, count: 744 }]
  },
  {
    slug: "mercedes-cl-500-c216-mopf",
    manufacturer: "Mercedes-Benz",
    family: "CL 500",
    generation: "C216",
    name: "CL 500 BlueEFFICIENCY",
    productionPeriod: "2010–2014",
    facelift: "Mopf",
    engine: "4,7 l V8 Biturbo",
    powerKw: 320,
    drivetrain: "Hinterradantrieb",
    reportingDate: "01.01.2025",
    source: "KBA-Bestand, Demoauszug · Zuordnung beispielhaft",
    keys: [
      { hsn: "1313", tsn: "BGK", tradeName: "CL 500", stock: 418, confidence: "Hoch", included: true }
    ],
    registrations: [{ year: 2011, count: 621 }, { year: 2012, count: 438 }, { year: 2013, count: 291 }]
  },
  {
    slug: "mercedes-cl-500-c216-mopf-4matic",
    manufacturer: "Mercedes-Benz",
    family: "CL 500",
    generation: "C216",
    name: "CL 500 4MATIC BlueEFFICIENCY",
    productionPeriod: "2010–2014",
    facelift: "Mopf",
    engine: "4,7 l V8 Biturbo",
    powerKw: 320,
    drivetrain: "4MATIC",
    reportingDate: "01.01.2025",
    source: "KBA-Bestand, Demoauszug · Zuordnung beispielhaft",
    keys: [
      { hsn: "1313", tsn: "BGL", tradeName: "CL 500 4MATIC", stock: 263, confidence: "Hoch", included: true }
    ],
    registrations: [{ year: 2011, count: 402 }, { year: 2012, count: 312 }, { year: 2013, count: 224 }]
  },
  {
    slug: "mercedes-e-420-cdi-w211",
    manufacturer: "Mercedes-Benz",
    family: "E 420 CDI",
    generation: "W211",
    name: "E 420 CDI",
    productionPeriod: "2006–2009",
    facelift: "Mopf",
    engine: "4,0 l V8 Diesel",
    powerKw: 231,
    drivetrain: "Hinterradantrieb",
    reportingDate: "01.01.2025",
    source: "KBA-Bestand, Demoauszug · Zuordnung beispielhaft",
    keys: [{ hsn: "0999", tsn: "AFT", tradeName: "E 420 CDI", stock: 682, confidence: "Mittel", included: false }],
    registrations: [{ year: 2006, count: 764 }, { year: 2007, count: 1012 }, { year: 2008, count: 708 }]
  }
];

export const demoAliases = new Map<string, string[]>([
  ["mercedes-cl-500-c215", ["CL500", "CL 500", "MERCEDES CL500", "C215 CL 500"]],
  ["mercedes-cl-500-c216-vormopf", ["CL500", "CL 500", "MERCEDES CL500", "C216 CL 500", "C216 VORMOPF"]],
  ["mercedes-cl-500-c216-mopf", ["CL500", "CL 500", "MERCEDES CL500", "C216 CL 500", "C216 MOPF"]],
  ["mercedes-cl-500-c216-mopf-4matic", ["CL500", "CL 500", "MERCEDES CL500", "C216 CL 500", "CL 500 4MATIC"]],
  ["mercedes-e-420-cdi-w211", ["W211 420 CDI", "E 420 CDI", "0999 AFT", "HSN 0999 TSN AFT"]]
]);
