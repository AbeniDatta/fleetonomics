"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Circle,
  CircleMarker,
  MapContainer,
  Polygon,
  Polyline,
  Popup,
  TileLayer,
  Tooltip,
  useMap,
  useMapEvents,
} from "react-leaflet";
import L from "leaflet";
import type { Position } from "@/lib/uctracking/schemas";
import type { SavedGeofence } from "@/lib/geofences/types";
import { useUiStore } from "@/store/ui-store";
import { cn } from "@/lib/utils";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { ApiConsole } from "@/components/admin/api-console";
import { evaluateGeofenceMovement, type LatLng } from "@/lib/geo/geofence";

import "leaflet/dist/leaflet.css";

// Default to a Nigeria-wide view (rather than Port Harcourt).
const center: [number, number] = [9.08, 8.675];
/** Legacy browser-only key — migrated once to the server store. */
const GEOFENCE_STORAGE_KEY = "fleetonomics:fleet-map:geofence-polygon:v1";

const EMPTY_GEOFENCES: SavedGeofence[] = [];

const FENCE_COLORS = ["#0ea5e9", "#a855f7", "#f97316", "#22c55e", "#ec4899", "#eab308"];

function loadSavedGeofence(): LatLng[] | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(GEOFENCE_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as unknown;
    if (!Array.isArray(parsed) || parsed.length < 3) return null;
    const out: LatLng[] = [];
    for (const row of parsed) {
      if (!Array.isArray(row) || row.length < 2) return null;
      const lat = Number(row[0]);
      const lng = Number(row[1]);
      if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
      out.push([lat, lng]);
    }
    return out;
  } catch {
    return null;
  }
}

