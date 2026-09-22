CREATE TABLE "Fz2VehicleSnapshot" (
    "id" SERIAL NOT NULL,
    "sourceFileId" INTEGER NOT NULL,
    "reportingDate" DATE NOT NULL,
    "identityKey" VARCHAR(64) NOT NULL,
    "manufacturerName" VARCHAR(240) NOT NULL,
    "tradeName" VARCHAR(300) NOT NULL,
    "tsn" VARCHAR(8) NOT NULL,
    "powerKw" INTEGER NOT NULL,
    "fuelCode" VARCHAR(12) NOT NULL,
    "allWheel" BOOLEAN NOT NULL,
    "bodyCode" VARCHAR(12),
    "count" INTEGER NOT NULL,

    CONSTRAINT "Fz2VehicleSnapshot_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Fz2VehicleSnapshot_sourceFileId_identityKey_key" ON "Fz2VehicleSnapshot"("sourceFileId", "identityKey");
CREATE INDEX "Fz2VehicleSnapshot_reportingDate_idx" ON "Fz2VehicleSnapshot"("reportingDate");
CREATE INDEX "Fz2VehicleSnapshot_manufacturerName_idx" ON "Fz2VehicleSnapshot"("manufacturerName");
CREATE INDEX "Fz2VehicleSnapshot_tradeName_idx" ON "Fz2VehicleSnapshot"("tradeName");
CREATE INDEX "Fz2VehicleSnapshot_identityKey_reportingDate_idx" ON "Fz2VehicleSnapshot"("identityKey", "reportingDate");

ALTER TABLE "Fz2VehicleSnapshot" ADD CONSTRAINT "Fz2VehicleSnapshot_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
