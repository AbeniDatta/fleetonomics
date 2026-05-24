import { mkdir, readFile, writeFile } from "fs/promises";
import path from "path";

const DATA_DIR = process.env.GEOFENCE_DATA_DIR ?? path.join(process.cwd(), "data");
const FILE = path.join(DATA_DIR, "vehicle-plates.json");

type StoreFile = {
  version: 1;
  /** devIdno (or fallback key) → custom plate number; empty string clears */
  plates: Record<string, string>;
};

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
    if (j?.version !== 1 || typeof j.plates !== "object" || j.plates === null) {
      return { version: 1, plates: {} };
    }
    return j;
  } catch {
    return { version: 1, plates: {} };
  }
}

async function writeAll(data: StoreFile): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await writeFile(FILE, `${JSON.stringify(data, null, 2)}\n`, "utf8");
}

export async function listPlateOverridesFile(): Promise<Map<string, string>> {
  const data = await readAll();
  const map = new Map<string, string>();
  for (const [key, value] of Object.entries(data.plates)) {
    const t = String(value).trim();
    if (t) map.set(key, t);
  }
  return map;
}

export async function setPlateOverrideFile(
  devIdno: string,
  plateNumber: string | null,
): Promise<{ devIdno: string; plateNumber: string | null } | { error: string }> {
  const key = devIdno.trim();
  if (!key) return { error: "invalid_key" };

  return withLock(async () => {
    const data = await readAll();
    const trimmed = plateNumber?.trim() ?? "";
    if (trimmed) data.plates[key] = trimmed.slice(0, 64);
    else delete data.plates[key];
    await writeAll(data);
    return { devIdno: key, plateNumber: trimmed || null };
  });
}
