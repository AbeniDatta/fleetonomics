/** Extract device id from uctracking vehicle / device rows (device list lives under `dl`). */
export function extractDevIdno(row: Record<string, unknown>): string | null {
  const top =
    row.devIdno ??
    row.devIDNO ??
    row.DevIDNO ??
    row.deviceId ??
    row.did ??
    row.devId ??
    row.di;
  if (typeof top === "string" && top.trim()) return top.trim();
  if (typeof top === "number" && Number.isFinite(top)) return String(top);

  const dl = row.dl;
  if (Array.isArray(dl) && dl.length > 0) {
    const first = dl[0];
    if (first && typeof first === "object") {
      const d = first as Record<string, unknown>;
      const id = d.id ?? d.devIdno ?? d.devIDNO ?? d.DevIDNO;
      if (typeof id === "string" && id.trim()) return id.trim();
      if (typeof id === "number" && Number.isFinite(id)) return String(id);
    }
  }
  return null;
}
