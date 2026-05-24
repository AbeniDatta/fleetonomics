/**
 * Best-effort parsing of uctracking oil / mileage report payloads into
 * tabular data and optional fuel-vs-speed series for charts.
 */

function isPlainObjectRow(x: unknown): x is Record<string, unknown> {
  return x != null && typeof x === "object" && !Array.isArray(x);
}

function tryParseJsonString(s: unknown): unknown | null {
  if (typeof s !== "string") return null;
  const t = s.trim();
  if (!t.length) return null;
  if (t[0] !== "{" && t[0] !== "[") return null;
  try {
    return JSON.parse(t) as unknown;
  } catch {
    return null;
  }
}

/** Collect every array found in a JSON-like tree (for locating tabular data). */
function collectArrays(node: unknown, acc: unknown[][], depth: number): void {
  if (depth > 12) return;
  if (Array.isArray(node)) {
    acc.push(node);
    for (const el of node) collectArrays(el, acc, depth + 1);
    return;
  }
  if (!node || typeof node !== "object") return;
  for (const v of Object.values(node as Record<string, unknown>)) {
    collectArrays(v, acc, depth + 1);
  }
}

/** Prefer the longest array whose items look like table rows (plain objects). */
function bestTabularArray(candidates: unknown[][]): unknown[] {
  const tables = candidates.filter(
    (a) => a.length > 0 && a.every((x) => isPlainObjectRow(x)),
  );
  if (!tables.length) return [];
  return tables.reduce((a, b) => (a.length >= b.length ? a : b));
}

/** Turn [[a,b],[c,d]] or [["h1","h2"],[c,d]] into object rows for the table UI. */
function matrixToObjectRows(matrix: unknown[]): Record<string, unknown>[] | null {
  if (!matrix.length) return null;
  if (!matrix.every((r) => Array.isArray(r))) return null;
  const rows = matrix as unknown[][];
  const first = rows[0] ?? [];
  const second = rows[1];

  const firstLooksLikeHeader =
    first.length > 0 &&
    first.every((x) => x == null || typeof x === "string" || typeof x === "number") &&
    first.some((x) => typeof x === "string" && /^[a-zA-Z\u4e00-\u9fff]/.test(x));

  if (firstLooksLikeHeader && second && Array.isArray(second)) {
    const headers = first.map((x, i) => {
      if (typeof x === "string" && x.trim()) return x.trim();
      if (typeof x === "number" && Number.isFinite(x)) return `col_${x}`;
      return `col_${i}`;
    });
    return rows.slice(1).map((cells) => {
      const o: Record<string, unknown> = {};
      headers.forEach((h, i) => {
        o[h] = cells[i] ?? null;
      });
      return o;
    });
  }

  return rows.map((cells, ri) => {
    const o: Record<string, unknown> = {};
    cells.forEach((cell, i) => {
      o[`col_${i}`] = cell;
    });
    o._row = ri;
    return o;
  });
}

function bestMatrixAsObjectRows(candidates: unknown[][]): Record<string, unknown>[] {
  const matrices = candidates.filter(
    (a) =>
      a.length > 0 &&
      a.every((x) => Array.isArray(x)) &&
      (a[0] as unknown[]).length > 0,
  );
  if (!matrices.length) return [];
  const best = matrices.reduce((a, b) => (a.length >= b.length ? a : b));
  return matrixToObjectRows(best) ?? [];
}

function pushPaginationLists(pag: unknown, candidates: unknown[][]): void {
  if (!pag || typeof pag !== "object" || Array.isArray(pag)) return;
  const p = pag as Record<string, unknown>;
  for (const key of ["list", "records", "data", "rows", "items", "infos"]) {
    const v = p[key];
    if (Array.isArray(v)) candidates.push(v);
  }
}

