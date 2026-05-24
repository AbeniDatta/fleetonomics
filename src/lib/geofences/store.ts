import { randomUUID } from "crypto";
import type { Geofence as PrismaGeofence } from "@prisma/client";
import { getPrisma } from "@/lib/db";
import type { GeofenceRing, SavedGeofence } from "./types";
import { resolvePersistedUserId } from "./persist-user";
import * as fileStore from "./store-file";

function toSavedGeofence(row: PrismaGeofence, sessionUserId: string): SavedGeofence {
  return {
    id: row.id,
    userId: sessionUserId,
    name: row.name,
    ring: row.ring as GeofenceRing,
    enabled: row.enabled,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function dbUserId(sessionUserId: string): Promise<string | null> {
  return resolvePersistedUserId(sessionUserId);
}

export async function listGeofencesForUser(sessionUserId: string): Promise<SavedGeofence[]> {
  const userId = await dbUserId(sessionUserId);
  if (!userId) return fileStore.listGeofencesForUser(sessionUserId);

  const rows = await getPrisma().geofence.findMany({
    where: { userId, deletedAt: null },
    orderBy: { name: "asc" },
  });
  return rows.map((row) => toSavedGeofence(row, sessionUserId));
}

export async function createGeofence(
  sessionUserId: string,
  body: { name: string; ring: GeofenceRing; enabled?: boolean },
): Promise<SavedGeofence | { error: string }> {
  const name = body.name?.trim() || "Geofence";
  if (!fileStore.isValidRing(body.ring)) {
    return { error: "ring must have at least 3 valid [lat,lng] points" };
  }

  const userId = await dbUserId(sessionUserId);
  if (!userId) return fileStore.createGeofence(sessionUserId, body);

  const ring = body.ring.map(([a, b]) => [Number(a), Number(b)] as [number, number]);
  const row = await getPrisma().geofence.create({
    data: {
      id: randomUUID(),
      userId,
      name: name.slice(0, 200),
      ring,
      enabled: body.enabled !== false,
    },
  });
  return toSavedGeofence(row, sessionUserId);
}

export async function updateGeofence(
  sessionUserId: string,
  id: string,
  patch: Partial<{ name: string; ring: GeofenceRing; enabled: boolean }>,
): Promise<SavedGeofence | { error: string }> {
  const userId = await dbUserId(sessionUserId);
  if (!userId) return fileStore.updateGeofence(sessionUserId, id, patch);

  const existing = await getPrisma().geofence.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!existing) return { error: "not_found" };

  if (patch.ring != null && !fileStore.isValidRing(patch.ring)) {
    return { error: "invalid_ring" };
  }

  const row = await getPrisma().geofence.update({
    where: { id },
    data: {
      ...(patch.name != null ? { name: patch.name.trim().slice(0, 200) || existing.name } : {}),
      ...(patch.ring != null
        ? { ring: patch.ring.map(([a, b]) => [Number(a), Number(b)] as [number, number]) }
        : {}),
      ...(patch.enabled != null ? { enabled: patch.enabled } : {}),
    },
  });
  return toSavedGeofence(row, sessionUserId);
}

export async function deleteGeofence(sessionUserId: string, id: string): Promise<boolean> {
  const userId = await dbUserId(sessionUserId);
  if (!userId) return fileStore.deleteGeofence(sessionUserId, id);

  const existing = await getPrisma().geofence.findFirst({
    where: { id, userId, deletedAt: null },
  });
  if (!existing) return false;

  await getPrisma().geofence.update({
    where: { id },
    data: { deletedAt: new Date() },
  });
  return true;
}
