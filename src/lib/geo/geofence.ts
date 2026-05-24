/**
 * Planar approximation for small regions (city / depot scale on OpenStreetMap).
 * Vertices are Leaflet-style [lat, lng].
 */

export type LatLng = [number, number];

const EPS = 1e-9;

/** Ray-casting even-odd test. */
export function pointInPolygon(ring: LatLng[], lat: number, lng: number): boolean {
  if (ring.length < 3) return false;
  const x = lng;
  const y = lat;
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const yi = ring[i][0];
    const xi = ring[i][1];
    const yj = ring[j][0];
    const xj = ring[j][1];
    const denom = yj - yi;
    if (Math.abs(denom) < EPS) continue;
    const inter = (yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / denom + xi;
    if (inter) inside = !inside;
  }
  return inside;
}

function between2(a: number, b: number, c: number): boolean {
  return Math.min(a, c) - EPS <= b && b <= Math.max(a, c) + EPS;
}

function orient2D(a: [number, number], b: [number, number], c: [number, number]): number {
  return (b[0] - a[0]) * (c[1] - a[1]) - (b[1] - a[1]) * (c[0] - a[0]);
}

function sgn(x: number): number {
  if (x > EPS) return 1;
  if (x < -EPS) return -1;
  return 0;
}

/** Open segment A–B vs C–D in (lng, lat) / (x, y) space. */
function segmentsIntersectXY(a: [number, number], b: [number, number], c: [number, number], d: [number, number]): boolean {
  const o1 = orient2D(a, b, c);
  const o2 = orient2D(a, b, d);
  const o3 = orient2D(c, d, a);
  const o4 = orient2D(c, d, b);

  if (Math.abs(o1) < EPS && between2(a[0], c[0], b[0]) && between2(a[1], c[1], b[1])) return true;
  if (Math.abs(o2) < EPS && between2(a[0], d[0], b[0]) && between2(a[1], d[1], b[1])) return true;
  if (Math.abs(o3) < EPS && between2(c[0], a[0], d[0]) && between2(c[1], a[1], d[1])) return true;
  if (Math.abs(o4) < EPS && between2(c[0], b[0], d[0]) && between2(c[1], b[1], d[1])) return true;

  return sgn(o1) !== sgn(o2) && sgn(o3) !== sgn(o4);
}

/** Movement prev→curr crosses any polygon edge (closed ring). */
export function segmentCrossesPolygonEdge(ring: LatLng[], prev: LatLng, curr: LatLng): boolean {
  if (ring.length < 3) return false;
  const p1: [number, number] = [prev[1], prev[0]];
  const p2: [number, number] = [curr[1], curr[0]];
  const n = ring.length;
  for (let i = 0; i < n; i++) {
    const j = (i + 1) % n;
    const p3: [number, number] = [ring[i][1], ring[i][0]];
    const p4: [number, number] = [ring[j][1], ring[j][0]];
    if (segmentsIntersectXY(p1, p2, p3, p4)) return true;
  }
  return false;
}

export type GeofenceEventKind = "exit" | "cross";

/**
 * exit — was inside, now outside.
 * cross — boundary crossed (entry from outside, chord through fence from outside, or any other non-exit crossing).
 */
export function evaluateGeofenceMovement(
  ring: LatLng[],
  prev: LatLng | null,
  curr: LatLng,
): GeofenceEventKind | null {
  if (!prev || ring.length < 3) return null;
  const insidePrev = pointInPolygon(ring, prev[0], prev[1]);
  const insideCurr = pointInPolygon(ring, curr[0], curr[1]);
  if (insidePrev && !insideCurr) return "exit";
  if (!segmentCrossesPolygonEdge(ring, prev, curr)) return null;
  if (insidePrev && insideCurr) return null;
  return "cross";
}
