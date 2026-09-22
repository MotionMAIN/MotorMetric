export type Facelift = "Vor-Mopf" | "Mopf" | "Nicht zutreffend";
export type Confidence = "Hoch" | "Mittel" | "Niedrig";

export interface KeyStock {
  hsn: string;
  tsn: string;
  tradeName: string;
  stock: number;
  confidence: Confidence;
  included: boolean;
}

export interface VehicleVariant {
  slug: string;
  manufacturer: string;
  family: string;
  generation: string;
  name: string;
  productionPeriod: string;
  facelift: Facelift;
  engine: string;
  powerKw: number;
  drivetrain: string;
  reportingDate: string;
  source: string;
  keys: KeyStock[];
  registrations: Array<{ year: number; count: number }>;
  stockHistory?: Array<{ year: number; count: number }>;
  keyType?: "HSN_TSN" | "TSN";
  referenceYear?: number;
  fuel?: string;
  displacementCc?: number;
  drivenAxleCount?: number;
}

export interface VehicleResult extends VehicleVariant {
  stock: number;
  keyCount: number;
  uncertainKeyCount: number;
}

export interface SearchFilters {
  generation?: string;
  facelift?: string;
  drivetrain?: string;
  year?: string;
  manufacturer?: string;
  minimumStock?: string;
  referenceDecade?: string;
  fuel?: string;
}
