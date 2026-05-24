import { dailyKmFromStatusRow } from "@/lib/dashboard/metrics";
import type { Alarm, Vehicle } from "@/lib/uctracking/schemas";
import { formatPlateNumberCell } from "@/lib/vehicle-plates/keys";

export type ReportChartPoint = { label: string; value: number };

export type TopVehicleRow = {
  key: string;
  deviceLabel: string;
  plateNumber: string;
  km: number;
  score: number | null;
};

function statusDevIdno(r: Record<string, unknown>): string {
  return String(r.id ?? r.devIdno ?? r.devIDNO ?? "").trim();
}

function vehicleLabel(v: Vehicle | undefined, devIdno: string): string {
  if (v?.plateNumber?.trim()) return v.plateNumber.trim();
  if (v?.plate?.trim()) return v.plate.trim();
  return devIdno || "—";
}

export function indexVehiclesByDev(vehicles: Vehicle[]): Map<string, Vehicle> {
  const map = new Map<string, Vehicle>();
  for (const v of vehicles) {
    const dev = v.devIdno?.trim();
    if (dev) map.set(dev, v);
    map.set(v.plate.trim(), v);
    map.set(v.id, v);
  }
  return map;
}

export function buildTopVehiclesByKm(statusRows: unknown[], vehicles: Vehicle[], limit = 10): TopVehicleRow[] {
  const byDev = indexVehiclesByDev(vehicles);
  const rows: TopVehicleRow[] = [];

  for (const raw of statusRows) {
    if (!raw || typeof raw !== "object") continue;
    const r = raw as Record<string, unknown>;
    const devIdno = statusDevIdno(r);
    if (!devIdno) continue;
    const km = dailyKmFromStatusRow(r);
    if (km <= 0) continue;
    const v = byDev.get(devIdno);
    rows.push({
      key: devIdno,
      deviceLabel: v?.plate?.trim() || devIdno,
      plateNumber: formatPlateNumberCell(v?.plateNumber),
      km: Math.round(km * 10) / 10,
      score: v?.driverScore ?? null,
    });
  }

  return rows.sort((a, b) => b.km - a.km).slice(0, limit);
}

export function perVehicleKmChart(statusRows: unknown[], vehicles: Vehicle[], limit = 12): ReportChartPoint[] {
  return buildTopVehiclesByKm(statusRows, vehicles, limit).map((r) => ({
    label: r.deviceLabel.length > 12 ? `${r.deviceLabel.slice(0, 11)}…` : r.deviceLabel,
    value: r.km,
  }));
}

export function perVehicleFuelChart(
  fuelRows: { plate: string; devIdno: string; fuelVolumeL: number | null }[],
  limit = 12,
): ReportChartPoint[] {
  return [...fuelRows]
    .filter((r) => r.fuelVolumeL != null && r.fuelVolumeL > 0)
    .sort((a, b) => (b.fuelVolumeL ?? 0) - (a.fuelVolumeL ?? 0))
    .slice(0, limit)
    .map((r) => {
      const label = (r.plate || r.devIdno).trim();
      return {
        label: label.length > 12 ? `${label.slice(0, 11)}…` : label,
        value: Math.round((r.fuelVolumeL ?? 0) * 10) / 10,
      };
    });
}

export function driverScoreChart(vehicles: Vehicle[], limit = 12): ReportChartPoint[] {
  return [...vehicles]
    .filter((v) => v.driverScore != null && Number.isFinite(v.driverScore))
    .sort((a, b) => (b.driverScore ?? 0) - (a.driverScore ?? 0))
    .slice(0, limit)
    .map((v) => {
      const label = v.plateNumber?.trim() || v.plate;
      return {
        label: label.length > 12 ? `${label.slice(0, 11)}…` : label,
        value: v.driverScore ?? 0,
      };
    });
}

export function safetyAlarmsBySeverityChart(alarms: Alarm[]): ReportChartPoint[] {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  for (const a of alarms) {
    const s = a.severity ?? "low";
    if (s in counts) counts[s as keyof typeof counts] += 1;
    else counts.low += 1;
  }
  return (Object.entries(counts) as [string, number][])
    .filter(([, n]) => n > 0)
    .map(([label, value]) => ({ label, value }));
}

export function openAlarmsChart(alarms: Alarm[]): ReportChartPoint[] {
  const open = alarms.filter((a) => a.acknowledged !== true).length;
  const ack = alarms.length - open;
  const pts: ReportChartPoint[] = [];
  if (open > 0) pts.push({ label: "Open", value: open });
  if (ack > 0) pts.push({ label: "Acknowledged", value: ack });
  return pts;
}
