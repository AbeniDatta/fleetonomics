import { randomUUID } from "crypto";
import type { CameraRecording as PrismaCameraRecording, Prisma } from "@prisma/client";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import type { CameraRole } from "@/lib/uctracking/camera-channels";
import type { NormalizedVideoFile } from "@/lib/uctracking/normalize-video-files";
import type { CameraRecordingRow } from "./types";
import * as fileStore from "./store-file";

function toRow(row: PrismaCameraRecording): CameraRecordingRow {
  return {
    id: row.id,
    devIdno: row.devIdno,
    plate: row.plate,
    role: row.role as CameraRole,
    channel: row.channel,
    fileName: row.fileName,
    beginAt: row.beginAt.toISOString(),
    endAt: row.endAt?.toISOString() ?? null,
    durationSec: row.durationSec,
    fileSizeBytes: row.fileSizeBytes,
    playbackPath: row.playbackPath,
    syncedAt: row.syncedAt.toISOString(),
  };
}

export async function upsertCameraRecordings(files: NormalizedVideoFile[]): Promise<number> {
  if (!files.length) return 0;
  if (!isDatabaseConfigured()) return fileStore.upsertCameraRecordingsFile(files);

  const prisma = getPrisma();
  let count = 0;
  for (const f of files) {
    await prisma.cameraRecording.upsert({
      where: { fileKey: f.fileKey },
      create: {
        id: randomUUID(),
        devIdno: f.devIdno,
        plate: f.plate,
        role: f.role,
        channel: f.channel,
        fileKey: f.fileKey,
        fileName: f.fileName,
        beginAt: new Date(f.beginAt),
        endAt: f.endAt ? new Date(f.endAt) : null,
        durationSec: f.durationSec,
        fileSizeBytes: f.fileSizeBytes,
        loc: f.loc,
        playbackPath: f.playbackPath,
        raw: f.raw as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
      update: {
        plate: f.plate,
        fileName: f.fileName,
        endAt: f.endAt ? new Date(f.endAt) : null,
        durationSec: f.durationSec,
        fileSizeBytes: f.fileSizeBytes,
        playbackPath: f.playbackPath,
        raw: f.raw as Prisma.InputJsonValue,
        syncedAt: new Date(),
      },
    });
    count++;
  }
  return count;
}

export async function listCameraRecordings(opts: {
  role: CameraRole;
  plate?: string;
  devIdno?: string;
  sinceMs?: number;
  limit?: number;
}): Promise<{ source: "database" | "app"; recordings: CameraRecordingRow[] }> {
  const limit = opts.limit ?? 100;
  if (!isDatabaseConfigured()) {
    const recordings = await fileStore.listCameraRecordingsFile(opts);
    return { source: "app", recordings };
  }

  const rows = await getPrisma().cameraRecording.findMany({
    where: {
      role: opts.role,
      ...(opts.plate ? { plate: opts.plate } : {}),
      ...(opts.devIdno ? { devIdno: opts.devIdno } : {}),
      ...(opts.sinceMs != null ? { beginAt: { gte: new Date(opts.sinceMs) } } : {}),
    },
    orderBy: { beginAt: "desc" },
    take: limit,
  });
  return { source: "database", recordings: rows.map(toRow) };
}
