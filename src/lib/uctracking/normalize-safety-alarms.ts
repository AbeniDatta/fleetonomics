import { extractDevIdno } from "@/lib/uctracking/extract-dev-idno";
import { alarmSchema, type Alarm } from "@/lib/uctracking/schemas";

export type PlateLookup = {
  plateByDev: Map<string, string>;
  plateByVehId: Map<string, string>;
};

function isLikelyPlate(v: unknown): v is string {
  if (typeof v !== "string") return false;
  const s = v.trim();
  if (s.length < 2 || s.length > 20) return false;
  if (/^[0-9a-f]{24,}$/i.test(s)) return false;
  return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(s) || /^\d{10,16}$/.test(s);
}

export function buildPlateLookup(vehicleRows: unknown[]): PlateLookup {
  const plateByDev = new Map<string, string>();
  const plateByVehId = new Map<string, string>();
  for (const row of vehicleRows) {
    const r = row as Record<string, unknown>;
    const plate = (r.nm ?? r.plate ?? r.vehicleNo ?? r.name) as unknown;
    const plateStr = isLikelyPlate(plate) ? plate.trim() : null;
    if (!plateStr) continue;
    const devIdno = extractDevIdno(r);
    const vehId =
      typeof r.id === "string" && r.id.trim().length > 0
        ? r.id.trim()
        : typeof r.vehicleId === "string" && r.vehicleId.trim().length > 0
          ? r.vehicleId.trim()
          : null;
    if (devIdno) plateByDev.set(devIdno, plateStr);
    if (vehId) plateByVehId.set(vehId, plateStr);
  }
  return { plateByDev, plateByVehId };
}

function toIsoFromUnknown(v: unknown): string {
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.valueOf())) return d.toISOString();
    const d2 = new Date(v.replace(" ", "T"));
    if (!Number.isNaN(d2.valueOf())) return d2.toISOString();
  }
  if (typeof v === "number") {
    const ms = v > 1e12 ? v : v > 1e10 ? v : v * 1000;
    const d = new Date(ms);
    if (!Number.isNaN(d.valueOf())) return d.toISOString();
  }
  return new Date().toISOString();
}

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function tryParseJsonString(raw: unknown): unknown | null {
  if (typeof raw !== "string") return null;
  const s = raw.trim();
  if (!s.startsWith("{") && !s.startsWith("[")) return null;
  try {
    return JSON.parse(s) as unknown;
  } catch {
    return null;
  }
}

/** Vendor envelope with result !== 0 and no list payload (e.g. bad parameters). */
export function isVendorApiFailure(raw: unknown): boolean {
  if (raw == null) return true;
  if (typeof raw !== "object") return false;
  const o = raw as Record<string, unknown>;
  const rows = extractAlarmRows(raw);
  if (rows.length > 0) return false;
  const code = o.result;
  return typeof code === "number" && code !== 0;
}

export function extractAlarmRows(raw: unknown): unknown[] {
  if (raw == null) return [];
  const parsed = tryParseJsonString(raw);
  if (parsed != null) return extractAlarmRows(parsed);
  if (Array.isArray(raw)) {
    if (raw.length && typeof raw[0] === "object" && raw[0] !== null) return raw;
    return [];
  }
  if (typeof raw !== "object") return [];

  const o = raw as Record<string, unknown>;
  for (const key of [
    "alarms",
    "alarmList",
    "alarmlist",
    "data",
    "datas",
    "rows",
    "items",
    "list",
    "records",
    "infos",
    "infoList",
    "result",
    "pagination",
  ]) {
    const v = o[key];
    if (Array.isArray(v)) return v;
    if (v && typeof v === "object") {
      const nested = extractAlarmRows(v);
      if (nested.length) return nested;
    }
  }

  let best: unknown[] | null = null;
  for (const v of Object.values(o)) {
    if (Array.isArray(v) && v.length > (best?.length ?? 0)) best = v;
  }
  return best ?? [];
}

function inferSeverity(r: Record<string, unknown>, msg: string): Alarm["severity"] {
  const level = toNum(r.level ?? r.alarmLevel ?? r.lv ?? r.severity);
  if (level != null) {
    if (level >= 3) return "critical";
    if (level === 2) return "high";
    if (level === 1) return "medium";
    return "low";
  }
  const s = `${msg} ${String(r.type ?? r.armType ?? "")}`.toLowerCase();
  if (/\b(critical|emergency|collision|impact)\b/.test(s)) return "critical";
  if (/\b(high|overspeed|fatigue|drowsy|phone|smoking)\b/.test(s)) return "high";
  if (/\b(medium|warning|warn)\b/.test(s)) return "medium";
  const typeNum = toNum(r.type ?? r.armType);
  if (typeNum != null && typeNum > 0) return "high";
  return "medium";
}