function GeofenceMapClicks({
  enabled,
  onPoint,
}: {
  enabled: boolean;
  onPoint: (lat: number, lng: number) => void;
}) {
  useMapEvents({
    click(e) {
      if (enabled) onPoint(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

/** Centers the map on live vehicle marker(s) when embedded without geofence tooling. */
function FitMapToOverlayPositions({ positions }: { positions: Position[] }) {
  const map = useMap();
  const sig = useMemo(() => {
    if (positions.length === 0) return "";
    return positions
      .map((p) => `${p.lat.toFixed(5)},${p.lng.toFixed(5)}`)
      .sort()
      .join("|");
  }, [positions]);

  useEffect(() => {
    if (sig === "" || positions.length === 0) return;
    if (positions.length === 1) {
      const p = positions[0];
      map.setView([p.lat, p.lng], 14, { animate: false });
      return;
    }
    const b = L.latLngBounds(positions.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(b, { padding: [40, 40], maxZoom: 15, animate: false });
  }, [map, sig, positions]);
  return null;
}

type FenceAlarm = {
  id: string;
  at: string;
  plate: string;
  kind: "exit" | "cross";
  fenceId: string;
  fenceName: string;
  message: string;
  lat: number;
  lng: number;
};

type ApiMarker = {
  id: string;
  name: string;
  color?: string;
  type?: number;
  lat?: number;
  lng?: number;
  radius?: number;
  raw: Record<string, unknown>;
};

function isRecord(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function toNum(v: unknown): number | undefined {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : undefined;
}

function extractMarkers(raw: unknown): ApiMarker[] {
  const out: ApiMarker[] = [];
  const visit = (node: unknown) => {
    if (Array.isArray(node)) return node.forEach(visit);
    if (!isRecord(node)) return;

    const hasMarkerHints =
      "name" in node ||
      "n" in node ||
      "markerName" in node ||
      "lat" in node ||
      "i" in node ||
      "lng" in node ||
      "w" in node ||
      "mapType" in node ||
      "m" in node;

    if (hasMarkerHints) {
      const name = String((node.name ?? node.n ?? node.markerName ?? "Area").toString());
      const id = String((node.id ?? node.p ?? node.markerId ?? name).toString());
      const color = (node.color ?? node.cl ?? node.markerColor) as unknown;
      const lng = toNum(node.lng ?? node.w ?? node.longitude ?? node.j ?? node.jd);
      const lat = toNum(node.lat ?? node.i ?? node.latitude ?? node.wd);
      const type = toNum(node.mapType ?? node.m);
      const radius = toNum(node.radius ?? node.r);

      out.push({
        id,
        name,
        color: typeof color === "string" ? color : undefined,
        type,
        lat,
        lng,
        radius,
        raw: node,
      });
    }

    for (const v of Object.values(node)) visit(v);
  };
  visit(raw);

  const seen = new Set<string>();
  return out
    .filter((m) => {
      const k = `${m.id}`;
      if (seen.has(k)) return false;
      seen.add(k);
      return true;
    })
    .slice(0, 200);
}

function statusColor(status: string | undefined) {
  switch (status) {
    case "moving":
    case "active":
      return "#22c55e";
    case "idle":
    case "parked":
      return "#fbbf24";
    case "offline":
      return "#a78bfa";
    case "alert":
    case "breach":
      return "#ef4444";
    default:
      return "#71717a";
  }
}

async function fetchGeofences(): Promise<{ geofences: SavedGeofence[] }> {
  const res = await fetch("/api/fleet/geofences");
  if (res.status === 401) return { geofences: [] };
  if (!res.ok) throw new Error("geofences");
  return res.json();
}

async function fetchGeofenceEvents(hours = 24): Promise<{ source: string; events: FenceAlarm[]; hours: number }> {
  const res = await fetch(`/api/fleet/geofence-events?hours=${encodeURIComponent(String(hours))}`);
  if (res.status === 401) return { source: "missing", events: [], hours };
  if (!res.ok) throw new Error("geofence-events");
  const json = (await res.json()) as { source: string; events: FenceAlarm[]; hours: number };
  return json;
}

export function FleetMapInner({
  positions,
  userMarkers,
  userMarkersSource,
  compact = false,
  hideGeofencingPanel = false,
  className,
  mapAreaClassName,
}: {
  positions: Position[];
  userMarkers: unknown;
  userMarkersSource?: string;
  /** Hide duplicate alarms/area panels when embedded in the geo-fencing dashboard. */
  compact?: boolean;
  /** Hide geofence tools, list, map overlays, and related API calls (e.g. vehicle detail map). */
  hideGeofencingPanel?: boolean;
  className?: string;
  mapAreaClassName?: string;
}) {
  const queryClient = useQueryClient();
  const { mapFilter, setMapFilter, selectedVehiclePlate, setSelectedVehiclePlate } = useUiStore();
  const [showAreaTools, setShowAreaTools] = useState(false);

  const geofencesQ = useQuery({
    queryKey: ["fleet-geofences"],
    queryFn: fetchGeofences,
    refetchOnWindowFocus: true,
    enabled: !hideGeofencingPanel,
  });
  const geofences = geofencesQ.data?.geofences ?? EMPTY_GEOFENCES;

  const migratedRef = useRef(false);

  const [drawingMode, setDrawingMode] = useState(false);
  const [draftRing, setDraftRing] = useState<LatLng[]>([]);
  /** When set, finishing the polygon PATCHes this id; otherwise POST new. */
  const [shapeEditId, setShapeEditId] = useState<string | null>(null);
  const [newFenceName, setNewFenceName] = useState("New geofence");
  const [fenceAlarms, setFenceAlarms] = useState<FenceAlarm[]>([]);
  const [selectedFenceId, setSelectedFenceId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<{ id: string; name: string } | null>(null);

  const prevVehiclePosRef = useRef<Map<string, LatLng>>(new Map());
  const lastFenceAlarmAtRef = useRef<Map<string, number>>(new Map());

  const createMut = useMutation({
    mutationFn: async (body: { name: string; ring: LatLng[] }) => {
      const res = await fetch("/api/fleet/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error ?? "save failed");
      }
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fleet-geofences"] }),
  });

  const patchMut = useMutation({
    mutationFn: async ({ id, body }: { id: string; body: Partial<{ name: string; ring: LatLng[]; enabled: boolean }> }) => {
      const res = await fetch(`/api/fleet/geofences/${encodeURIComponent(id)}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error("update failed");
      return res.json();
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fleet-geofences"] }),
  });

  const deleteMut = useMutation({
    mutationFn: async (id: string) => {
      const res = await fetch(`/api/fleet/geofences/${encodeURIComponent(id)}`, { method: "DELETE" });
      if (!res.ok) throw new Error("delete failed");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fleet-geofences"] }),
  });

  const geofenceEventsQ = useQuery({
    queryKey: ["fleet-geofence-events", 24],
    queryFn: () => fetchGeofenceEvents(24),
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
    enabled: !hideGeofencingPanel,
  });

  const persistEventsMut = useMutation({
    mutationFn: async (events: Array<FenceAlarm & { vehicleId: string }>) => {
      const res = await fetch("/api/fleet/geofence-events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          events: events.map((e) => ({
            fenceId: e.fenceId,
            fenceName: e.fenceName,
            vehicleId: e.vehicleId,
            plate: e.plate,
            kind: e.kind,
            message: e.message,
            at: e.at,
            lat: e.lat,
            lng: e.lng,
          })),
        }),
      });
      if (!res.ok) throw new Error("persist-geofence-events");
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["fleet-geofence-events", 24] }),
  });

  useEffect(() => {
    if (hideGeofencingPanel) return;
    if (migratedRef.current) return;
    if (!geofencesQ.isSuccess) return;
    if (geofences.length > 0) return;
    const legacy = loadSavedGeofence();
    if (!legacy || legacy.length < 3) return;
    migratedRef.current = true;
    void (async () => {
      const res = await fetch("/api/fleet/geofences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: "Imported geofence", ring: legacy }),
      });
      if (res.ok) {
        localStorage.removeItem(GEOFENCE_STORAGE_KEY);
        await queryClient.invalidateQueries({ queryKey: ["fleet-geofences"] });
      }
    })();
  }, [hideGeofencingPanel, geofencesQ.isSuccess, geofences.length, queryClient]);

  const onAddDraftVertex = useCallback((lat: number, lng: number) => {
    setDraftRing((r) => [...r, [lat, lng]]);
  }, []);

  const finishDrawing = useCallback(() => {
    if (draftRing.length < 3) return;
    if (shapeEditId) {
      patchMut.mutate(
        { id: shapeEditId, body: { ring: draftRing } },
        {
          onSettled: () => {
            setDraftRing([]);
            setDrawingMode(false);
            setShapeEditId(null);
          },
        },
      );
    } else {
      createMut.mutate(
        { name: newFenceName.trim() || "Geofence", ring: draftRing },
        {
          onSettled: () => {
            setDraftRing([]);
            setDrawingMode(false);
            setNewFenceName("New geofence");
          },
        },
      );
    }
  }, [draftRing, shapeEditId, newFenceName, createMut, patchMut]);

  const cancelDrawing = useCallback(() => {
    setDraftRing([]);
    setDrawingMode(false);
    setShapeEditId(null);
  }, []);

  const startNewFence = useCallback(() => {
    setShapeEditId(null);
    setDraftRing([]);
    setNewFenceName(`Geofence ${geofences.length + 1}`);
    setDrawingMode(true);
  }, [geofences.length]);

  const startEditShape = useCallback((g: SavedGeofence) => {
    setSelectedFenceId(g.id);
    setShapeEditId(g.id);
    setDraftRing(g.ring.map(([a, b]) => [a, b] as LatLng));
    setDrawingMode(true);
  }, []);

  const fenceSignature = useMemo(
    () => geofences.map((g) => `${g.id}:${g.enabled}:${g.updatedAt}:${g.ring.length}`).join("|"),
    [geofences],
  );

  useEffect(() => {
    prevVehiclePosRef.current = new Map();
    lastFenceAlarmAtRef.current = new Map();
  }, [fenceSignature]);

  useEffect(() => {
    const active = geofences.filter((g) => g.enabled && g.ring.length >= 3);
    if (active.length === 0) return;

    const DEBOUNCE_MS = 45_000;
    const now = Date.now();
    const newItems: Array<FenceAlarm & { vehicleId: string }> = [];

    for (const p of positions) {
      const vid = p.vehicleId;
      const plate = p.plate ?? vid;
      const curr: LatLng = [p.lat, p.lng];
      const prev = prevVehiclePosRef.current.get(vid) ?? null;

      for (const fence of active) {
        const kind = evaluateGeofenceMovement(fence.ring, prev, curr);
        if (!kind) continue;
        const debKey = `${fence.id}:${vid}:${kind}`;
        const last = lastFenceAlarmAtRef.current.get(debKey) ?? 0;
        if (now - last < DEBOUNCE_MS) continue;
        lastFenceAlarmAtRef.current.set(debKey, now);

        const message =
          kind === "exit"
            ? `Exited “${fence.name}” (inside → outside).`
            : `Crossed boundary of “${fence.name}”.`;
        newItems.push({
          id: `${now}-${fence.id}-${vid}-${kind}-${Math.random().toString(36).slice(2, 8)}`,
          at: new Date().toISOString(),
          plate,
          vehicleId: vid,
          kind,
          fenceId: fence.id,
          fenceName: fence.name,
          message,
          lat: curr[0],
          lng: curr[1],
        });
      }

      prevVehiclePosRef.current.set(vid, curr);
    }

    if (newItems.length > 0) {
      // Persist so events show up in Safety & AI even after refresh.
      persistEventsMut.mutate(newItems);
    }
  }, [positions, geofences, persistEventsMut]);

  useEffect(() => {
    // Render the persisted last-24h list on Fleet Map as well.
    setFenceAlarms(geofenceEventsQ.data?.events ?? []);
  }, [geofenceEventsQ.data?.events]);

  const filtered = useMemo(() => {
    if (compact) return positions;
    return positions.filter((p) => {
      if (mapFilter === "all") return true;
      const s = p.status ?? "active";
      if (mapFilter === "active") return s === "moving" || s === "active";
      if (mapFilter === "alerts") return s === "alert" || s === "breach";
      if (mapFilter === "idle") return s === "idle" || s === "parked";
      if (mapFilter === "offline") return s === "offline";
      return true;
    });
  }, [positions, mapFilter, compact]);

  const selected = filtered.find((p) => p.plate === selectedVehiclePlate);

  const pills: { id: typeof mapFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "active", label: "Online" },
    { id: "alerts", label: "Alerts" },
    { id: "idle", label: "Idle" },
    { id: "offline", label: "Offline" },
  ];

  return (
    <div
      className={cn(
        "flex flex-col gap-4 lg:flex-row lg:gap-6",
        hideGeofencingPanel && "h-full min-h-0 flex-1 gap-0 lg:flex-col lg:gap-0",
        className,
      )}
    >
      <div className={cn("min-w-0 flex-1", hideGeofencingPanel && "flex min-h-0 flex-1 flex-col")}>
        {!compact ? (
          <div className="mb-3 flex flex-wrap items-center gap-2 md:mb-4 md:gap-3">
            {pills.map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setMapFilter(p.id)}
                className={cn(
                  "rounded-full border px-4 py-2 text-sm font-medium transition-colors md:px-5 md:py-2.5 md:text-base",
                  mapFilter === p.id
                    ? "border-nlng-blue bg-nlng-blue text-white"
                    : "border-vms-border bg-vms-inset text-zinc-300 hover:bg-vms-elevated",
                )}
              >
                {p.label}
              </button>
            ))}
          </div>
        ) : null}
        <Card className={cn("overflow-hidden p-0", hideGeofencingPanel && "flex min-h-0 flex-1 flex-col")}>
          <CardContent className={cn("p-0", hideGeofencingPanel && "flex min-h-0 flex-1 flex-col")}>
            <div
              className={cn(
                "relative h-[420px] w-full md:h-[520px] lg:h-[560px]",
                hideGeofencingPanel && "min-h-[min(42vh,360px)] flex-1 md:min-h-[min(48vh,480px)]",
                mapAreaClassName,
              )}
            >
              <MapContainer center={center} zoom={6} className="h-full w-full" scrollWheelZoom>
                <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
                {hideGeofencingPanel ? <FitMapToOverlayPositions positions={filtered} /> : null}
                <GeofenceMapClicks enabled={!hideGeofencingPanel && drawingMode} onPoint={onAddDraftVertex} />
                {geofences.map((g, i) => {
                  if (g.ring.length < 3) return null;
                  const c = FENCE_COLORS[i % FENCE_COLORS.length];
                  const isSel = selectedFenceId === g.id;
                  return (
                    <Polygon
                      key={g.id}
                      positions={g.ring}
                      pathOptions={{
                        color: c,
                        weight: isSel ? 3 : 2,
                        fillColor: c,
                        fillOpacity: g.enabled ? 0.12 : 0.04,
                        opacity: g.enabled ? 1 : 0.45,
                      }}
                      eventHandlers={{
                        click: () => setSelectedFenceId(g.id),
                      }}
                    >
                      <Tooltip sticky>
                        {g.name}
                        {g.enabled ? "" : " (monitoring off)"}
                      </Tooltip>
                    </Polygon>
                  );
                })}
                {draftRing.length >= 2 ? (
                  <Polyline positions={draftRing} pathOptions={{ color: "#fbbf24", weight: 2, dashArray: "6 4" }} />
                ) : null}
                {draftRing.map((pt, i) => (
                  <CircleMarker
                    key={`draft-${i}-${pt[0]}-${pt[1]}`}
                    center={pt}
                    radius={5}
                    pathOptions={{ color: "#18181b", weight: 1, fillColor: "#fbbf24", fillOpacity: 1 }}
                  />
                ))}
                {extractMarkers(userMarkers).map((m) => {
                  if (m.lat == null || m.lng == null) return null;
                  const color = m.color ?? "#38bdf8";
                  if (m.radius && m.radius > 0) {
                    return (
                      <Circle
                        key={`area-${m.id}`}
                        center={[m.lat, m.lng]}
                        radius={m.radius}
                        pathOptions={{ color, fillColor: color, fillOpacity: 0.08, weight: 1, dashArray: "5 3" }}
                      >
                        <Tooltip direction="top" sticky>
                          {m.name}
                        </Tooltip>
                      </Circle>
                    );
                  }
                  return (
                    <CircleMarker
                      key={`area-${m.id}`}
                      center={[m.lat, m.lng]}
                      radius={7}
                      pathOptions={{ color: "#18181b", weight: 1, fillColor: color, fillOpacity: 0.9 }}
                    >
                      <Tooltip direction="top" sticky>
                        {m.name}
                      </Tooltip>
                    </CircleMarker>
                  );
                })}
                {filtered.map((p) => (
                  <CircleMarker
                    key={`${p.vehicleId}-${p.recordedAt}`}
                    center={[p.lat, p.lng]}
                    radius={8}
                    interactive={!drawingMode && !hideGeofencingPanel}
                    pathOptions={{
                      color: "#18181b",
                      weight: 1,
                      fillColor: statusColor(p.status),
                      fillOpacity: 0.95,
                    }}
                    eventHandlers={
                      drawingMode || hideGeofencingPanel
                        ? {}
                        : {
                          click: () => setSelectedVehiclePlate(p.plate ?? null),
                        }
                    }
                  >
                    <Popup>
                      <div className="text-sm md:text-base">
                        <div className="font-semibold">{p.plate}</div>
                        <div className="text-zinc-600">{p.speedKmh ?? 0} km/h</div>
                      </div>
                    </Popup>
                  </CircleMarker>
                ))}
              </MapContainer>
              {drawingMode ? (
                <div className="pointer-events-none absolute bottom-3 left-3 right-3 rounded-lg border border-amber-700/50 bg-amber-950/90 px-3 py-2 text-center text-xs text-amber-100 shadow-lg md:text-sm">
                  Click the map to add vertices. Finish needs at least 3 points. Vehicle markers are non-interactive while drawing.
                </div>
              ) : null}
              <div className="pointer-events-none absolute right-3 top-3 rounded-lg border border-vms-border bg-vms-card/95 p-3 text-xs shadow-lg md:text-sm">
                <div>
                  <span className="text-emerald-400">●</span> Online
                </div>
                <div>
                  <span className="text-amber-400">●</span> Idle
                </div>
                <div>
                  <span className="text-red-400">●</span> Alert
                </div>
                <div>
                  <span className="text-violet-400">●</span> Offline
                </div>
                {!hideGeofencingPanel ? (
                  <div className="mt-2 border-t border-vms-border pt-2 text-sky-400">⬜ Saved geofences</div>
                ) : null}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {!hideGeofencingPanel ? (
      <div className="w-full shrink-0 space-y-4 lg:w-[280px] xl:w-[320px]">
        <Card>
          <CardHeader>
            <CardTitle>My geofences</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm md:text-base">
            {geofencesQ.isError ? (
              <div className="text-sm text-red-400">Could not load geofences.</div>
            ) : null}

            <div className="flex flex-col gap-2">
              <Button
                size="sm"
                variant="default"
                className="w-full md:h-10 md:text-base"
                onClick={startNewFence}
                disabled={drawingMode}
              >
                New geofence
              </Button>
            </div>

            {drawingMode ? (
              <div className="space-y-2 rounded-lg border border-vms-border bg-vms-inset/60 p-3">
                <div className="text-xs text-zinc-500">
                  {shapeEditId ? (
                    <>
                      Editing shape:{" "}
                      <span className="font-medium text-zinc-200">{geofences.find((g) => g.id === shapeEditId)?.name}</span>
                    </>
                  ) : (
                    <>
                      <label className="mb-1 block text-zinc-400">Name</label>
                      <Input
                        value={newFenceName}
                        onChange={(e) => setNewFenceName(e.target.value)}
                        className="bg-vms-card"
                        placeholder="Geofence name"
                      />
                    </>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  Vertices: <span className="font-mono text-zinc-300">{draftRing.length}</span> (min 3)
                </div>
                <div className="flex gap-2">
                  <Button
                    size="sm"
                    variant="default"
                    className="flex-1"
                    disabled={draftRing.length < 3 || createMut.isPending || patchMut.isPending}
                    onClick={finishDrawing}
                  >
                    {shapeEditId ? "Save shape" : "Save geofence"}
                  </Button>
                  <Button size="sm" variant="outline" className="flex-1" onClick={cancelDrawing}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : null}

            <div className="space-y-2">
              <div className="text-xs font-medium uppercase tracking-wide text-zinc-500">Your fences</div>
              {geofences.length === 0 ? (
                <div className="text-sm text-zinc-500">No geofences yet. Click &quot;New geofence&quot; to draw one.</div>
              ) : (
                <ul className="max-h-[280px] space-y-2 overflow-y-auto">
                  {geofences.map((g, i) => {
                    const c = FENCE_COLORS[i % FENCE_COLORS.length];
                    return (
                      <li
                        key={g.id}
                        className={cn(
                          "rounded-lg border border-vms-border p-2.5",
                          selectedFenceId === g.id ? "border-sky-500/60 bg-sky-950/20" : "bg-vms-inset/40",
                        )}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <button
                            type="button"
                            className="min-w-0 flex-1 text-left font-medium text-zinc-100"
                            onClick={() => setSelectedFenceId(g.id === selectedFenceId ? null : g.id)}
                          >
                            <span className="mr-2 inline-block h-2 w-2 rounded-full align-middle" style={{ background: c }} />
                            {g.name}
                          </button>
                          <Badge variant={g.enabled ? "success" : "default"} className="shrink-0">
                            {g.enabled ? "on" : "off"}
                          </Badge>
                        </div>
                        <div className="mt-2 flex flex-wrap gap-1.5">
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 flex-1 text-xs"
                            onClick={() => patchMut.mutate({ id: g.id, body: { enabled: !g.enabled } })}
                            disabled={patchMut.isPending}
                          >
                            {g.enabled ? "Pause monitor" : "Enable monitor"}
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            className="h-8 flex-1 text-xs"
                            onClick={() => startEditShape(g)}
                            disabled={drawingMode}
                          >
                            Edit shape
                          </Button>
                          <Button
                            size="sm"
                            variant="destructive"
                            className="h-8 flex-1 text-xs"
                            onClick={() => {
                              setConfirmDelete({ id: g.id, name: g.name });
                            }}
                            disabled={deleteMut.isPending}
                          >
                            Delete
                          </Button>
                        </div>
                        <div className="mt-2">
                          <label className="mb-0.5 block text-[10px] text-zinc-500">Rename</label>
                          <div className="flex gap-1.5">
                            <Input
                              defaultValue={g.name}
                              key={g.updatedAt + g.name}
                              className="h-8 flex-1 bg-vms-card text-sm"
                              onBlur={(e) => {
                                const v = e.target.value.trim();
                                if (v && v !== g.name) patchMut.mutate({ id: g.id, body: { name: v } });
                              }}
                            />
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </CardContent>
        </Card>

        {!compact ? (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Geofence alarms</span>
                <Badge variant="info" className="text-[10px] font-normal">
                  last 24h
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {fenceAlarms.length === 0 ? (
                <div className="text-sm text-zinc-500 md:text-base">No geofence events in the last 24 hours.</div>
              ) : (
                <ul className="max-h-[220px] space-y-2 overflow-y-auto text-sm md:text-base">
                  {fenceAlarms.map((a) => (
                    <li key={a.id} className="rounded-lg border border-red-900/40 bg-red-950/25 px-3 py-2">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <span className="font-semibold text-zinc-100">{a.plate}</span>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="default" className="max-w-[140px] truncate">
                            {a.fenceName}
                          </Badge>
                          <Badge variant={a.kind === "exit" ? "danger" : "warn"}>{a.kind === "exit" ? "Exit" : "Cross"}</Badge>
                        </div>
                      </div>
                      <div className="mt-1 text-xs text-zinc-400 md:text-sm">{a.message}</div>
                      <div className="mt-1 font-mono text-[10px] text-zinc-600 md:text-xs">
                        {new Date(a.at).toLocaleString()}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        ) : null}

        {!compact ? (
          <Card>
            <CardHeader>
              <CardTitle>Areas / Geofences</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm md:text-base">
              <div className="text-xs text-zinc-500 md:text-sm">
                These are coming from uctracking `User Area Information` / marker APIs. Shapes vary by account; we render point/circle
                immediately and keep full CRUD available below.
              </div>
              <Button
                variant="outline"
                size="sm"
                className="mt-2 w-full md:h-10 md:text-base"
                onClick={() => setShowAreaTools((v) => !v)}
              >
                {showAreaTools ? "Hide area tools" : "Show area tools"}
              </Button>
              <div className="text-xs text-zinc-500 md:text-sm">
                Source: <span className="text-zinc-200">{userMarkersSource ?? "—"}</span> · Rendered overlays:{" "}
                <span className="text-zinc-200">{extractMarkers(userMarkers).length}</span>
              </div>
            </CardContent>
          </Card>
        ) : null}

        {!compact && showAreaTools ? (
          <div className="space-y-4">
            <ApiConsole
              title="List user areas"
              endpoint="/api/fleet/areas/user-markers"
              defaultParams={{ toMap: "2" }}
              autoRun
            />
            <ApiConsole
              title="Add area/marker"
              endpoint="/api/fleet/areas/marks/add"
              defaultParams={{
                name: "",
                mapType: "1",
                markerType: "1",
                radius: "",
                share: "0",
                toMap: "2",
              }}
            />
            <ApiConsole
              title="Modify area/marker"
              endpoint="/api/fleet/areas/marks/edit"
              defaultParams={{
                id: "",
                name: "",
                mapType: "",
                markerType: "",
                radius: "",
                share: "",
                toMap: "2",
              }}
            />
            <ApiConsole title="View area/marker" endpoint="/api/fleet/areas/marks/find" defaultParams={{ id: "", toMap: "2" }} />
            <ApiConsole
              title="Delete area/marker"
              endpoint="/api/fleet/areas/marks/delete"
              defaultParams={{ id: "", toMap: "2" }}
            />
          </div>
        ) : null}
      </div>
      ) : null}

      {!hideGeofencingPanel && selected?.plate ? (
        <div className="fixed inset-y-0 right-0 z-[2000] w-full max-w-md border-l border-vms-border bg-vms-card p-5 shadow-2xl md:max-w-lg md:p-6">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-lg font-semibold text-zinc-50 md:text-xl">{selected.plate}</div>
              <div className="text-sm text-zinc-400 md:text-base">Live position</div>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setSelectedVehiclePlate(null)}>
              Close
            </Button>
          </div>
          <div className="mt-5 space-y-3 text-sm md:text-base">
            <div className="flex justify-between border-b border-vms-border py-2">
              <span className="text-zinc-500">Speed</span>
              <span className="font-semibold text-zinc-100">{selected.speedKmh ?? 0} km/h</span>
            </div>
            <div className="flex justify-between border-b border-vms-border py-2">
              <span className="text-zinc-500">Coords</span>
              <span className="font-mono text-xs text-zinc-200 md:text-sm">
                {selected.lat.toFixed(4)}, {selected.lng.toFixed(4)}
              </span>
            </div>
            <div className="flex justify-between py-2">
              <span className="text-zinc-500">Updated</span>
              <span className="text-zinc-300">{new Date(selected.recordedAt).toLocaleTimeString()}</span>
            </div>
          </div>
        </div>
      ) : null}

      {!hideGeofencingPanel ? (
      <ConfirmDialog
        open={confirmDelete != null}
        onOpenChange={(open) => {
          if (!open) setConfirmDelete(null);
        }}
        title="Delete geofence?"
        description={confirmDelete ? `This will permanently delete “${confirmDelete.name}”.` : undefined}
        confirmText="Delete"
        cancelText="Cancel"
        busy={deleteMut.isPending}
        onConfirm={() => {
          if (!confirmDelete) return;
          deleteMut.mutate(confirmDelete.id, {
            onSettled: () => setConfirmDelete(null),
          });
        }}
      />
      ) : null}
    </div>
  );
}