function extractRowsFromPayload(raw: unknown): unknown[] {
  if (raw == null) return [];

  const asParsed = tryParseJsonString(raw);
  if (asParsed != null) return extractRowsFromPayload(asParsed);

  if (Array.isArray(raw)) {
    if (raw.length && isPlainObjectRow(raw[0])) return raw;
    if (raw.length && Array.isArray(raw[0])) {
      const asObj = matrixToObjectRows(raw);
      if (asObj?.length) return asObj;
    }
    return [];
  }

  if (typeof raw !== "object") return [];

  const o = raw as Record<string, unknown>;

  for (const v of Object.values(o)) {
    if (typeof v !== "string") continue;
    const inner = tryParseJsonString(v);
    if (inner == null) continue;
    const rows = extractRowsFromPayload(inner);
    if (rows.length) return rows;
  }

  const namedKeys = [
    "data",
    "datas",
    "rows",
    "items",
    "list",
    "records",
    "infos",
    "infoList",
    "vehicleList",
    "vehicles",
    "det",
    "details",
    "oilList",
    "oilInfo",
    "oilData",
    "oilDatas",
    "track",
    "tracks",
    "reportList",
    "resultList",
    "pagination",
    "oilTrack",
    "oilTracks",
    "root",
    "body",
    "content",
  ];

  const candidates: unknown[][] = [];

  for (const k of namedKeys) {
    const v = o[k];
    if (k === "pagination" && v && typeof v === "object" && !Array.isArray(v)) {
      pushPaginationLists(v, candidates);
      continue;
    }
    if (!Array.isArray(v)) continue;
    candidates.push(v);
  }

  const data = o.data;
  if (typeof data === "string") {
    const inner = tryParseJsonString(data);
    if (inner != null) {
      const rows = extractRowsFromPayload(inner);
      if (rows.length) return rows;
    }
  }

  if (data && typeof data === "object" && !Array.isArray(data)) {
    const d = data as Record<string, unknown>;
    const pag = d.pagination ?? d.page;
    pushPaginationLists(pag, candidates);
    for (const [, v] of Object.entries(d)) {
      if (Array.isArray(v)) candidates.push(v);
      if (typeof v === "string") {
        const inner = tryParseJsonString(v);
        if (inner != null) {
          const rows = extractRowsFromPayload(inner);
          if (rows.length) return rows;
        }
      }
    }
  }

  const fromNamed = bestTabularArray(candidates);
  if (fromNamed.length) return fromNamed;

  const fromNamedMatrix = bestMatrixAsObjectRows(candidates);
  if (fromNamedMatrix.length) return fromNamedMatrix;

  const deep: unknown[][] = [];
  collectArrays(raw, deep, 0);
  const tab = bestTabularArray(deep);
  if (tab.length) return tab;
  const mat = bestMatrixAsObjectRows(deep);
  if (mat.length) return mat;

  return [];
}

function stringifyCell(v: unknown): string {
  if (v == null || v === "") return "—";
  if (typeof v === "number" && Number.isFinite(v)) return String(v);
  if (typeof v === "object") return JSON.stringify(v);
  const s = String(v);
  return s.length > 200 ? `${s.slice(0, 197)}…` : s;
}

export type FuelReportTable = {
  columns: string[];
  rows: string[][];
};

export function fuelReportTableFromRaw(raw: unknown): FuelReportTable {
  const rowObjs = extractRowsFromPayload(raw).filter(isPlainObjectRow);
  if (!rowObjs.length) return { columns: [], rows: [] };
  const keySet = new Set<string>();
  for (const r of rowObjs.slice(0, 300)) {
    for (const k of Object.keys(r)) {
      if (/^jsession$/i.test(k) || k === "_row") continue;
      keySet.add(k);
    }
  }
  const columns = Array.from(keySet).sort((a, b) => a.localeCompare(b));
  const rows = rowObjs.map((r) => columns.map((c) => stringifyCell(r[c])));
  return { columns, rows };
}

function pickNumeric(obj: Record<string, unknown>, patterns: RegExp[]): number | null {
  for (const k of Object.keys(obj)) {
    if (!patterns.some((p) => p.test(k))) continue;
    const v = obj[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string" && v.trim()) {
      const n = Number(String(v).replace(/,/g, ""));
      if (Number.isFinite(n)) return n;
    }
  }
  return null;
}

function pickTimeLabel(obj: Record<string, unknown>): string | null {
  for (const k of Object.keys(obj).sort()) {
    if (!/(time|date|tm|gps|dt|beg|end)/i.test(k)) continue;
    const v = obj[k];
    if (v == null || v === "") continue;
    return stringifyCell(v);
  }
  return null;
}

export type FuelVelocityPoint = {
  t: string;
  fuelL: number | null;
  speedKmh: number | null;
};

/** Points suitable for a fuel (L) + speed (km/h) profile when columns can be inferred. */
export function fuelVelocitySeriesFromRaw(raw: unknown): FuelVelocityPoint[] {
  const rowObjs = extractRowsFromPayload(raw).filter(isPlainObjectRow);
  const out: FuelVelocityPoint[] = [];
  const fuelPatterns = [/^(oil|fuel|yu|yl|lit|totaloil|mainoil|aux)/i, /oil/i, /fuel/i, /liter/i, /油量/, /燃油/];
  const speedPatterns = [/^sp$/i, /speed/i, /velocity/i, /vec/i, /时速/];
  for (const r of rowObjs) {
    const t = pickTimeLabel(r);
    if (!t || t === "—") continue;
    const fuelL = pickNumeric(r, fuelPatterns);
    const speedKmh = pickNumeric(r, speedPatterns);
    if (fuelL == null && speedKmh == null) continue;
    out.push({ t, fuelL, speedKmh });
  }
  return out.slice(0, 5000);
}

export function extractTotalFromRaw(raw: unknown): number | null {
  if (raw == null || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  for (const k of ["total", "totalRecords", "records", "count", "totalCount"]) {
    const v = o[k];
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v);
      if (Number.isFinite(n)) return n;
    }
  }
  const pag = o.pagination;
  if (pag && typeof pag === "object" && !Array.isArray(pag)) {
    const p = pag as Record<string, unknown>;
    for (const k of ["total", "totalRecords", "count"]) {
      const v = p[k];
      if (typeof v === "number" && Number.isFinite(v)) return v;
    }
  }
  const data = o.data;
  if (data && typeof data === "object" && !Array.isArray(data)) {
    return extractTotalFromRaw(data);
  }
  return null;
}
