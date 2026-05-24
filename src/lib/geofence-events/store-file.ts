import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { GeofenceEvent, GeofenceEventKind } from "./types";

const DATA_DIR = process.env.GEOFENCE_DATA_DIR ?? path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "geofence-events.json");

type StoreFile = { version: 1; items: GeofenceEvent[] };

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

export async function appendGeofenceEvents(
  userId: string,
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
  return withLock(async () => {
    const store = await readAll();
    const now = Date.now();
    const saved: GeofenceEvent[] = events.map((e) => ({
      id: randomUUID(),
      userId,
      fenceId: e.fenceId,
      fenceName: e.fenceName,
      vehicleId: e.vehicleId,
      plate: e.plate,
      kind: e.kind,
      message: e.message,
      at: e.at ?? new Date(now).toISOString(),
      lat: e.lat,
      lng: e.lng,
    }));
    store.items.push(...saved);

    const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
    store.items = store.items.filter((it) => {
      if (it.userId !== userId) return true;
      const t = Date.parse(it.at);
      return Number.isFinite(t) ? t >= cutoff : true;
    });

    await writeAll(store);
    return { saved };
  });
}

export async function listGeofenceEventsForUser(userId: string, sinceMs: number): Promise<GeofenceEvent[]> {
  const { items } = await readAll();
  return items
    .filter((e) => e.userId === userId)
    .filter((e) => {
      const t = Date.parse(e.at);
      return Number.isFinite(t) ? t >= sinceMs : true;
    })
    .sort((a, b) => Date.parse(b.at) - Date.parse(a.at))
    .slice(0, 500);
}
