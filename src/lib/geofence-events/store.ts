import { randomUUID } from "crypto";
import type { GeofenceEvent as PrismaGeofenceEvent } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import { ensurePersistedUserId } from "@/lib/geofences/persist-user";
import type { GeofenceEvent, GeofenceEventKind } from "./types";
import * as fileStore from "./store-file";

const RETENTION_MS = 7 * 24 * 60 * 60 * 1000;

function toGeofenceEvent(row: PrismaGeofenceEvent, sessionUserId: string): GeofenceEvent {
  return {
    id: row.id,
    userId: sessionUserId,
    fenceId: row.geofenceId ?? "",
    fenceName: row.fenceName,
    vehicleId: row.vehicleId,
    plate: row.plate,
    kind: row.kind as GeofenceEventKind,
    message: row.message,
    at: row.occurredAt.toISOString(),
    lat: row.lat,
    lng: row.lng,
  };
}

async function dbUserId(sessionUserId: string): Promise<string | null> {
  return ensurePersistedUserId(sessionUserId);
}

async function pruneOldEvents(userId: string): Promise<void> {
  const cutoff = new Date(Date.now() - RETENTION_MS);
  await getPrisma().geofenceEvent.deleteMany({
    where: { userId, occurredAt: { lt: cutoff } },
  });
}

export async function appendGeofenceEvents(
  sessionUserId: string,
  events: Array<{
    fenceId: string;
    fenceName: string;
    vehicleId: string;
    plate: string;
    kind: GeofenceEventKind;
    message: string;
    at?: string;
    lat: number;
    lng: number;
  }>,
): Promise<{ saved: GeofenceEvent[] }> {
  const userId = await dbUserId(sessionUserId);
  if (!userId) return fileStore.appendGeofenceEvents(sessionUserId, events);

  const prisma = getPrisma();
  const rows = await prisma.$transaction(
    events.map((e) =>
      prisma.geofenceEvent.create({
        data: {
          id: randomUUID(),
          userId,
          geofenceId: e.fenceId || null,
          fenceName: e.fenceName,
          vehicleId: e.vehicleId,
          plate: e.plate,
          kind: e.kind,
          message: e.message,
          lat: e.lat,
          lng: e.lng,
          occurredAt: e.at ? new Date(e.at) : new Date(),
        },
      }),
    ),
  );

  await pruneOldEvents(userId);
  return { saved: rows.map((row) => toGeofenceEvent(row, sessionUserId)) };
}

export async function listGeofenceEventsForUser(
  sessionUserId: string,
  sinceMs: number,
): Promise<GeofenceEvent[]> {
  const userId = await dbUserId(sessionUserId);
  if (!userId) return fileStore.listGeofenceEventsForUser(sessionUserId, sinceMs);

  const rows = await getPrisma().geofenceEvent.findMany({
    where: {
      userId,
      occurredAt: { gte: new Date(sinceMs) },
    },
    orderBy: { occurredAt: "desc" },
    take: 500,
  });
  return rows.map((row) => toGeofenceEvent(row, sessionUserId));
}
