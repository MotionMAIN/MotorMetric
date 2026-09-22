export function normalizeVehicleQuery(value: string): string {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/\b(HSN|TSN)\b/g, " ")
    .replace(/[^A-Z0-9]/g, "");
}

export function queryTokens(value: string): string[] {
  const spaced = value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .toUpperCase()
    .replace(/\b(HSN|TSN)\b/g, " ")
    .replace(/([A-Z])([0-9])/g, "$1 $2")
    .replace(/([0-9])([A-Z])/g, "$1 $2")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();

  return spaced ? spaced.split(/\s+/) : [];
}
