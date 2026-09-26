import { beforeEach, describe, expect, it, vi } from "vitest";

const databaseMocks = vi.hoisted(() => ({
  stockSnapshotFindMany: vi.fn(),
  fz2VehicleSnapshotFindMany: vi.fn(),
  hsnTsnKeyFindMany: vi.fn(),
}));

vi.mock("@/db/prisma", () => ({
  prisma: {
    stockSnapshot: { findMany: databaseMocks.stockSnapshotFindMany },
    fz2VehicleSnapshot: { findMany: databaseMocks.fz2VehicleSnapshotFindMany },
    hsnTsnKey: { findMany: databaseMocks.hsnTsnKeyFindMany },
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

const audiA8 = {
  ...e420Cdi,
  id: 2,
  identityKey: "audi-a8-adz",
  manufacturerName: "AUDI (D)",
  tradeName: "AUDI A8;AUDI A8, S8, A8L;",
  tsn: "ADZ",
  powerKw: 165,
  count: 111,
};

const reportingDate2026 = new Date(Date.UTC(2026, 0, 1));
const bmw525d = {
  id: 3,
  hsn: "0005",
  tsn: "ABC",
  manufacturerName: "BAYER.MOT.WERKE-BMW",
  tradeName: "525D TOURING",
  stockSnapshots: [{
    reportingDate: reportingDate2026,
    count: 321,
    sourceFile: { dataSource: { name: "KBA FZ 6" } },
  }],
  externalRecords: [{
    engine: "Diesel · 2.993 cm³",
    powerKw: 150,
    drivetrain: "1 Antriebsachse",
    raw: { displacementCc: 2993 },
  }],
};

describe("searchVehicles mit historischen FZ-2-Daten", () => {
  beforeEach(() => {
    databaseMocks.stockSnapshotFindMany.mockReset().mockResolvedValue([]);
    databaseMocks.hsnTsnKeyFindMany.mockReset().mockResolvedValue([]);
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
    expect(JSON.stringify(searchWhere)).not.toContain('"contains"');
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

  it("verwirft historische Treffer nicht wegen eines dort fehlenden exakten Hubraums", async () => {
    databaseMocks.fz2VehicleSnapshotFindMany.mockReset()
      .mockResolvedValueOnce([{ reportingDate }])
      .mockResolvedValue([audiA8]);

    const outcome = await searchVehicles("A8 3.3 TDI", { year: "2009" });

    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]).toMatchObject({ name: "AUDI A8;AUDI A8, S8, A8L;", fuel: "Diesel" });
  });

  it("findet bei BMW 525 auch einen amtlichen Handelsnamen 525D TOURING", async () => {
    databaseMocks.stockSnapshotFindMany.mockResolvedValue([{ reportingDate: reportingDate2026 }]);
    databaseMocks.fz2VehicleSnapshotFindMany.mockReset().mockResolvedValue([]);
    databaseMocks.hsnTsnKeyFindMany.mockResolvedValue([bmw525d]);

    const outcome = await searchVehicles("BMW 525", { year: "2026" });

    expect(outcome.results).toHaveLength(1);
    expect(outcome.results[0]).toMatchObject({ name: "525D TOURING", stock: 321 });
  });
});
