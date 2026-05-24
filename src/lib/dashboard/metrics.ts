function toNum(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v === "string" && v.trim()) {
    const n = Number(v.replace(/,/g, ""));
    if (Number.isFinite(n)) return n;
  }
  return null;
}

/** Daily distance from a getDeviceStatus / GPS status row (km). */
export function dailyKmFromStatusRow(r: Record<string, unknown>): number {
  const raw = toNum(r.lc ?? r.todayMile ?? r.mileage ?? r.todayLicheng ?? r.dkm ?? r.dayMile);
  if (raw == null || raw < 0) return 0;
  // Vendor often uses fixed-point (0.01 km) for licheng-style fields.
  if (raw > 50_000) return raw / 100;
  if (raw > 5_000) return raw / 10;
  return raw;
}

export function sumKmTodayFromStatusRows(rows: unknown[]): number {
  let sum = 0;
  for (const raw of rows) {
    if (!raw || typeof raw !== "object") continue;
    sum += dailyKmFromStatusRow(raw as Record<string, unknown>);
  }
  return Math.round(sum * 10) / 10;
}

const HOUR_LABELS = ["12a", "2a", "4a", "6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"];

export function emptyHourlyFuelSeries(): { hour: string; liters: number }[] {
  return HOUR_LABELS.map((hour) => ({ hour, liters: 0 }));
}

/** Bucket fuel report points into 2-hour slots for the dashboard chart. */
export function bucketFuelPointsToHourly(
  points: { t: string; fuelL: number | null }[],
): { hour: string; liters: number }[] {
  const slotTotals = new Array(HOUR_LABELS.length).fill(0) as number[];

  for (const p of points) {
    const fuel = p.fuelL;
    if (fuel == null || !Number.isFinite(fuel) || fuel <= 0) continue;
    const d = new Date(p.t);
    if (Number.isNaN(d.valueOf())) continue;
    const slot = Math.min(HOUR_LABELS.length - 1, Math.floor(d.getHours() / 2));
    slotTotals[slot] += fuel;
  }

  return HOUR_LABELS.map((hour, i) => ({
    hour,
    liters: Math.round(slotTotals[i] * 10) / 10,
  }));
}