export function inferAlarmSource(r: Record<string, unknown>, message: string): Alarm["source"] {
  const ch = toNum(r.chn ?? r.channel ?? r.CHN ?? r.camChannel);
  if (ch === 0) return "DMS";
  if (ch === 1) return "ADAS";

  const combined = `${message} ${String(r.armType ?? r.type ?? r.atp ?? r.alarmType ?? "")} ${String(r.source ?? r.src ?? "")}`.toLowerCase();

  if (/\b(dms|fatigue|drowsy|yawn|eye|phone|smok|distraction|seatbelt|driver monitoring|identify)\b/.test(combined)) {
    return "DMS";
  }
  if (/\b(adas|forward collision|lane depart|tailgat|pedestrian|fcw|ldw|headway|road departure)\b/.test(combined)) {
    return "ADAS";
  }
  if (/\b(fuel|oil|theft|drain)\b/.test(combined)) return "FUEL";
  if (/\b(tpms|tire|tyre)\b/.test(combined)) return "TPMS";
  if (/\b(obd|engine|dtc)\b/.test(combined)) return "OBD";

  return "GPS";
}

function resolvePlate(
  r: Record<string, unknown>,
  lookup: PlateLookup,
  devIdno?: string,
): string | undefined {
  const plateCandidate = (r.vehicleNo ?? r.vi ?? r.nm ?? r.plate ?? r.vehIdno) as unknown;
  if (isLikelyPlate(plateCandidate)) return String(plateCandidate).trim();
  if (devIdno && lookup.plateByDev.has(devIdno)) return lookup.plateByDev.get(devIdno);
  const vehKey = String(r.vehIdno ?? r.vehId ?? r.vid ?? r.vehicleId ?? "");
  if (vehKey && lookup.plateByVehId.has(vehKey)) return lookup.plateByVehId.get(vehKey);
  if (devIdno && /^\d{10,16}$/.test(devIdno)) return devIdno;
  return undefined;
}

export function normalizeAlarmRow(
  row: unknown,
  lookup: PlateLookup,
  opts?: { defaultSource?: Alarm["source"]; feed?: string },
): Alarm | null {
  if (!row || typeof row !== "object") return null;
  const r = row as Record<string, unknown>;
  const devIdnoRaw = r.devIdno ?? r.devIDNO ?? r.DevIDNO ?? r.deviceId ?? r.di;
  const devIdno =
    typeof devIdnoRaw === "string" && devIdnoRaw.trim().length > 0
      ? devIdnoRaw.trim()
      : typeof devIdnoRaw === "number" && Number.isFinite(devIdnoRaw)
        ? String(devIdnoRaw)
        : extractDevIdno(r) ?? undefined;

  const plate = resolvePlate(r, lookup, devIdno);
  const rawMsg = r.desc ?? r.message ?? r.info ?? r.alarmDesc ?? r.content ?? r.eventDesc;
  const msg =
    typeof rawMsg === "string" && rawMsg.trim().length
      ? rawMsg.trim()
      : typeof rawMsg === "number"
        ? `Alarm (${rawMsg})`
        : `Alarm (${String(r.type ?? r.armType ?? opts?.feed ?? "event")})`;

  const source = opts?.defaultSource ?? inferAlarmSource(r, msg);
  const id = String(
    r.guid ?? r.id ?? r.alarmId ?? `${devIdno ?? plate ?? "dev"}-${r.type ?? "t"}-${r.time ?? r.tm ?? Date.now()}-${opts?.feed ?? ""}`,
  );

  try {
    return alarmSchema.parse({
      id,
      vehicleId: String(r.vehIdno ?? r.vehicleId ?? r.vid ?? devIdno ?? plate ?? "unknown"),
      plate,
      type: String(r.type ?? r.armType ?? r.atp ?? "alarm"),
      message: msg,
      severity: inferSeverity(r, msg),
      source,
      raisedAt: toIsoFromUnknown(r.time ?? r.tm ?? r.gpsTime ?? r.beginTime ?? r.startTime ?? Date.now()),
      acknowledged: typeof r.hd === "number" ? r.hd === 1 : typeof r.handle === "number" ? r.handle === 1 : undefined,
    });
  } catch {
    return null;
  }
}

export function normalizeAlarmRows(
  raw: unknown,
  lookup: PlateLookup,
  opts?: { defaultSource?: Alarm["source"]; feed?: string },
): Alarm[] {
  if (isVendorApiFailure(raw)) return [];
  const rows = extractAlarmRows(raw);
  const out: Alarm[] = [];
  const seen = new Set<string>();
  for (const row of rows) {
    const alarm = normalizeAlarmRow(row, lookup, opts);
    if (!alarm || seen.has(alarm.id)) continue;
    seen.add(alarm.id);
    out.push(alarm);
  }
  return out;
}

export function mergeAlarms(lists: Alarm[]): Alarm[] {
  const byId = new Map<string, Alarm>();
  for (const a of lists) {
    const existing = byId.get(a.id);
    if (!existing || new Date(a.raisedAt).valueOf() > new Date(existing.raisedAt).valueOf()) {
      byId.set(a.id, a);
    }
  }
  return Array.from(byId.values()).sort((a, b) => new Date(b.raisedAt).valueOf() - new Date(a.raisedAt).valueOf());
}

export function filterAlarmsByRole(alarms: Alarm[], role: "ADAS" | "DMS" | "all"): Alarm[] {
  if (role === "all") return alarms;
  return alarms.filter((a) => a.source === role);
}

export function vendorDateTimeRange(hours: number): { beginTime: string; endTime: string } {
  const end = new Date();
  const begin = new Date(end.getTime() - hours * 60 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  const fmt = (d: Date) =>
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
  return { beginTime: fmt(begin), endTime: fmt(end) };
}
