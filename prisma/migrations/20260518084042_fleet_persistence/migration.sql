-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "name" TEXT,
    "passwordHash" TEXT NOT NULL,
    "roles" TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Geofence" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "ring" JSONB NOT NULL,
    "enabled" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "Geofence_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "GeofenceEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "geofenceId" TEXT,
    "fenceName" VARCHAR(200) NOT NULL,
    "vehicleId" TEXT NOT NULL,
    "plate" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(16) NOT NULL,
    "message" TEXT NOT NULL,
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "GeofenceEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetVehicle" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalVehicleId" VARCHAR(128) NOT NULL,
    "plate" VARCHAR(64) NOT NULL,
    "devIdno" VARCHAR(64),
    "driverName" VARCHAR(200),
    "status" VARCHAR(32),
    "metadata" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetVehicle_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "VehiclePositionHistory" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fleetVehicleId" TEXT,
    "vehicleId" VARCHAR(128) NOT NULL,
    "plate" VARCHAR(64),
    "lat" DOUBLE PRECISION NOT NULL,
    "lng" DOUBLE PRECISION NOT NULL,
    "speedKmh" DOUBLE PRECISION,
    "heading" DOUBLE PRECISION,
    "status" VARCHAR(32),
    "recordedAt" TIMESTAMP(3) NOT NULL,
    "source" VARCHAR(32),

    CONSTRAINT "VehiclePositionHistory_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetAlarm" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "fleetVehicleId" TEXT,
    "externalId" VARCHAR(128),
    "vehicleId" VARCHAR(128) NOT NULL,
    "plate" VARCHAR(64),
    "type" VARCHAR(128) NOT NULL,
    "message" TEXT NOT NULL,
    "severity" VARCHAR(32) NOT NULL,
    "source" VARCHAR(32) NOT NULL,
    "raisedAt" TIMESTAMP(3) NOT NULL,
    "acknowledged" BOOLEAN NOT NULL DEFAULT false,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetAlarm_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetTrip" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalTripId" VARCHAR(128),
    "vehicleId" VARCHAR(128) NOT NULL,
    "plate" VARCHAR(64) NOT NULL,
    "driverName" VARCHAR(200),
    "origin" VARCHAR(512),
    "destination" VARCHAR(512),
    "status" VARCHAR(32),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "progressPercent" DOUBLE PRECISION,
    "distanceKm" DOUBLE PRECISION,
    "costNgn" DECIMAL(18,2),
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetTrip_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetFuelEvent" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehicleId" VARCHAR(128) NOT NULL,
    "plate" VARCHAR(64) NOT NULL,
    "kind" VARCHAR(32) NOT NULL,
    "description" TEXT NOT NULL,
    "detail" TEXT,
    "occurredAt" TIMESTAMP(3) NOT NULL,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetFuelEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetDriverProfile" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalDriverId" VARCHAR(128) NOT NULL,
    "name" VARCHAR(200) NOT NULL,
    "vehiclePlate" VARCHAR(64),
    "score" DOUBLE PRECISION,
    "driveHours" DOUBLE PRECISION,
    "restHours" DOUBLE PRECISION,
    "hosStatus" VARCHAR(32),
    "raw" JSONB,
    "lastSyncAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "FleetDriverProfile_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MapUserArea" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "externalMarkerId" VARCHAR(128) NOT NULL,
    "name" VARCHAR(256) NOT NULL,
    "lat" DOUBLE PRECISION,
    "lng" DOUBLE PRECISION,
    "radius" DOUBLE PRECISION,
    "mapType" INTEGER,
    "markerType" INTEGER,
    "raw" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MapUserArea_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetKpiSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "totalVehicles" INTEGER,
    "active" INTEGER,
    "idling" INTEGER,
    "alarmsOpen" INTEGER,
    "offline" INTEGER,
    "kmToday" DOUBLE PRECISION,
    "onlineToday" INTEGER,
    "avgKmPerDay" DOUBLE PRECISION,
    "avgOnlineHours" DOUBLE PRECISION,
    "payload" JSONB,

    CONSTRAINT "FleetKpiSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetFooterSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "lastSyncSecondsAgo" INTEGER,
    "gpsOnline" INTEGER,
    "obdOnline" INTEGER,
    "fuelSensorOnline" INTEGER,
    "dmsOnline" INTEGER,
    "tpmsOnline" INTEGER,
    "version" VARCHAR(64),
    "payload" JSONB,

    CONSTRAINT "FleetFooterSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetIncident" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" VARCHAR(512) NOT NULL,
    "status" VARCHAR(64) NOT NULL,
    "openedAt" TIMESTAMP(3) NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetIncident_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "FleetFine" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehiclePlate" VARCHAR(64) NOT NULL,
    "amountNgn" DECIMAL(18,2) NOT NULL,
    "issuedAt" TIMESTAMP(3) NOT NULL,
    "violation" TEXT NOT NULL,
    "payload" JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "FleetFine_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MaintenanceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "vehiclePlate" VARCHAR(64) NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "MaintenanceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceSnapshot" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "capturedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "payload" JSONB NOT NULL,

    CONSTRAINT "ComplianceSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "BreathalyzerLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "driverName" VARCHAR(200) NOT NULL,
    "testedAt" TIMESTAMP(3) NOT NULL,
    "bacPercent" VARCHAR(32) NOT NULL,
    "result" VARCHAR(16) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "BreathalyzerLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ApiIngestLog" (
    "id" TEXT NOT NULL,
    "userId" TEXT,
    "endpoint" VARCHAR(512) NOT NULL,
    "method" VARCHAR(16) NOT NULL DEFAULT 'GET',
    "statusCode" INTEGER,
    "resourceKey" VARCHAR(256),
    "querySummary" TEXT,
    "requestBody" JSONB,
    "responseBody" JSONB,
    "errorMessage" TEXT,
    "fetchedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "durationMs" INTEGER,

    CONSTRAINT "ApiIngestLog_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "TripBooking" (
    "id" TEXT NOT NULL,
    "requester" TEXT NOT NULL,
    "route" TEXT NOT NULL,
    "scheduledAt" TIMESTAMP(3) NOT NULL,
    "vehicleType" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'pending',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "TripBooking_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WorkOrder" (
    "id" TEXT NOT NULL,
    "vehiclePlate" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "issue" TEXT NOT NULL,
    "priority" TEXT NOT NULL,
    "status" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WorkOrder_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ComplianceDocument" (
    "id" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "docType" TEXT NOT NULL,
    "expiresOn" TIMESTAMP(3) NOT NULL,
    "storageUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "ComplianceDocument_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE INDEX "Geofence_userId_updatedAt_idx" ON "Geofence"("userId", "updatedAt");

-- CreateIndex
CREATE INDEX "Geofence_userId_name_idx" ON "Geofence"("userId", "name");

-- CreateIndex
CREATE INDEX "GeofenceEvent_userId_occurredAt_idx" ON "GeofenceEvent"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "GeofenceEvent_plate_occurredAt_idx" ON "GeofenceEvent"("plate", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "GeofenceEvent_geofenceId_occurredAt_idx" ON "GeofenceEvent"("geofenceId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "FleetVehicle_userId_plate_idx" ON "FleetVehicle"("userId", "plate");

-- CreateIndex
CREATE UNIQUE INDEX "FleetVehicle_userId_externalVehicleId_key" ON "FleetVehicle"("userId", "externalVehicleId");

-- CreateIndex
CREATE UNIQUE INDEX "FleetVehicle_userId_plate_key" ON "FleetVehicle"("userId", "plate");

-- CreateIndex
CREATE INDEX "VehiclePositionHistory_userId_recordedAt_idx" ON "VehiclePositionHistory"("userId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "VehiclePositionHistory_vehicleId_recordedAt_idx" ON "VehiclePositionHistory"("vehicleId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "VehiclePositionHistory_fleetVehicleId_recordedAt_idx" ON "VehiclePositionHistory"("fleetVehicleId", "recordedAt" DESC);

-- CreateIndex
CREATE INDEX "FleetAlarm_userId_raisedAt_idx" ON "FleetAlarm"("userId", "raisedAt" DESC);

-- CreateIndex
CREATE INDEX "FleetAlarm_vehicleId_raisedAt_idx" ON "FleetAlarm"("vehicleId", "raisedAt" DESC);

-- CreateIndex
CREATE INDEX "FleetTrip_userId_startedAt_idx" ON "FleetTrip"("userId", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "FleetTrip_plate_startedAt_idx" ON "FleetTrip"("plate", "startedAt" DESC);

-- CreateIndex
CREATE INDEX "FleetFuelEvent_userId_occurredAt_idx" ON "FleetFuelEvent"("userId", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "FleetFuelEvent_plate_occurredAt_idx" ON "FleetFuelEvent"("plate", "occurredAt" DESC);

-- CreateIndex
CREATE INDEX "FleetDriverProfile_userId_name_idx" ON "FleetDriverProfile"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "FleetDriverProfile_userId_externalDriverId_key" ON "FleetDriverProfile"("userId", "externalDriverId");

-- CreateIndex
CREATE INDEX "MapUserArea_userId_name_idx" ON "MapUserArea"("userId", "name");

-- CreateIndex
CREATE UNIQUE INDEX "MapUserArea_userId_externalMarkerId_key" ON "MapUserArea"("userId", "externalMarkerId");

-- CreateIndex
CREATE INDEX "FleetKpiSnapshot_userId_capturedAt_idx" ON "FleetKpiSnapshot"("userId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "FleetFooterSnapshot_userId_capturedAt_idx" ON "FleetFooterSnapshot"("userId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "FleetIncident_userId_openedAt_idx" ON "FleetIncident"("userId", "openedAt" DESC);

-- CreateIndex
CREATE INDEX "FleetFine_userId_issuedAt_idx" ON "FleetFine"("userId", "issuedAt" DESC);

-- CreateIndex
CREATE INDEX "MaintenanceSnapshot_userId_capturedAt_idx" ON "MaintenanceSnapshot"("userId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "ComplianceSnapshot_userId_capturedAt_idx" ON "ComplianceSnapshot"("userId", "capturedAt" DESC);

-- CreateIndex
CREATE INDEX "BreathalyzerLog_userId_testedAt_idx" ON "BreathalyzerLog"("userId", "testedAt" DESC);

-- CreateIndex
CREATE INDEX "ApiIngestLog_userId_fetchedAt_idx" ON "ApiIngestLog"("userId", "fetchedAt" DESC);

-- CreateIndex
CREATE INDEX "ApiIngestLog_endpoint_fetchedAt_idx" ON "ApiIngestLog"("endpoint", "fetchedAt" DESC);

-- AddForeignKey
ALTER TABLE "Geofence" ADD CONSTRAINT "Geofence_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "GeofenceEvent" ADD CONSTRAINT "GeofenceEvent_geofenceId_fkey" FOREIGN KEY ("geofenceId") REFERENCES "Geofence"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetVehicle" ADD CONSTRAINT "FleetVehicle_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePositionHistory" ADD CONSTRAINT "VehiclePositionHistory_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "VehiclePositionHistory" ADD CONSTRAINT "VehiclePositionHistory_fleetVehicleId_fkey" FOREIGN KEY ("fleetVehicleId") REFERENCES "FleetVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetAlarm" ADD CONSTRAINT "FleetAlarm_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetAlarm" ADD CONSTRAINT "FleetAlarm_fleetVehicleId_fkey" FOREIGN KEY ("fleetVehicleId") REFERENCES "FleetVehicle"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetTrip" ADD CONSTRAINT "FleetTrip_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetFuelEvent" ADD CONSTRAINT "FleetFuelEvent_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetDriverProfile" ADD CONSTRAINT "FleetDriverProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MapUserArea" ADD CONSTRAINT "MapUserArea_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetKpiSnapshot" ADD CONSTRAINT "FleetKpiSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetFooterSnapshot" ADD CONSTRAINT "FleetFooterSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetIncident" ADD CONSTRAINT "FleetIncident_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "FleetFine" ADD CONSTRAINT "FleetFine_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MaintenanceSnapshot" ADD CONSTRAINT "MaintenanceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ComplianceSnapshot" ADD CONSTRAINT "ComplianceSnapshot_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BreathalyzerLog" ADD CONSTRAINT "BreathalyzerLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ApiIngestLog" ADD CONSTRAINT "ApiIngestLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
