-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('ADMIN', 'MEMBER');

-- CreateEnum
CREATE TYPE "MembershipRole" AS ENUM ('OWNER', 'ADMIN', 'MEMBER', 'VIEWER');

-- CreateEnum
CREATE TYPE "EmissionCategory" AS ENUM ('FUEL', 'ELECTRICITY', 'WASTE_LANDFILL', 'WASTE_INCINERATION', 'WASTE_RECYCLING', 'WASTE_COMPOSTING', 'PRODUCTION', 'TRANSPORT', 'OTHER');

-- CreateEnum
CREATE TYPE "WasteFlowStatus" AS ENUM ('ACTIVE', 'INACTIVE', 'ARCHIVED');

-- CreateEnum
CREATE TYPE "QuantityUnit" AS ENUM ('KG', 'TON', 'LITER', 'CUBIC_METER', 'UNIT', 'PIECE');

-- CreateEnum
CREATE TYPE "Frequency" AS ENUM ('DAILY', 'WEEKLY', 'MONTHLY', 'QUARTERLY', 'YEARLY', 'ONE_OFF', 'CONTINUOUS');

-- CreateEnum
CREATE TYPE "TreatmentCode" AS ENUM ('R1', 'R2', 'R3', 'R4', 'R5', 'R6', 'R7', 'R8', 'R9', 'R10', 'R11', 'R12', 'R13', 'D1', 'D2', 'D3', 'D4', 'D5', 'D6', 'D7', 'D8', 'D9', 'D10', 'D11', 'D12', 'D13', 'D14', 'D15');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Company" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "vatNumber" TEXT,
    "country" VARCHAR(2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Company_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Invitation" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "token" TEXT NOT NULL,
    "expiresAt" TIMESTAMP(3) NOT NULL,
    "invitedById" TEXT NOT NULL,
    "acceptedAt" TIMESTAMP(3),
    "acceptedByUserId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Invitation_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Membership" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "role" "MembershipRole" NOT NULL DEFAULT 'MEMBER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Membership_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Site" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "addressLine1" TEXT,
    "addressLine2" TEXT,
    "city" TEXT,
    "region" TEXT,
    "country" VARCHAR(2),
    "postalCode" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Site_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "EmissionFactor" (
    "id" TEXT NOT NULL,
    "category" "EmissionCategory" NOT NULL,
    "subtype" TEXT NOT NULL,
    "unit" TEXT NOT NULL,
    "kgCo2ePerUnit" DECIMAL(14,6) NOT NULL,
    "source" TEXT NOT NULL,
    "region" VARCHAR(16),
    "year" INTEGER NOT NULL,
    "notes" TEXT,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "EmissionFactor_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FuelEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "fuelType" TEXT NOT NULL,
    "quantity" DECIMAL(14,3) NOT NULL,
    "unit" TEXT NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "locationName" TEXT,
    "emissionFactorId" TEXT,
    "kgCo2e" DECIMAL(14,3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FuelEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ElectricityEntry" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "kwh" DECIMAL(14,3) NOT NULL,
    "month" TIMESTAMP(3) NOT NULL,
    "renewablePercent" DECIMAL(5,2),
    "energyProvider" TEXT,
    "locationName" TEXT,
    "emissionFactorId" TEXT,
    "kgCo2e" DECIMAL(14,3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ElectricityEntry_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteCode" (
    "code" TEXT NOT NULL,
    "displayCode" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "chapterCode" VARCHAR(2) NOT NULL,
    "subChapterCode" VARCHAR(4) NOT NULL,
    "isHazardous" BOOLEAN NOT NULL DEFAULT false,
    "isMirrorEntry" BOOLEAN NOT NULL DEFAULT false,
    "catalogVersion" TEXT NOT NULL,

    CONSTRAINT "WasteCode_pkey" PRIMARY KEY ("code")
);

-- CreateTable
CREATE TABLE "WasteCategory" (
    "id" TEXT NOT NULL,
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "WasteCategory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WasteFlow" (
    "id" TEXT NOT NULL,
    "companyId" TEXT NOT NULL,
    "siteId" TEXT,
    "categoryId" TEXT,
    "wasteCodeId" TEXT,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "materialComposition" TEXT,
    "status" "WasteFlowStatus" NOT NULL DEFAULT 'ACTIVE',
    "estimatedQuantity" DECIMAL(14,3),
    "quantityUnit" "QuantityUnit" NOT NULL DEFAULT 'TON',
    "frequency" "Frequency" NOT NULL DEFAULT 'MONTHLY',
    "storageMethod" TEXT,
    "currentDestination" TEXT,
    "currentOperator" TEXT,
    "locationName" TEXT,
    "internalCode" TEXT,
    "treatmentCode" "TreatmentCode",
    "treatmentNotes" TEXT,
    "recoveryNotes" TEXT,
    "notes" TEXT,
    "isHazardous" BOOLEAN NOT NULL DEFAULT false,
    "isPriority" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "createdById" TEXT,

    CONSTRAINT "WasteFlow_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "User_role_idx" ON "User"("role");

-- CreateIndex
CREATE UNIQUE INDEX "Company_slug_key" ON "Company"("slug");

-- CreateIndex
CREATE UNIQUE INDEX "Invitation_token_key" ON "Invitation"("token");

-- CreateIndex
CREATE INDEX "Invitation_companyId_idx" ON "Invitation"("companyId");

-- CreateIndex
CREATE INDEX "Invitation_email_idx" ON "Invitation"("email");

-- CreateIndex
CREATE INDEX "Invitation_expiresAt_idx" ON "Invitation"("expiresAt");

-- CreateIndex
CREATE INDEX "Membership_companyId_idx" ON "Membership"("companyId");

-- CreateIndex
CREATE UNIQUE INDEX "Membership_userId_companyId_key" ON "Membership"("userId", "companyId");

-- CreateIndex
CREATE INDEX "Site_companyId_idx" ON "Site"("companyId");

-- CreateIndex
CREATE INDEX "EmissionFactor_category_subtype_idx" ON "EmissionFactor"("category", "subtype");

-- CreateIndex
CREATE UNIQUE INDEX "EmissionFactor_category_subtype_region_year_companyId_key" ON "EmissionFactor"("category", "subtype", "region", "year", "companyId");

-- CreateIndex
CREATE INDEX "FuelEntry_companyId_month_idx" ON "FuelEntry"("companyId", "month");

-- CreateIndex
CREATE INDEX "FuelEntry_siteId_idx" ON "FuelEntry"("siteId");

-- CreateIndex
CREATE INDEX "ElectricityEntry_companyId_month_idx" ON "ElectricityEntry"("companyId", "month");

-- CreateIndex
CREATE INDEX "ElectricityEntry_siteId_idx" ON "ElectricityEntry"("siteId");

-- CreateIndex
CREATE INDEX "WasteCode_chapterCode_idx" ON "WasteCode"("chapterCode");

-- CreateIndex
CREATE INDEX "WasteCode_subChapterCode_idx" ON "WasteCode"("subChapterCode");

-- CreateIndex
CREATE INDEX "WasteCode_isHazardous_idx" ON "WasteCode"("isHazardous");

-- CreateIndex
CREATE UNIQUE INDEX "WasteCategory_slug_key" ON "WasteCategory"("slug");

-- CreateIndex
CREATE INDEX "WasteFlow_companyId_status_idx" ON "WasteFlow"("companyId", "status");

-- CreateIndex
CREATE INDEX "WasteFlow_siteId_idx" ON "WasteFlow"("siteId");

-- CreateIndex
CREATE INDEX "WasteFlow_categoryId_idx" ON "WasteFlow"("categoryId");

-- CreateIndex
CREATE INDEX "WasteFlow_wasteCodeId_idx" ON "WasteFlow"("wasteCodeId");

-- CreateIndex
CREATE INDEX "WasteFlow_isHazardous_idx" ON "WasteFlow"("isHazardous");

-- CreateIndex
CREATE INDEX "WasteFlow_isPriority_idx" ON "WasteFlow"("isPriority");

-- CreateIndex
CREATE INDEX "WasteFlow_createdAt_idx" ON "WasteFlow"("createdAt");

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_invitedById_fkey" FOREIGN KEY ("invitedById") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Invitation" ADD CONSTRAINT "Invitation_acceptedByUserId_fkey" FOREIGN KEY ("acceptedByUserId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Membership" ADD CONSTRAINT "Membership_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Site" ADD CONSTRAINT "Site_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "EmissionFactor" ADD CONSTRAINT "EmissionFactor_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelEntry" ADD CONSTRAINT "FuelEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelEntry" ADD CONSTRAINT "FuelEntry_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FuelEntry" ADD CONSTRAINT "FuelEntry_emissionFactorId_fkey" FOREIGN KEY ("emissionFactorId") REFERENCES "EmissionFactor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityEntry" ADD CONSTRAINT "ElectricityEntry_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityEntry" ADD CONSTRAINT "ElectricityEntry_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ElectricityEntry" ADD CONSTRAINT "ElectricityEntry_emissionFactorId_fkey" FOREIGN KEY ("emissionFactorId") REFERENCES "EmissionFactor"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteFlow" ADD CONSTRAINT "WasteFlow_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "Company"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteFlow" ADD CONSTRAINT "WasteFlow_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "Site"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteFlow" ADD CONSTRAINT "WasteFlow_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "WasteCategory"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteFlow" ADD CONSTRAINT "WasteFlow_wasteCodeId_fkey" FOREIGN KEY ("wasteCodeId") REFERENCES "WasteCode"("code") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "WasteFlow" ADD CONSTRAINT "WasteFlow_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
