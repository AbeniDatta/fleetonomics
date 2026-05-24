/** Best-effort mapping for StandardApiAction_queryDriverList.action responses */

export type DriverListRow = {
  id: string;
  workNumber: string;
  name: string;
  contact: string;
  idNumber: string;
  licenseNumber: string;
  licenseIssued?: string;
  licenseExpires?: string;
  licenseTypeLabel?: string;
  vehiclePlate?: string;
  address?: string;
  birthplace?: string;
  raw: Record<string, unknown>;
};

function str(v: unknown): string {
  if (v == null) return "";
  return String(v);
}

function pickPlate(r: Record<string, unknown>): string | undefined {
  const candidates = [r.vehiIDNO, r.veIDNO, r.vehIDNO, r.vehicleNo, r.vi, r.plate, r.nm];
  for (const c of candidates) {
    const s = str(c).trim();
    if (s) return s;
  }
  return undefined;
}

export function extractDriverInfoArray(raw: unknown): unknown[] {
  if (raw == null) return [];
  if (Array.isArray(raw)) return raw;
  if (typeof raw === "object") {
    const o = raw as Record<string, unknown>;
    const nested =
      o.infos ??
      o.data ??
      o.rows ??
      o.list ??
      o.resultList ??
      o.items;
    if (Array.isArray(nested)) return nested;
    const inner = o.data;
    if (inner && typeof inner === "object") {
      const d = inner as Record<string, unknown>;
      const arr = d.infos ?? d.rows ?? d.list ?? d.items;
      if (Array.isArray(arr)) return arr;
    }
  }
  return [];
}

export function extractDriverListTotal(raw: unknown): number | undefined {
  if (raw == null || typeof raw !== "object") return undefined;
  const o = raw as Record<string, unknown>;
  const n = (k: string) => {
    const v = o[k];
    const num = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
    return Number.isFinite(num) ? num : undefined;
  };
  return n("totalRecords") ?? n("total") ?? n("recordCount");
}

export function normalizeDriverListItem(row: unknown, index: number): DriverListRow {
  const r = (typeof row === "object" && row !== null ? row : {}) as Record<string, unknown>;
  const id = str(r.id ?? r.ID ?? index).trim() || `row-${index}`;
  return {
    id,
    workNumber: str(r.jn ?? r.jobNum ?? "").trim(),
    name: str(r.dn ?? r.name ?? "").trim() || "—",
    contact: str(r.dt ?? r.contact ?? "").trim(),
    idNumber: str(r.cn ?? r.cardNumber ?? "").trim(),
    licenseNumber: str(r.ln ?? r.licenseNum ?? "").trim(),
    licenseIssued: str(r.rd ?? r.rushDate ?? "").trim() || undefined,
    licenseExpires: str(r.vd ?? r.validity ?? "").trim() || undefined,
    licenseTypeLabel: str(r.licenseType ?? "").trim() || undefined,
    vehiclePlate: pickPlate(r),
    address: str(r.address ?? "").trim() || undefined,
    birthplace: str(r.birthplace ?? "").trim() || undefined,
    raw: r,
  };
}

export function normalizeDriverListPayload(raw: unknown): DriverListRow[] {
  return extractDriverInfoArray(raw).map((row, i) => normalizeDriverListItem(row, i));
}
