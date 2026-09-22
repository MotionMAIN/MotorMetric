import { demoAliases, demoVehicles } from "./demo-data";
import { normalizeVehicleQuery, queryTokens } from "./normalize";
import type { SearchFilters, VehicleResult, VehicleVariant } from "./types";

export function aggregateVehicle(vehicle: VehicleVariant): VehicleResult {
  const includedKeys = vehicle.keys.filter((key) => key.included);
  return {
    ...vehicle,
    stock: includedKeys.reduce((sum, key) => sum + key.stock, 0),
    keyCount: includedKeys.length,
    uncertainKeyCount: vehicle.keys.length - includedKeys.length,
  };
}

function searchableText(vehicle: VehicleVariant): string {
  const aliases = demoAliases.get(vehicle.slug) ?? [];
  const keys = vehicle.keys.flatMap((key) => [`${key.hsn}${key.tsn}`, `${key.hsn} ${key.tsn}`]);
  return [vehicle.manufacturer, vehicle.family, vehicle.generation, vehicle.name, vehicle.facelift, ...aliases, ...keys]
    .map(normalizeVehicleQuery)
    .join(" ");
}

export function searchDemoVehicles(query: string, filters: SearchFilters = {}): VehicleResult[] {
  const normalized = normalizeVehicleQuery(query);
  const tokens = queryTokens(query).map(normalizeVehicleQuery);

  return demoVehicles
    .filter((vehicle) => {
      const haystack = searchableText(vehicle);
      const matchesQuery = !normalized || haystack.includes(normalized) || tokens.every((token) => haystack.includes(token));
      const matchesGeneration = !filters.generation || vehicle.generation === filters.generation;
      const matchesFacelift = !filters.facelift || vehicle.facelift === filters.facelift;
      const matchesDrivetrain = !filters.drivetrain || vehicle.drivetrain === filters.drivetrain;
      return matchesQuery && matchesGeneration && matchesFacelift && matchesDrivetrain;
    })
    .map(aggregateVehicle)
    .sort((a, b) => a.generation.localeCompare(b.generation) || a.productionPeriod.localeCompare(b.productionPeriod));
}

export function getDemoVehicle(slug: string): VehicleResult | undefined {
  const vehicle = demoVehicles.find((candidate) => candidate.slug === slug);
  return vehicle ? aggregateVehicle(vehicle) : undefined;
}
