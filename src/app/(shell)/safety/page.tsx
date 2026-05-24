"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, MapPin, Radar, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CameraFeedsPanel } from "@/components/camera/camera-feeds-panel";
import { SafetyAlarmsPanel } from "@/components/safety/safety-alarms-panel";
import { VmsBackBar, VmsPageHero, VmsStatCard } from "@/components/vms/vms-page-blocks";
import type { SafetyAlarmsPayload } from "@/lib/api/fleet-handlers";

type GeofenceEvent = {
  id: string;
  fenceName: string;
  plate: string;
  kind: "exit" | "cross";
  message: string;
  at: string;
};

async function fetchAdasAlarms(): Promise<SafetyAlarmsPayload> {
  const res = await fetch("/api/fleet/safety/alarms?role=ADAS&hours=24");
  if (!res.ok) throw new Error("safety-alarms");
  return res.json();
}

async function fetchGeofenceEvents(): Promise<{ source: string; hours: number; events: GeofenceEvent[] }> {
  const res = await fetch("/api/fleet/geofence-events?hours=24");
  if (!res.ok) throw new Error("geofence-events");
  return res.json();
}

export default function SafetyPage() {
  const adasQ = useQuery({ queryKey: ["safety-alarms", "ADAS", 24], queryFn: fetchAdasAlarms, refetchInterval: 20_000 });
  const geoEventsQ = useQuery({ queryKey: ["geofence-events-24h"], queryFn: fetchGeofenceEvents, refetchInterval: 30_000 });

  const adasAlarms = adasQ.data?.data ?? [];
  const geoEvents = geoEventsQ.data?.events ?? [];

  const stats = useMemo(() => {
    const high = adasAlarms.filter((a) => a.severity === "critical" || a.severity === "high").length;
    const open = adasAlarms.filter((a) => a.acknowledged !== true).length;
    const exits = geoEvents.filter((e) => e.kind === "exit").length;
    return { high, open, exits, adasCount: adasAlarms.length, geoCount: geoEvents.length };
  }, [adasAlarms, geoEvents]);

  const feeds = adasQ.data?.feeds;

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar />

      <VmsPageHero
        icon={Radar}
        title="ADAS"
        description="Forward road cameras, active safety alarms, and geofence crossing history."
      />

      <CameraFeedsPanel role="ADAS" title="ADAS live camera feeds" />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="ADAS events (24h)"
          value={stats.adasCount}
          sub="Merged safety + alarm detail APIs"
          trend={adasQ.isFetching ? "Refreshing…" : "Updates every 20s"}
          trendTone="neutral"
          icon={AlertTriangle}
        />
        <VmsStatCard
          label="High priority"
          value={stats.high}
          sub="Critical + high severity"
          trend={stats.high > 0 ? "Review evidence and vehicle detail" : "No critical/high in this snapshot"}
          trendTone={stats.high > 0 ? "bad" : "good"}
          icon={Shield}
        />
        <VmsStatCard
          label="Unacknowledged"
          value={stats.open}
          sub="Open ADAS items in feed"
          trend={feeds ? `Safety ${feeds.safetyQuery} · detail ${feeds.alarmPage}` : "Live uctracking feeds"}
          trendTone={stats.open > 0 ? "bad" : "neutral"}
          icon={Activity}
        />
        <VmsStatCard
          label="Geofence exits (24h)"
          value={stats.exits}
          sub={`${stats.geoCount} total zone events`}
          trend="From fleet geofence monitor"
          trendTone={stats.exits > 0 ? "bad" : "neutral"}
          icon={MapPin}
        />
      </div>

      {stats.high > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 md:px-5 md:py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-100/90">
            <span className="font-semibold text-red-50">{stats.high} high-severity ADAS alarm(s)</span> in the last 24
            hours. Open a vehicle from the feed below for map and telemetry context.
          </p>
        </div>
      ) : null}

      <SafetyAlarmsPanel
        role="ADAS"
        title="ADAS active alarms"
        description="Forward collision, lane departure, and other road-facing events from uctracking safety and alarm APIs."
        limit={80}
      />

      <Card>
        <CardHeader>
          <CardTitle>Geofence events (24h)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {geoEventsQ.isLoading ? (
            <div className="py-6 text-center text-zinc-500">Loading geofence events…</div>
          ) : geoEvents.length === 0 ? (
            <div className="py-6 text-center text-zinc-500">No geofence events in the last 24 hours.</div>
          ) : (
            geoEvents.map((e) => (
              <div key={e.id} className="rounded-md bg-vms-inset px-3 py-2">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span className="font-semibold text-zinc-100">{e.plate}</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="default" className="max-w-[160px] truncate">
                      {e.fenceName}
                    </Badge>
                    <Badge variant={e.kind === "exit" ? "danger" : "warn"}>{e.kind === "exit" ? "Exit" : "Cross"}</Badge>
                  </div>
                </div>
                <div className="mt-1 text-xs text-zinc-400 md:text-sm">{e.message}</div>
                <div className="mt-1 font-mono text-[10px] text-zinc-600 md:text-xs">{new Date(e.at).toLocaleString()}</div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
