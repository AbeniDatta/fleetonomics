import { extractDevIdno } from "@/lib/uctracking/extract-dev-idno";
import type { Vehicle } from "@/lib/uctracking/schemas";

export type FuelPerVehicleRow = {
  vehicleId: string;
  devIdno: string;
  plate: string;
  fuelVolumeL: number | null;
  speedKmh: number | null;
};

function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

function rowKeys(r: Record<string, unknown>): { devIdno: string; plate: string } {
  const devIdno = String(r.id ?? r.devIdno ?? r.devIDNO ?? r.di ?? r.did ?? "").trim();
  const plate = String(r.vid ?? r.vi ?? r.nm ?? r.vehicleNo ?? r.plate ?? "").trim();
  return { devIdno, plate };
}

/**
 * 808GPS getDeviceStatus: `yl` (油量) is reported in 0.01 L increments (e.g. 4523 → 45.23 L).
 * `oil` often uses the same encoding when values are large; 0–100 usually means tank %, not litres.
 */
function extractFuelLiters(r: Record<string, unknown>): number | null {
  const yl = toNum(r.yl ?? r.YL ?? r.youLiang);
  if (yl != null) {
    const liters = yl / 100;
    return liters >= 0 ? liters : null;
  }

  const oilL = toNum(r.oilL ?? r.fuelL);
  if (oilL != null) return oilL >= 0 ? oilL : null;

  const oil = toNum(r.oil);
  if (oil != null) {
    if (oil > 500) return oil / 100;
    if (oil <= 100) return null;
    return oil;
  }

  const ft = toNum(r.ft);
  if (ft != null) {
    if (ft > 500) return ft / 100;
    if (ft > 100) return ft;
    return null;
  }

  const fuel = toNum(r.fuel);
  if (fuel != null) {
    if (fuel > 500) return fuel / 100;
    if (fuel <= 100) return null;
    return fuel;
  }

  return null;
}

function extractSpeedKmh(r: Record<string, unknown>): number | null {
  const sp = toNum(r.sp ?? r.speed ?? r.speedKmh);
  if (sp == null) return null;
  return sp;
}

function indexStatusRows(rows: unknown[]): {
  byDev: Map<string, Record<string, unknown>>;
  byPlate: Map<string, Record<string, unknown>>;
} {
  const byDev = new Map<string, Record<string, unknown>>();
  const byPlate = new Map<string, Record<string, unknown>>();
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const { devIdno, plate } = rowKeys(r);
    if (devIdno) byDev.set(devIdno, r);
    if (plate) byPlate.set(plate, r);
  }
  return { byDev, byPlate };
}

export function buildFuelPerVehicleRows(vehicles: Vehicle[], deviceStatusRows: unknown[]): FuelPerVehicleRow[] {
  const { byDev, byPlate } = indexStatusRows(deviceStatusRows);

  return vehicles.map((v) => {
    const devFromVehicle = v.devIdno?.trim() || extractDevIdno(v as unknown as Record<string, unknown>);
    const devIdno = devFromVehicle || v.plate;
    const status =
      (devFromVehicle ? byDev.get(devFromVehicle) : undefined) ??
      byDev.get(devIdno) ??
      byPlate.get(v.plate) ??
      undefined;

    const fuelVolumeL = status ? extractFuelLiters(status) : null;
    const speedKmh = status ? extractSpeedKmh(status) : null;

    return {
      vehicleId: v.id,
      devIdno,
      plate: v.plate,
      fuelVolumeL,
      speedKmh,
    };
  });
}

export function fuelPerVehicleMetrics(rows: FuelPerVehicleRow[]) {
  const withVolume = rows.filter((r) => r.fuelVolumeL != null);
  const withSpeed = rows.filter((r) => r.speedKmh != null);
  const avgVolume =
    withVolume.length > 0
      ? withVolume.reduce((s, r) => s + (r.fuelVolumeL ?? 0), 0) / withVolume.length
      : null;
  const movingCount = rows.filter((r) => (r.speedKmh ?? 0) > 0).length;
  const totalFleetFuelL = withVolume.reduce((s, r) => s + (r.fuelVolumeL ?? 0), 0);

  return {
    total: rows.length,
    withVolumeCount: withVolume.length,
    withSpeedCount: withSpeed.length,
    avgVolumeL: avgVolume,
    movingCount,
    totalFleetFuelL: withVolume.length > 0 ? totalFleetFuelL : null,
  };
}
