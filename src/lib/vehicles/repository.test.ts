import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  stockSnapshotFindMany: vi.fn(),
  fz2VehicleSnapshotFindMany: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    stockSnapshot: { findMany: databaseMocks.stockSnapshotFindMany },
    fz2VehicleSnapshot: { findMany: databaseMocks.fz2VehicleSnapshotFindMany },
  },
}));

import { searchVehicles } from "./repository";

const reportingDate = new Date(Date.UTC(2009, 0, 1));
const e420Cdi = {
  id: 1,
  sourceFileId: 1,
  reportingDate,
  identityKey: "e420-cdi-aft",
  manufacturerName: "DAIMLER (D)",
  tradeName: "E 420 CDI",
  tsn: "AFT",
  powerKw: 231,
  fuelCode: "D",
  allWheel: false,
  bodyCode: null,
  count: 550,
  sourceFile: { dataSource: { name: "KBA FZ 2" } },
};

describe("searchVehicles mit historischen FZ-2-Daten", () => {
  beforeEach(() => {
    databaseMocks.stockSnapshotFindMany.mockReset().mockResolvedValue([]);
    databaseMocks.fz2VehicleSnapshotFindMany.mockReset()
      .mockResolvedValueOnce([{ reportingDate }])
      .mockResolvedValue([e420Cdi]);
  });

  it("fällt bei einer vollständigen HSN/TSN auf die historische TSN zurück", async () => {
    const outcome = await searchVehicles("0999 AFT", { year: "2009" });

    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]).toMatchObject({ name: "E 420 CDI", stock: 550 });
    const searchWhere = databaseMocks.fz2VehicleSnapshotFindMany.mock.calls[1][0].where;
    expect(JSON.stringify(searchWhere)).toContain('"equals":"AFT"');
    expect(JSON.stringify(searchWhere)).not.toContain("0999");
  });

  it("ignoriert einen ergänzenden W-Baureihencode bei der Handelsnamensuche", async () => {
    const outcome = await searchVehicles("W211 E420CDI", { year: "2009" });

    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]).toMatchObject({ name: "E 420 CDI", fuel: "Diesel" });
    const searchWhere = databaseMocks.fz2VehicleSnapshotFindMany.mock.calls[1][0].where;
    expect(JSON.stringify(searchWhere).toLocaleLowerCase()).toContain("e420");
    expect(JSON.stringify(searchWhere).toLocaleLowerCase()).not.toContain("w211");
  });
});
