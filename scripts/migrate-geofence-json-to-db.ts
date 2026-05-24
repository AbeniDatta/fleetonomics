/**
 * Import legacy data/geofences.json + geofence-events.json into PostgreSQL.
 * Run after: npx prisma migrate dev && npm run db:seed
 *
 * Usage: npm run db:migrate-geofences
 */
import { config } from "dotenv";
import { readFile } from "fs/promises";
import path from "path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@prisma/client";
import { Pool } from "pg";
import type { SavedGeofence } from "../src/lib/geofences/types";
import type { GeofenceEvent } from "../src/lib/geofence-events/types";

config({ path: ".env.local" });
config({ path: ".env" });

const DATA_DIR = process.env.GEOFENCE_DATA_DIR ?? path.join(process.cwd(), "data");
const GEOFENCES_FILE = path.join(DATA_DIR, "geofences.json");
const EVENTS_FILE = path.join(DATA_DIR, "geofence-events.json");

async function readJsonFile<T>(file: string, key: "items"): Promise<T[]> {
  try {
    const raw = await readFile(file, "utf8");
    const j = JSON.parse(raw) as { version?: number; items?: T[] };
    if (j?.version !== 1 || !Array.isArray(j.items)) return [];
    return j.items;
  } catch {
    return [];
  }
}

async function resolveDbUserId(
  prisma: PrismaClient,
  legacyUserId: string,
): Promise<string | null> {
  const direct = await prisma.user.findUnique({ where: { id: legacyUserId }, select: { id: true } });
  if (direct) return direct.id;

  const demoEmail = process.env.AUTH_DEMO_EMAIL ?? "ops@nlng.local";
  const demo = await prisma.user.findUnique({ where: { email: demoEmail }, select: { id: true } });
  if (demo && (legacyUserId === "demo-ops" || legacyUserId.startsWith("email:"))) {
    return demo.id;
  }

  return null;
}

async function main() {
  const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("Set DIRECT_URL or DATABASE_URL in .env.local");
  }

  const pool = new Pool({ connectionString });
  const prisma = new PrismaClient({ adapter: new PrismaPg(pool) });

  const geofences = await readJsonFile<SavedGeofence>(GEOFENCES_FILE, "items");
  const events = await readJsonFile<GeofenceEvent>(EVENTS_FILE, "items");

  if (geofences.length === 0 && events.length === 0) {
    console.log("No JSON geofence data to import.");
    await prisma.$disconnect();
    await pool.end();
    return;
  }

  const userCache = new Map<string, string>();
  async function userFor(legacyUserId: string): Promise<string | null> {
    if (userCache.has(legacyUserId)) return userCache.get(legacyUserId)!;
    const id = await resolveDbUserId(prisma, legacyUserId);
    if (id) userCache.set(legacyUserId, id);
    return id;
  }

  let fenceCount = 0;
  for (const g of geofences) {
    const userId = await userFor(g.userId);
    if (!userId) {
      console.warn(`Skipping geofence ${g.id}: no User row for legacy userId "${g.userId}"`);
      continue;
    }
    await prisma.geofence.upsert({
      where: { id: g.id },
      create: {
        id: g.id,
        userId,
        name: g.name,
        ring: g.ring,
        enabled: g.enabled,
        createdAt: new Date(g.createdAt),
        updatedAt: new Date(g.updatedAt),
      },
      update: {
        userId,
        name: g.name,
        ring: g.ring,
        enabled: g.enabled,
        updatedAt: new Date(g.updatedAt),
        deletedAt: null,
      },
    });
    fenceCount++;
  }

  let eventCount = 0;
  for (const e of events) {
    const userId = await userFor(e.userId);
    if (!userId) {
      console.warn(`Skipping event ${e.id}: no User row for legacy userId "${e.userId}"`);
      continue;
    }
    const occurredAt = new Date(e.at);
    await prisma.geofenceEvent.upsert({
      where: { id: e.id },
      create: {
        id: e.id,
        userId,
        geofenceId: e.fenceId || null,
        fenceName: e.fenceName,
        vehicleId: e.vehicleId,
        plate: e.plate,
        kind: e.kind,
        message: e.message,
        lat: e.lat,
        lng: e.lng,
        occurredAt: Number.isFinite(occurredAt.valueOf()) ? occurredAt : new Date(),
      },
      update: {
        userId,
        geofenceId: e.fenceId || null,
        fenceName: e.fenceName,
        message: e.message,
        occurredAt: Number.isFinite(occurredAt.valueOf()) ? occurredAt : new Date(),
      },
    });
    eventCount++;
  }

  console.log(`Imported ${fenceCount} geofence(s) and ${eventCount} event(s) from ${DATA_DIR}`);
  await prisma.$disconnect();
  await pool.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
