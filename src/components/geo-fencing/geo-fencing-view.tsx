"use client";

import dynamic from "next/dynamic";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, CheckCircle2, Clock, MapPin, Shield, XCircle } from "lucide-react";
import type { Position, Vehicle } from "@/lib/uctracking/schemas";
import type { SavedGeofence } from "@/lib/geofences/types";
import { pointInPolygon } from "@/lib/geo/geofence";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VmsBackBar, VmsLocationToggle, VmsPageHero, VmsStatCard, type VmsLocationFilter } from "@/components/vms/vms-page-blocks";

const FleetMapInner = dynamic(() => import("@/components/maps/fleet-map-inner").then((m) => m.FleetMapInner), {
  ssr: false,
  loading: () => <div className="h-[420px] animate-pulse rounded-xl bg-vms-inset md:h-[520px]" />,
});

type LocationFilter = VmsLocationFilter;

type GeofenceEvent = {
  id: string;
  fenceId: string;
  fenceName: string;
  plate: string;
  kind: "exit" | "cross";
  message: string;
  at: string;
};

type ZoneRow = {
  id: string;
  fenceId: string;
  name: string;
  vehicles: number;
  status: "Active" | "Inactive";
  lastBreach: string;
  location: "CHO" | "Bonny" | "Other";
};

type BreachRow = {
  id: string;
  vehicle: string;
  driver: string;
  zone: string;
  breachType: string;
  time: string;
  at: string;
  location: "CHO" | "Bonny" | "Other";
};

function inferLocation(name: string): ZoneRow["location"] {
  const n = name.toLowerCase();
  if (n.includes("bonny")) return "Bonny";
  if (n.includes("cho")) return "CHO";
  return "Other";
}

function relativeTime(iso: string): string {
  const t = new Date(iso).valueOf();
  if (Number.isNaN(t)) return "—";
  const ms = Date.now() - t;
  const min = Math.floor(ms / 60000);
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 6) return `${Math.floor(day / 7)} week${day >= 14 ? "s" : ""} ago`;
  if (day > 0) return day === 1 ? "Yesterday" : `${day} days ago`;
  if (hr > 0) return hr === 1 ? "1 hour ago" : `${hr} hours ago`;
  if (min > 0) return min === 1 ? "1 minute ago" : `${min} minutes ago`;
  return "just now";
}

function breachTypeLabel(kind: GeofenceEvent["kind"]): string {
  if (kind === "exit") return "Exit";
  return "Cross";
}

function formatZoneId(index: number): string {
  return `ZONE-${String(index + 1).padStart(3, "0")}`;
}

async function fetchGeofences(): Promise<{ geofences: SavedGeofence[] }> {
  const res = await fetch("/api/fleet/geofences");
  if (res.status === 401) return { geofences: [] };
  if (!res.ok) throw new Error("geofences");
  return res.json();
}

async function fetchGeofenceEvents(): Promise<{ events: GeofenceEvent[] }> {
  const res = await fetch("/api/fleet/geofence-events?hours=24");
  if (res.status === 401) return { events: [] };
  if (!res.ok) return { events: [] };
  const body = await res.json();
  return { events: body.events ?? [] };
}

async function fetchPositions(): Promise<Position[]> {
  const res = await fetch("/api/fleet/positions");
  if (!res.ok) return [];
  return res.json();
}

async function fetchUserMarkers() {
  const res = await fetch("/api/fleet/areas/user-markers?toMap=2");
  if (!res.ok) return { source: "error", data: null as unknown };
  return res.json() as Promise<{ source: string; data: unknown }>;
}

async function fetchVehicles(): Promise<Vehicle[]> {
  const res = await fetch("/api/fleet/vehicles");
  if (!res.ok) return [];
  const body = await res.json();
  return body.data ?? [];
}

