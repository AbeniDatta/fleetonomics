-- DMS / ADAS camera recordings from uctracking video file APIs

CREATE TABLE IF NOT EXISTS "CameraRecording" (
    "id" TEXT NOT NULL,
    "devIdno" VARCHAR(64) NOT NULL,
    "plate" VARCHAR(64) NOT NULL,
    "role" VARCHAR(8) NOT NULL,
    "channel" INTEGER NOT NULL,
    "fileKey" VARCHAR(512) NOT NULL,
    "fileName" VARCHAR(512),
    "beginAt" TIMESTAMP(3) NOT NULL,
    "endAt" TIMESTAMP(3),
    "durationSec" INTEGER,
    "fileSizeBytes" INTEGER,
    "loc" INTEGER,
    "playbackPath" TEXT,
    "raw" JSONB,
    "syncedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CameraRecording_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CameraRecording_fileKey_key" ON "CameraRecording"("fileKey");
CREATE INDEX IF NOT EXISTS "CameraRecording_role_beginAt_idx" ON "CameraRecording"("role", "beginAt" DESC);
CREATE INDEX IF NOT EXISTS "CameraRecording_devIdno_channel_beginAt_idx" ON "CameraRecording"("devIdno", "channel", "beginAt" DESC);
CREATE INDEX IF NOT EXISTS "CameraRecording_plate_beginAt_idx" ON "CameraRecording"("plate", "beginAt" DESC);
