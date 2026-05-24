-- CreateTable
CREATE TABLE IF NOT EXISTS "VehiclePlateOverride" (
    "devIdno" VARCHAR(64) NOT NULL,
    "plateNumber" VARCHAR(64),
    "updatedAt" TIMESTAMP(3) NOT NULL,
    "updatedBy" VARCHAR(128),

    CONSTRAINT "VehiclePlateOverride_pkey" PRIMARY KEY ("devIdno")
);