export function GeoFencingView() {
  const [location, setLocation] = useState<LocationFilter>("all");

  const geofencesQ = useQuery({
    queryKey: ["fleet-geofences"],
    queryFn: fetchGeofences,
    refetchOnWindowFocus: true,
  });
  const eventsQ = useQuery({
    queryKey: ["fleet-geofence-events", 24],
    queryFn: fetchGeofenceEvents,
    refetchInterval: 30_000,
    refetchOnWindowFocus: true,
  });
  const positionsQ = useQuery({
    queryKey: ["fleet-positions"],
    queryFn: fetchPositions,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });
  const markersQ = useQuery({ queryKey: ["user-markers"], queryFn: fetchUserMarkers, refetchOnWindowFocus: false });
  const vehiclesQ = useQuery({ queryKey: ["fleet-vehicles"], queryFn: fetchVehicles });

  const driverByPlate = useMemo(() => {
    const map = new Map<string, string>();
    for (const v of vehiclesQ.data ?? []) {
      if (v.driverName) map.set(v.plate, v.driverName);
    }
    return map;
  }, [vehiclesQ.data]);

  const lastBreachByFence = useMemo(() => {
    const map = new Map<string, string>();
    for (const e of eventsQ.data?.events ?? []) {
      const prev = map.get(e.fenceId);
      if (!prev || new Date(e.at) > new Date(prev)) map.set(e.fenceId, e.at);
    }
    return map;
  }, [eventsQ.data?.events]);

  const zones = useMemo((): ZoneRow[] => {
    const saved = [...(geofencesQ.data?.geofences ?? [])].sort(
      (a, b) => new Date(a.createdAt).valueOf() - new Date(b.createdAt).valueOf(),
    );
    const positions = positionsQ.data ?? [];

    return saved.map((g, i) => {
      const vehicles = g.ring.length >= 3
        ? positions.filter((p) => pointInPolygon(g.ring, p.lat, p.lng)).length
        : 0;
      const lastAt = lastBreachByFence.get(g.id);
      return {
        id: formatZoneId(i),
        fenceId: g.id,
        name: g.name,
        vehicles,
        status: g.enabled ? "Active" : "Inactive",
        lastBreach: lastAt ? relativeTime(lastAt) : "—",
        location: inferLocation(g.name),
      };
    });
  }, [geofencesQ.data?.geofences, positionsQ.data, lastBreachByFence]);

  const breaches = useMemo((): BreachRow[] => {
    return (eventsQ.data?.events ?? [])
      .map((e) => ({
        id: e.id,
        vehicle: e.plate,
        driver: driverByPlate.get(e.plate) ?? "—",
        zone: e.fenceName,
        breachType: breachTypeLabel(e.kind),
        time: relativeTime(e.at),
        at: e.at,
        location: inferLocation(e.fenceName),
      }))
      .sort((a, b) => new Date(b.at).valueOf() - new Date(a.at).valueOf());
  }, [eventsQ.data?.events, driverByPlate]);

  const matchesLocation = (loc: ZoneRow["location"]) => {
    if (location === "all") return true;
    return loc === location;
  };

  const filteredZones = useMemo(() => zones.filter((z) => matchesLocation(z.location)), [zones, location]);
  const filteredBreaches = useMemo(() => breaches.filter((b) => matchesLocation(b.location)), [breaches, location]);

  const stats = useMemo(() => {
    const totalZones = filteredZones.length;
    const inactive = filteredZones.filter((z) => z.status === "Inactive").length;
    const active = totalZones - inactive;
    const positions = positionsQ.data ?? [];
    const enabledFences = (geofencesQ.data?.geofences ?? []).filter((g) => g.enabled && g.ring.length >= 3);

    const platesInZone = new Set<string>();
    for (const p of positions) {
      const key = p.plate ?? p.vehicleId;
      for (const g of enabledFences) {
        if (!matchesLocation(inferLocation(g.name))) continue;
        if (pointInPolygon(g.ring, p.lat, p.lng)) {
          platesInZone.add(key);
          break;
        }
      }
    }

    const fleetTotal = vehiclesQ.data?.length ?? positions.length;
    const vehiclesInZone = platesInZone.size;
    const vehiclesOut = Math.max(0, fleetTotal - vehiclesInZone);
    const breachCount = filteredBreaches.length;

    return { totalZones, inactive, active, vehiclesInZone, vehiclesOut, breachCount };
  }, [filteredZones, filteredBreaches, positionsQ.data, geofencesQ.data?.geofences, vehiclesQ.data?.length, location]);

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar right={<VmsLocationToggle value={location} onChange={setLocation} />} />

      <VmsPageHero
        icon={Shield}
        title="Geo Fencing Dashboard"
        description="Monitor vehicle locations, draw zones on the map, and track compliance."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="Total Zones"
          value={stats.totalZones}
          sub={`${stats.inactive} inactive`}
          trend={`${stats.active} active`}
          trendTone="good"
          icon={MapPin}
        />
        <VmsStatCard
          label="Vehicles In Zone"
          value={stats.vehiclesInZone}
          sub="Within designated areas"
          trend="Live from GPS positions"
          trendTone="good"
          icon={CheckCircle2}
        />
        <VmsStatCard
          label="Vehicles Out of Zone"
          value={stats.vehiclesOut}
          sub="Outside designated areas"
          trend="Live from GPS positions"
          trendTone="good"
          icon={XCircle}
        />
        <VmsStatCard
          label="Breaches (24h)"
          value={stats.breachCount}
          sub="Zone violations"
          trend="Last 24 hours"
          trendTone={stats.breachCount > 0 ? "bad" : "neutral"}
          icon={AlertTriangle}
        />
      </div>

      {stats.breachCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 md:px-5 md:py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-nlng-amber" />
          <p className="text-sm text-amber-100/90 md:text-base">
            <span className="font-semibold text-amber-50">{stats.breachCount} zone breach(es)</span> in the last 24 hours.
            Review vehicle locations and driver assignments below.
          </p>
        </div>
      ) : null}

      <Card id="live-fleet-map">
        <CardHeader>
          <div>
            <CardTitle>Live fleet map</CardTitle>
            <p className="mt-1 text-sm text-zinc-400 md:text-base">
              All saved geofence zones are shown on the map. Use <strong className="text-zinc-300">New geofence</strong> and
              click vertices to draw a zone, then name and save it.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-0">
          <FleetMapInner
            compact
            positions={positionsQ.data ?? []}
            userMarkers={markersQ.data?.data ?? null}
            userMarkersSource={markersQ.data?.source}
          />
        </CardContent>
      </Card>

      <Card id="geo-fence-zones">
        <CardHeader>
          <div>
            <CardTitle>Geo Fence Zones</CardTitle>
            <p className="mt-1 text-sm text-zinc-400 md:text-base">All geofencing zones created on the map.</p>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {geofencesQ.isLoading ? (
            <div className="py-8 text-center text-zinc-500">Loading zones…</div>
          ) : filteredZones.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">
              No geofence zones yet. Use the map above to draw and save a zone.
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm md:text-base">
              <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                <tr>
                  <th className="border-b border-vms-border py-3 pr-4">Zone ID</th>
                  <th className="border-b border-vms-border py-3 pr-4">Zone Name</th>
                  <th className="border-b border-vms-border py-3 pr-4">Vehicles</th>
                  <th className="border-b border-vms-border py-3 pr-4">Status</th>
                  <th className="border-b border-vms-border py-3">Last Breach</th>
                </tr>
              </thead>
              <tbody>
                {filteredZones.map((z) => (
                  <tr key={z.fenceId} className="hover:bg-vms-inset/60">
                    <td className="border-b border-vms-border py-3 pr-4 font-mono text-zinc-300">{z.id}</td>
                    <td className="border-b border-vms-border py-3 pr-4 font-medium text-zinc-100">{z.name}</td>
                    <td className="border-b border-vms-border py-3 pr-4 tabular-nums text-zinc-200">{z.vehicles}</td>
                    <td className="border-b border-vms-border py-3 pr-4">
                      <Badge variant={z.status === "Active" ? "success" : "default"}>{z.status}</Badge>
                    </td>
                    <td className="border-b border-vms-border py-3 text-zinc-400">
                      <span className="inline-flex items-center gap-1.5">
                        <Clock className="h-3.5 w-3.5 shrink-0" />
                        {z.lastBreach}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card id="recent-breaches">
        <CardHeader>
          <div>
            <CardTitle>Recent Zone Breaches</CardTitle>
            <p className="mt-1 text-sm text-zinc-400 md:text-base">All zone breaches in the past 24 hours.</p>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {eventsQ.isLoading ? (
            <div className="py-8 text-center text-zinc-500">Loading breaches…</div>
          ) : (
            <table className="w-full min-w-[680px] text-left text-sm md:text-base">
              <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                <tr>
                  <th className="border-b border-vms-border py-3 pr-4">Vehicle</th>
                  <th className="border-b border-vms-border py-3 pr-4">Driver</th>
                  <th className="border-b border-vms-border py-3 pr-4">Zone</th>
                  <th className="border-b border-vms-border py-3 pr-4">Breach Type</th>
                  <th className="border-b border-vms-border py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {filteredBreaches.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-zinc-500">
                      No zone breaches in the last 24 hours.
                    </td>
                  </tr>
                ) : (
                  filteredBreaches.map((b) => (
                    <tr key={b.id} className="hover:bg-vms-inset/60">
                      <td className="border-b border-vms-border py-3 pr-4 font-semibold text-zinc-100">{b.vehicle}</td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-200">{b.driver}</td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-300">{b.zone}</td>
                      <td className="border-b border-vms-border py-3 pr-4">
                        <Badge variant={b.breachType === "Exit" ? "danger" : "warn"}>{b.breachType}</Badge>
                      </td>
                      <td className="border-b border-vms-border py-3 text-zinc-400">
                        <span className="inline-flex items-center gap-1.5">
                          <Clock className="h-3.5 w-3.5 shrink-0" />
                          {b.time}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
