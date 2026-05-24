-- Trim schema to lean models: drop unused fleet tables, add FleetReportCache.

-- Drop tables removed from schema (order: dependents first)
DROP TABLE IF EXISTS "ApiIngestLog" CASCADE;
DROP TABLE IF EXISTS "BreathalyzerLog" CASCADE;
DROP TABLE IF EXISTS "ComplianceSnapshot" CASCADE;
DROP TABLE IF EXISTS "MaintenanceSnapshot" CASCADE;
DROP TABLE IF EXISTS "FleetFine" CASCADE;
DROP TABLE IF EXISTS "FleetIncident" CASCADE;
DROP TABLE IF EXISTS "FleetFooterSnapshot" CASCADE;
DROP TABLE IF EXISTS "FleetKpiSnapshot" CASCADE;
DROP TABLE IF EXISTS "MapUserArea" CASCADE;
DROP TABLE IF EXISTS "FleetDriverProfile" CASCADE;
DROP TABLE IF EXISTS "FleetFuelEvent" CASCADE;
DROP TABLE IF EXISTS "FleetTrip" CASCADE;
DROP TABLE IF EXISTS "FleetAlarm" CASCADE;
DROP TABLE IF EXISTS "VehiclePositionHistory" CASCADE;
DROP TABLE IF EXISTS "FleetVehicle" CASCADE;

-- Report cache (mileage / fuel API snapshots)
CREATE TABLE IF NOT EXISTS "FleetReportCache" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "cacheKey" VARCHAR(512) NOT NULL,
    "endpoint" VARCHAR(256) NOT NULL,
    "payload" JSONB NOT NULL,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetReportCache_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "FleetReportCache_cacheKey_key" ON "FleetReportCache"("cacheKey");
CREATE INDEX IF NOT EXISTS "FleetReportCache_endpoint_fetchedAt_idx" ON "FleetReportCache"("endpoint", "fetchedAt" DESC);

DO $$ BEGIN
  ALTER TABLE "FleetReportCache" ADD CONSTRAINT "FleetReportCache_userId_fkey"
    FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
EXCEPTION
  WHEN duplicate_object THEN NULL;
END $$;
