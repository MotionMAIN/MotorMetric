export interface TechnicalSearchIntent {
  textTokens: string[];
  fuel?: "Benzin" | "Diesel" | "Elektro";
  displacementCc?: number;
  powerKw?: number;
}

const fuelTerms: Record<string, TechnicalSearchIntent["fuel"]> = {
  benzin: "Benzin",
  fsi: "Benzin",
  tfsi: "Benzin",
  tsi: "Benzin",
  diesel: "Diesel",
  tdi: "Diesel",
  cdi: "Diesel",
  elektro: "Elektro",
  electric: "Elektro",
};

const attachedFuelTerms = ["electric", "benzin", "diesel", "tfsi", "cdi", "tdi", "tsi", "fsi"] as const;

export function splitCompactVehicleToken(token: string): string[] {
  const parts = token.match(/[a-z]+|\d+/gi) ?? [token];
  return parts.length > 1 ? parts : [token];
}

export function parseTechnicalSearch(query: string): TechnicalSearchIntent {
  const intent: TechnicalSearchIntent = { textTokens: [] };
  for (const rawToken of query.trim().split(/\s+/).filter(Boolean).slice(0, 8)) {
    const token = rawToken.toLocaleLowerCase("de-DE");
    const fuel = fuelTerms[token];
    if (fuel) {
      intent.fuel = fuel;
      continue;
    }
    const attachedFuel = attachedFuelTerms.find((term) => token.endsWith(term));
    if (attachedFuel) {
      const modelToken = token.slice(0, -attachedFuel.length);
      if (modelToken) {
        intent.textTokens.push(modelToken);
        intent.fuel = fuelTerms[attachedFuel];
        continue;
      }
    }
    const dieselSuffix = token.match(/^(.+\d)d$/);
    if (dieselSuffix) {
      intent.textTokens.push(dieselSuffix[1]);
      intent.fuel = "Diesel";
      continue;
    }
    const displacement = token.match(/^(\d{1,2})[.,](\d)$/);
    if (displacement) {
      intent.displacementCc = Number(displacement[1]) * 1_000 + Number(displacement[2]) * 100;
      continue;
    }
    const power = token.match(/^(\d{2,3})kw$/);
    if (power) {
      intent.powerKw = Number(power[1]);
      continue;
    }
    intent.textTokens.push(rawToken);
  }
  return intent;
}
