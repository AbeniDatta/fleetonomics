import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import type { NormalizedVideoFile } from "@/lib/uctracking/normalize-video-files";
import type { CameraRole } from "@/lib/uctracking/camera-channels";
import type { CameraRecordingRow } from "./types";

const DATA_DIR = process.env.CAMERA_RECORDINGS_DATA_DIR ?? path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "camera-recordings.json");

type StoreFile = { version: 1; items: CameraRecordingRow[] };

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

function toRow(file: NormalizedVideoFile): CameraRecordingRow {
  return {
    id: randomUUID(),
    devIdno: file.devIdno,
    plate: file.plate,
    role: file.role,
    channel: file.channel,
    fileName: file.fileName,
    beginAt: file.beginAt,
    endAt: file.endAt,
    durationSec: file.durationSec,
    fileSizeBytes: file.fileSizeBytes,
    playbackPath: file.playbackPath,
    syncedAt: new Date().toISOString(),
  };
}

export async function upsertCameraRecordingsFile(files: NormalizedVideoFile[]): Promise<number> {
  if (!files.length) return 0;
  return withLock(async () => {
    const store = await readAll();
    const byKey = new Map(store.items.map((r) => [`${r.devIdno}|${r.role}|${r.beginAt}|${r.fileName ?? ""}`, r]));
    let added = 0;
    for (const f of files) {
      const key = `${f.devIdno}|${f.role}|${f.beginAt}|${f.fileName ?? f.playbackPath ?? ""}`;
      if (byKey.has(key)) {
        const existing = byKey.get(key)!;
        existing.syncedAt = new Date().toISOString();
        continue;
      }
      const row = toRow(f);
      store.items.push(row);
      byKey.set(key, row);
      added++;
    }
    store.items.sort((a, b) => b.beginAt.localeCompare(a.beginAt));
    if (store.items.length > 5000) store.items = store.items.slice(0, 5000);
    await writeAll(store);
    return added;
  });
}

export async function listCameraRecordingsFile(opts: {
  role: CameraRole;
  plate?: string;
  devIdno?: string;
  sinceMs?: number;
  limit?: number;
}): Promise<CameraRecordingRow[]> {
  const store = await readAll();
  const limit = opts.limit ?? 100;
  return store.items
    .filter((r) => {
      if (r.role !== opts.role) return false;
      if (opts.plate && r.plate !== opts.plate) return false;
      if (opts.devIdno && r.devIdno !== opts.devIdno) return false;
      if (opts.sinceMs != null && new Date(r.beginAt).valueOf() < opts.sinceMs) return false;
      return true;
    })
    .slice(0, limit);
}
