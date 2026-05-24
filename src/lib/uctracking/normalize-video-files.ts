import type { CameraRole } from "./camera-channels";

export type NormalizedVideoFile = {
  devIdno: string;
  plate: string;
  role: CameraRole;
  channel: number;
  fileKey: string;
  fileName: string | null;
  beginAt: string;
  endAt: string | null;
  durationSec: number | null;
  fileSizeBytes: number | null;
  loc: number | null;
  playbackPath: string | null;
  raw: Record<string, unknown>;
};

function pickString(obj: Record<string, unknown>, keys: string[]): string | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return null;
}

function pickNumber(obj: Record<string, unknown>, keys: string[]): number | null {
  for (const k of keys) {
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim() && Number.isFinite(Number(v))) return Number(v);
  }
  return null;
}

function parseVendorTime(v: unknown, year: number, mon: number, day: number, secondsOfDay: number): string {
  if (typeof v === "string" && v.trim()) {
    const d = new Date(v);
    if (!Number.isNaN(d.valueOf())) return d.toISOString();
  }
  if (typeof v === "number" && Number.isFinite(v)) {
    if (v > 1e12) return new Date(v).toISOString();
    if (v > 1e9) return new Date(v * 1000).toISOString();
  }
  const base = new Date(Date.UTC(year, mon - 1, day, 0, 0, 0));
  base.setUTCSeconds(base.getUTCSeconds() + secondsOfDay);
  return base.toISOString();
}

function extractFileRows(raw: unknown): Record<string, unknown>[] {
  if (!raw || typeof raw !== "object") return [];
  const o = raw as Record<string, unknown>;
  if (Array.isArray(o.files)) return o.files.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  if (Array.isArray(o.fileList)) return o.fileList.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  if (Array.isArray(o.data)) return o.data.filter((x): x is Record<string, unknown> => !!x && typeof x === "object");
  return [];
}

export function normalizeVideoFileList(opts: {
  raw: unknown;
  devIdno: string;
  plate: string;
  role: CameraRole;
  channel: number;
  year: number;
  mon: number;
  day: number;
}): NormalizedVideoFile[] {
  const rows = extractFileRows(opts.raw);
  const out: NormalizedVideoFile[] = [];

  for (const row of rows) {
    const begSec = pickNumber(row, ["beg", "BEG", "begin", "start", "startTime", "stm"]) ?? 0;
    const endSec = pickNumber(row, ["end", "END", "endTime", "etm"]);
    const beginAt = parseVendorTime(
      row.begTime ?? row.beginTime ?? row.startTime ?? row.time,
      opts.year,
      opts.mon,
      opts.day,
      begSec,
    );
    const endAt =
      endSec != null
        ? parseVendorTime(row.endTime ?? row.stopTime, opts.year, opts.mon, opts.day, endSec)
        : null;
    const fileName = pickString(row, ["file", "fileName", "name", "nm", "FILE"]);
    const playbackPath = pickString(row, ["path", "filePath", "FPATH", "fp", "url"]);
    const fileKey = [opts.devIdno, opts.channel, beginAt, fileName ?? playbackPath ?? begSec].join("|");
    const durationSec =
      endSec != null && begSec != null && endSec >= begSec ? Math.round(endSec - begSec) : null;

    out.push({
      devIdno: opts.devIdno,
      plate: opts.plate,
      role: opts.role,
      channel: opts.channel,
      fileKey,
      fileName,
      beginAt,
      endAt,
      durationSec,
      fileSizeBytes: pickNumber(row, ["len", "size", "fileSize", "LEN"]),
      loc: pickNumber(row, ["loc", "LOC", "location"]),
      playbackPath,
      raw: row,
    });
  }

  return out;
}

export function vendorVideoQueryFailed(raw: unknown): { failed: boolean; message?: string } {
  if (!raw || typeof raw !== "object") return { failed: true };
  const o = raw as Record<string, unknown>;
  const result = o.result;
  const code = typeof result === "number" ? result : typeof result === "string" ? Number(result) : NaN;
  if (Number.isFinite(code) && code !== 0) {
    const message = typeof o.message === "string" ? o.message : undefined;
    return { failed: true, message };
  }
  return { failed: false };
}
