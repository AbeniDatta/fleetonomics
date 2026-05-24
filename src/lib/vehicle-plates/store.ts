import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import * as fileStore from "./store-file";

function isMissingTableError(e: unknown): boolean {
  if (!e || typeof e !== "object") return false;
  const code = (e as { code?: string }).code;
  if (code === "P2021") return true;
  const msg = String((e as { message?: string }).message ?? "");
  return /does not exist/i.test(msg) && /VehiclePlateOverride/i.test(msg);
}

export async function listPlateOverridesMap(): Promise<Map<string, string>> {
  if (!isDatabaseConfigured()) return fileStore.listPlateOverridesFile();

  try {
    const rows = await getPrisma().vehiclePlateOverride.findMany({
      select: { devIdno: true, plateNumber: true },
    });
    const map = new Map<string, string>();
    for (const row of rows) {
      const t = row.plateNumber?.trim() ?? "";
      if (t) map.set(row.devIdno, t);
    }
    return map;
  } catch (e) {
    if (isMissingTableError(e)) {
      console.warn(
        "[fleet] VehiclePlateOverride table missing — run `npx prisma migrate deploy`. Using file fallback for plate overrides.",
      );
      return fileStore.listPlateOverridesFile();
    }
    console.error("[fleet] Could not load vehicle plate overrides from database", e);
    return new Map();
  }
}

export async function setPlateOverride(
  devIdno: string,
  plateNumber: string | null,
  updatedBy?: string | null,
): Promise<{ devIdno: string; plateNumber: string | null } | { error: string }> {
  const key = devIdno.trim().slice(0, 64);
  if (!key) return { error: "invalid_key" };

  const trimmed = plateNumber?.trim().slice(0, 64) ?? "";
  const value = trimmed.length > 0 ? trimmed : null;

  if (!isDatabaseConfigured()) {
    return fileStore.setPlateOverrideFile(key, value);
  }

  try {
    await getPrisma().vehiclePlateOverride.upsert({
      where: { devIdno: key },
      create: {
        devIdno: key,
        plateNumber: value,
        updatedBy: updatedBy ?? null,
      },
      update: {
        plateNumber: value,
        updatedBy: updatedBy ?? null,
      },
    });
    return { devIdno: key, plateNumber: value };
  } catch (e) {
    if (isMissingTableError(e)) {
      return fileStore.setPlateOverrideFile(key, value);
    }
    throw e;
  }
}
