/*
  Warnings:

  - You are about to alter the column `vehicleId` on the `GeofenceEvent` table. The data in that column could be lost. The data in that column will be cast from `Text` to `VarChar(128)`.

*/
-- DropIndex
DROP INDEX "GeofenceEvent_geofenceId_occurredAt_idx";

-- AlterTable
ALTER TABLE "GeofenceEvent" ALTER COLUMN "vehicleId" SET DATA TYPE VARCHAR(128);
