-- CreateEnum
CREATE TYPE "SourceKind" AS ENUM ('KBA_STOCK', 'KBA_REGISTRATIONS', 'VEHICLE_REFERENCE', 'MANUAL_RESEARCH');

-- CreateEnum
CREATE TYPE "ImportStatus" AS ENUM ('VALIDATING', 'VALIDATED', 'PUBLISHED', 'FAILED');

-- CreateEnum
CREATE TYPE "MappingStatus" AS ENUM ('CONFIRMED', 'REVIEW', 'REJECTED');

-- CreateEnum
CREATE TYPE "ConfidenceLevel" AS ENUM ('HIGH', 'MEDIUM', 'LOW');

-- CreateEnum
CREATE TYPE "FaceliftStatus" AS ENUM ('PRE_FACELIFT', 'FACELIFT', 'NOT_APPLICABLE');

-- CreateTable
CREATE TABLE "Manufacturer" (
    "id" SERIAL NOT NULL,
    "name" VARCHAR(160) NOT NULL,

    CONSTRAINT "Manufacturer_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelFamily" (
    "id" SERIAL NOT NULL,
    "manufacturerId" INTEGER NOT NULL,
    "name" VARCHAR(160) NOT NULL,

    CONSTRAINT "ModelFamily_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelGeneration" (
    "id" SERIAL NOT NULL,
    "familyId" INTEGER NOT NULL,
    "code" VARCHAR(40) NOT NULL,
    "productionStart" DATE,
    "productionEnd" DATE,

    CONSTRAINT "ModelGeneration_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehicleVariant" (
    "id" SERIAL NOT NULL,
    "generationId" INTEGER NOT NULL,
    "slug" VARCHAR(180) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "engine" VARCHAR(120) NOT NULL,
    "powerKw" INTEGER NOT NULL,
    "drivetrain" VARCHAR(80) NOT NULL,
    "facelift" "FaceliftStatus" NOT NULL,
    "productionStart" DATE,
    "productionEnd" DATE,

    CONSTRAINT "VehicleVariant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ModelAlias" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "alias" VARCHAR(220) NOT NULL,
    "normalizedAlias" VARCHAR(220) NOT NULL,

    CONSTRAINT "ModelAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "HsnTsnKey" (
    "id" SERIAL NOT NULL,
    "hsn" VARCHAR(4) NOT NULL,
    "tsn" VARCHAR(8) NOT NULL,
    "manufacturerName" VARCHAR(240) NOT NULL,
    "tradeName" VARCHAR(240),

    CONSTRAINT "HsnTsnKey_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DataSource" (
    "id" SERIAL NOT NULL,
    "key" VARCHAR(80) NOT NULL,
    "name" VARCHAR(180) NOT NULL,
    "kind" "SourceKind" NOT NULL,
    "homepageUrl" TEXT,
    "licenseNote" TEXT,
    "isOfficial" BOOLEAN NOT NULL DEFAULT false,

    CONSTRAINT "DataSource_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "SourceFile" (
    "id" SERIAL NOT NULL,
    "dataSourceId" INTEGER NOT NULL,
    "name" VARCHAR(255) NOT NULL,
    "sha256" VARCHAR(64) NOT NULL,
    "sourceUrl" TEXT,
    "reportingDate" DATE,
    "archivedPath" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "SourceFile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ImportRun" (
    "id" SERIAL NOT NULL,
    "sourceFileId" INTEGER NOT NULL,
    "status" "ImportStatus" NOT NULL,
    "report" JSONB NOT NULL,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "publishedAt" TIMESTAMP(3),

    CONSTRAINT "ImportRun_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ExternalVehicleRecord" (
    "id" SERIAL NOT NULL,
    "dataSourceId" INTEGER NOT NULL,
    "sourceFileId" INTEGER,
    "externalId" VARCHAR(180) NOT NULL,
    "hsnTsnKeyId" INTEGER,
    "matchedVariantId" INTEGER,
    "manufacturer" VARCHAR(180) NOT NULL,
    "model" VARCHAR(220) NOT NULL,
    "generationCode" VARCHAR(80),
    "productionStart" DATE,
    "productionEnd" DATE,
    "powerKw" INTEGER,
    "engine" VARCHAR(160),
    "drivetrain" VARCHAR(100),
    "raw" JSONB NOT NULL,
    "importedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ExternalVehicleRecord_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VariantMapping" (
    "id" SERIAL NOT NULL,
    "variantId" INTEGER NOT NULL,
    "hsnTsnKeyId" INTEGER NOT NULL,
    "sourceFileId" INTEGER,
    "status" "MappingStatus" NOT NULL,
    "confidence" "ConfidenceLevel" NOT NULL,
    "isActive" BOOLEAN NOT NULL DEFAULT false,
    "manuallyConfirmedAt" TIMESTAMP(3),
    "validFrom" DATE,
    "validUntil" DATE,

    CONSTRAINT "VariantMapping_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MappingEvidence" (
    "id" SERIAL NOT NULL,
    "mappingId" INTEGER NOT NULL,
    "dataSourceId" INTEGER NOT NULL,
    "externalId" VARCHAR(180),
    "sourceUrl" TEXT,
    "note" TEXT,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MappingEvidence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "StockSnapshot" (
    "id" SERIAL NOT NULL,
    "hsnTsnKeyId" INTEGER NOT NULL,
    "sourceFileId" INTEGER NOT NULL,
    "reportingDate" DATE NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "StockSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "NewRegistrationSnapshot" (
    "id" SERIAL NOT NULL,
    "hsnTsnKeyId" INTEGER NOT NULL,
    "sourceFileId" INTEGER NOT NULL,
    "year" INTEGER NOT NULL,
    "count" INTEGER NOT NULL,

    CONSTRAINT "NewRegistrationSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Manufacturer_name_key" ON "Manufacturer"("name");

-- CreateIndex
CREATE UNIQUE INDEX "ModelFamily_manufacturerId_name_key" ON "ModelFamily"("manufacturerId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "ModelGeneration_familyId_code_key" ON "ModelGeneration"("familyId", "code");

-- CreateIndex
CREATE UNIQUE INDEX "VehicleVariant_slug_key" ON "VehicleVariant"("slug");

-- CreateIndex
CREATE INDEX "ModelAlias_normalizedAlias_idx" ON "ModelAlias"("normalizedAlias");

-- CreateIndex
CREATE UNIQUE INDEX "ModelAlias_variantId_normalizedAlias_key" ON "ModelAlias"("variantId", "normalizedAlias");

-- CreateIndex
CREATE INDEX "HsnTsnKey_manufacturerName_idx" ON "HsnTsnKey"("manufacturerName");

-- CreateIndex
CREATE INDEX "HsnTsnKey_tradeName_idx" ON "HsnTsnKey"("tradeName");

-- CreateIndex
CREATE UNIQUE INDEX "HsnTsnKey_hsn_tsn_key" ON "HsnTsnKey"("hsn", "tsn");

-- CreateIndex
CREATE UNIQUE INDEX "DataSource_key_key" ON "DataSource"("key");

-- CreateIndex
CREATE UNIQUE INDEX "SourceFile_sha256_key" ON "SourceFile"("sha256");

-- CreateIndex
CREATE INDEX "ExternalVehicleRecord_hsnTsnKeyId_idx" ON "ExternalVehicleRecord"("hsnTsnKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "ExternalVehicleRecord_dataSourceId_externalId_key" ON "ExternalVehicleRecord"("dataSourceId", "externalId");

-- CreateIndex
CREATE INDEX "VariantMapping_hsnTsnKeyId_isActive_status_idx" ON "VariantMapping"("hsnTsnKeyId", "isActive", "status");

-- CreateIndex
CREATE UNIQUE INDEX "VariantMapping_variantId_hsnTsnKeyId_key" ON "VariantMapping"("variantId", "hsnTsnKeyId");

-- CreateIndex
CREATE UNIQUE INDEX "StockSnapshot_hsnTsnKeyId_reportingDate_key" ON "StockSnapshot"("hsnTsnKeyId", "reportingDate");

-- CreateIndex
CREATE UNIQUE INDEX "NewRegistrationSnapshot_hsnTsnKeyId_year_key" ON "NewRegistrationSnapshot"("hsnTsnKeyId", "year");

-- AddForeignKey
ALTER TABLE "ModelFamily" ADD CONSTRAINT "ModelFamily_manufacturerId_fkey" FOREIGN KEY ("manufacturerId") REFERENCES "Manufacturer"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelGeneration" ADD CONSTRAINT "ModelGeneration_familyId_fkey" FOREIGN KEY ("familyId") REFERENCES "ModelFamily"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehicleVariant" ADD CONSTRAINT "VehicleVariant_generationId_fkey" FOREIGN KEY ("generationId") REFERENCES "ModelGeneration"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ModelAlias" ADD CONSTRAINT "ModelAlias_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "SourceFile" ADD CONSTRAINT "SourceFile_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ImportRun" ADD CONSTRAINT "ImportRun_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalVehicleRecord" ADD CONSTRAINT "ExternalVehicleRecord_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalVehicleRecord" ADD CONSTRAINT "ExternalVehicleRecord_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalVehicleRecord" ADD CONSTRAINT "ExternalVehicleRecord_hsnTsnKeyId_fkey" FOREIGN KEY ("hsnTsnKeyId") REFERENCES "HsnTsnKey"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ExternalVehicleRecord" ADD CONSTRAINT "ExternalVehicleRecord_matchedVariantId_fkey" FOREIGN KEY ("matchedVariantId") REFERENCES "VehicleVariant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantMapping" ADD CONSTRAINT "VariantMapping_variantId_fkey" FOREIGN KEY ("variantId") REFERENCES "VehicleVariant"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantMapping" ADD CONSTRAINT "VariantMapping_hsnTsnKeyId_fkey" FOREIGN KEY ("hsnTsnKeyId") REFERENCES "HsnTsnKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VariantMapping" ADD CONSTRAINT "VariantMapping_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MappingEvidence" ADD CONSTRAINT "MappingEvidence_mappingId_fkey" FOREIGN KEY ("mappingId") REFERENCES "VariantMapping"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MappingEvidence" ADD CONSTRAINT "MappingEvidence_dataSourceId_fkey" FOREIGN KEY ("dataSourceId") REFERENCES "DataSource"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSnapshot" ADD CONSTRAINT "StockSnapshot_hsnTsnKeyId_fkey" FOREIGN KEY ("hsnTsnKeyId") REFERENCES "HsnTsnKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "StockSnapshot" ADD CONSTRAINT "StockSnapshot_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewRegistrationSnapshot" ADD CONSTRAINT "NewRegistrationSnapshot_hsnTsnKeyId_fkey" FOREIGN KEY ("hsnTsnKeyId") REFERENCES "HsnTsnKey"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NewRegistrationSnapshot" ADD CONSTRAINT "NewRegistrationSnapshot_sourceFileId_fkey" FOREIGN KEY ("sourceFileId") REFERENCES "SourceFile"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
