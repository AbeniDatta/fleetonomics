import type { Alarm, Position, Vehicle } from "@/lib/uctracking/schemas";
import type { FuelPerVehicleRow } from "@/lib/uctracking/normalize-fleet-fuel-snapshot";

export type DashboardVehicleTableRow = {
  vehicleId: string;
  plate: string;
  driverName: string | null;
  lat: number | null;
  lng: number | null;
  status: string;
  speedKmh: number | null;
  fuelVolumeL: number | null;
  alarmMessage: string | null;
  alarmSeverity: Alarm["severity"] | null;
};

function indexPositions(positions: Position[]) {
  const byKey = new Map<string, { lat: number; lng: number; speedKmh: number | null }>();
  for (const p of positions) {
    const entry = { lat: p.lat, lng: p.lng, speedKmh: p.speedKmh ?? null };
    if (p.plate) byKey.set(p.plate, entry);
    byKey.set(p.vehicleId, entry);
  }
  return byKey;
}

function indexFuelRows(rows: FuelPerVehicleRow[]) {
  const byKey = new Map<string, FuelPerVehicleRow>();
  for (const row of rows) {
    byKey.set(row.plate, row);
    if (row.devIdno) byKey.set(row.devIdno, row);
  }
  return byKey;
}

/** Latest unacknowledged alarm per plate (most recent first). */
function indexOpenAlarms(alarms: Alarm[]) {
  const byPlate = new Map<string, Alarm>();
  const sorted = [...alarms]
    .filter((a) => a.acknowledged !== true)
    .sort((a, b) => new Date(b.raisedAt).valueOf() - new Date(a.raisedAt).valueOf());
  for (const a of sorted) {
    const key = a.plate ?? a.vehicleId;
    if (key && !byPlate.has(key)) byPlate.set(key, a);
  }
  return byPlate;
}

export function buildDashboardVehicleTableRows(
  vehicles: Vehicle[],
  positions: Position[],
  fuelRows: FuelPerVehicleRow[],
  alarms: Alarm[],
): DashboardVehicleTableRow[] {
  const posByKey = indexPositions(positions);
  const fuelByKey = indexFuelRows(fuelRows);
  const alarmByPlate = indexOpenAlarms(alarms);

  return vehicles.map((v) => {
    const fuel = fuelByKey.get(v.plate) ?? (v.devIdno ? fuelByKey.get(v.devIdno) : undefined);
    const livePos =
      posByKey.get(v.plate) ??
      (v.devIdno ? posByKey.get(v.devIdno) : undefined) ??
      posByKey.get(v.id);
    const lat = v.position?.lat ?? livePos?.lat ?? null;
    const lng = v.position?.lng ?? livePos?.lng ?? null;

    const alarm = alarmByPlate.get(v.plate) ?? alarmByPlate.get(v.id);

    return {
      vehicleId: v.id,
      plate: v.plate,
      driverName: v.driverName ?? null,
      lat,
      lng,
      status: v.status,
      speedKmh: fuel?.speedKmh ?? livePos?.speedKmh ?? v.speedKmh ?? null,
      fuelVolumeL: fuel?.fuelVolumeL ?? null,
      alarmMessage: alarm?.message ?? v.alarmSummary ?? null,
      alarmSeverity: alarm?.severity ?? null,
    };
  });
}

export function formatLatLng(lat: number | null, lng: number | null): string {
  if (lat == null || lng == null || !Number.isFinite(lat) || !Number.isFinite(lng)) return "—";
  return `${lat.toFixed(5)}, ${lng.toFixed(5)}`;
}
