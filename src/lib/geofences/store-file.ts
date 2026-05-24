import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { GeofenceRing, SavedGeofence } from "./types";

const DATA_DIR = process.env.GEOFENCE_DATA_DIR ?? path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "geofences.json");

type StoreFile = { version: 1; items: SavedGeofence[] };

let chain: Promise<unknown> = Promise.resolve();

function withLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = chain.then(fn, fn);
  chain = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

async function readAll(): Promise<StoreFile> {
  try {
    const raw = await readFile(FILE, "utf8");
    const j = JSON.parse(raw) as StoreFile;
    if (j?.version !== 1 || !Array.isArray(j.items)) return { version: 1, items: [] };
    return j;
  } catch {
    return { version: 1, items: [] };
  }
}

async function writeAll(data: StoreFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export function isValidRing(ring: GeofenceRing): boolean {
  if (!Array.isArray(ring) || ring.length < 3) return false;
  for (const pt of ring) {
    if (!Array.isArray(pt) || pt.length < 2) return false;
    const lat = Number(pt[0]);
    const lng = Number(pt[1]);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) return false;
    if (Math.abs(lat) > 90 || Math.abs(lng) > 180) return false;
  }
  return true;
}

export async function listGeofencesForUser(userId: string): Promise<SavedGeofence[]> {
  const { items } = await readAll();
  return items.filter((g) => g.userId === userId).sort((a, b) => a.name.localeCompare(b.name));
}

export async function createGeofence(
  userId: string,
  body: { name: string; ring: GeofenceRing; enabled?: boolean },
): Promise<SavedGeofence | { error: string }> {
  const name = body.name?.trim() || "Geofence";
  if (!isValidRing(body.ring)) return { error: "ring must have at least 3 valid [lat,lng] points" };
  return withLock(async () => {
    const store = await readAll();
    const now = new Date().toISOString();
    const row: SavedGeofence = {
      id: randomUUID(),
      userId,
      name: name.slice(0, 200),
      ring: body.ring.map(([a, b]) => [Number(a), Number(b)] as [number, number]),
      enabled: body.enabled !== false,
      createdAt: now,
      updatedAt: now,
    };
    store.items.push(row);
    await writeAll(store);
    return row;
  });
}

export async function updateGeofence(
  userId: string,
  id: string,
  patch: Partial<{ name: string; ring: GeofenceRing; enabled: boolean }>,
): Promise<SavedGeofence | { error: string }> {
  return withLock(async () => {
    const store = await readAll();
    const idx = store.items.findIndex((g) => g.id === id && g.userId === userId);
    if (idx < 0) return { error: "not_found" };
    const cur = store.items[idx]!;
    if (patch.ring != null) {
      if (!isValidRing(patch.ring)) return { error: "invalid_ring" };
      cur.ring = patch.ring.map(([a, b]) => [Number(a), Number(b)] as [number, number]);
    }
    if (patch.name != null) cur.name = patch.name.trim().slice(0, 200) || cur.name;
    if (patch.enabled != null) cur.enabled = patch.enabled;
    cur.updatedAt = new Date().toISOString();
    await writeAll(store);
    return cur;
  });
}

export async function deleteGeofence(userId: string, id: string): Promise<boolean> {
  return withLock(async () => {
    const store = await readAll();
    const before = store.items.length;
    store.items = store.items.filter((g) => !(g.id === id && g.userId === userId));
    if (store.items.length === before) return false;
    await writeAll(store);
    return true;
  });
}
