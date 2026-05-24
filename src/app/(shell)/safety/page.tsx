"use client";

import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { Activity, AlertTriangle, MapPin, Radar, Shield } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ApiConsole } from "@/components/admin/api-console";
import { DataSourcePill } from "@/components/ui/data-source-pill";
import { VmsBackBar, VmsPageHero, VmsStatCard } from "@/components/vms/vms-page-blocks";
import type { Alarm } from "@/lib/uctracking/schemas";

type GeofenceEvent = {
  id: string;
  fenceName: string;
  plate: string;
  kind: "exit" | "cross";
  message: string;
  at: string;
};

async function fetchAlarms(): Promise<{ source: string; data: Alarm[] }> {
  const res = await fetch("/api/fleet/alarms");
  if (!res.ok) throw new Error("alarms");
  return res.json();
}

async function fetchGeofenceEvents(): Promise<{ source: string; hours: number; events: GeofenceEvent[] }> {
  const res = await fetch("/api/fleet/geofence-events?hours=24");
  if (!res.ok) throw new Error("geofence-events");
  return res.json();
}

export default function SafetyPage() {
  const alarmsQ = useQuery({ queryKey: ["fleet-alarms"], queryFn: fetchAlarms, refetchInterval: 20_000 });
  const geoEventsQ = useQuery({ queryKey: ["geofence-events-24h"], queryFn: fetchGeofenceEvents, refetchInterval: 30_000 });

  const stats = useMemo(() => {
    const alarms = alarmsQ.data?.data ?? [];
    const geoEvents = geoEventsQ.data?.events ?? [];
    const high = alarms.filter((a) => a.severity === "critical" || a.severity === "high").length;
    const adas = alarms.filter((a) => a.source === "ADAS" || a.source === "DMS").length;
    const exits = geoEvents.filter((e) => e.kind === "exit").length;
    return { high, adas, exits, alarmCount: alarms.length, geoCount: geoEvents.length };
  }, [alarmsQ.data?.data, geoEventsQ.data?.events]);

  const alarms = alarmsQ.data?.data ?? [];
  const geoEvents = geoEventsQ.data?.events ?? [];

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar
        right={
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 text-xs text-zinc-500 md:text-sm">
              <span>Alarms</span>
              <DataSourcePill source={alarmsQ.data?.source} />
            </div>
            <div className="flex items-center gap-2 text-xs text-zinc-500 md:text-sm">
              <span>Geofence</span>
              <DataSourcePill source={geoEventsQ.data?.source} />
            </div>
          </div>
        }
      />

      <VmsPageHero
        icon={Radar}
        title="ADAS & Alarms Dashboard"
        description="Live uctracking alarms, recent geofence crossings, and vendor Active Safety consoles for deep investigations."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="Open alarms"
          value={stats.alarmCount}
          sub="Latest pull from /api/fleet/alarms"
          trend={alarmsQ.isFetching ? "Refreshing…" : "Updates every 20s"}
          trendTone="neutral"
          icon={AlertTriangle}
        />
        <VmsStatCard
          label="High priority"
          value={stats.high}
          sub="Critical + high severity"
          trend={stats.high > 0 ? "Review evidence and driver coaching" : "No critical/high in this snapshot"}
          trendTone={stats.high > 0 ? "bad" : "good"}
          icon={Shield}
        />
        <VmsStatCard
          label="ADAS / DMS hits"
          value={stats.adas}
          sub="Tagged to ADAS or DMS sources"
          trend="Counts rows in the normalized alarm feed"
          trendTone="neutral"
          icon={Activity}
        />
        <VmsStatCard
          label="Geofence exits (24h)"
          value={stats.exits}
          sub={`${stats.geoCount} total events`}
          trend="Cross + exit traffic from zones"
          trendTone={stats.exits > 0 ? "bad" : "neutral"}
          icon={MapPin}
        />
      </div>

      {stats.high > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 md:px-5 md:py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-100/90 md:text-base">
            <span className="font-semibold text-red-50">{stats.high} high-severity alarm(s)</span> in the current feed. Open
            the Active Safety consoles below or jump to a vehicle detail for context.
          </p>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2 md:gap-5">
        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Active alarms</CardTitle>
                <p className="mt-1 text-sm text-zinc-400 md:text-base">Normalized uctracking vehicle alarm stream.</p>
              </div>
              <DataSourcePill source={alarmsQ.data?.source} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm md:text-base">
            {alarms.length === 0 ? (
              <div className="py-6 text-center text-zinc-500">No alarms returned.</div>
            ) : (
              alarms.slice(0, 50).map((a) => (
                <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-vms-inset px-3 py-2">
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-100">{a.plate ?? a.vehicleId}</div>
                    <div className="truncate text-xs text-zinc-400 md:text-sm">{a.message}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={a.severity === "critical" || a.severity === "high" ? "danger" : "warn"}>{a.severity}</Badge>
                    <Badge variant="default" className="hidden sm:inline-flex">
                      {a.source}
                    </Badge>
                    <span className="font-mono text-[10px] text-zinc-600 md:text-xs">{new Date(a.raisedAt).toLocaleString()}</span>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div>
                <CardTitle>Geofence events (24h)</CardTitle>
                <p className="mt-1 text-sm text-zinc-400 md:text-base">Cross and exit events for saved zones.</p>
              </div>
              <DataSourcePill source={geoEventsQ.data?.source} />
            </div>
          </CardHeader>
          <CardContent className="space-y-2 text-sm md:text-base">
            {geoEvents.length === 0 ? (
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

      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-50 md:text-xl">Vendor API tools</h2>
        <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
          <ApiConsole
            title="Active Safety — Alarm Inquiry"
            endpoint="/api/fleet/safety/alarm-inquiry"
            description="Connected to uctracking Active Safety Business → Security Alarm Inquiry."
            defaultParams={{
              vehicleNo: "",
              beginTime: "",
              endTime: "",
              alarmType: "",
              toMap: "2",
              currentPage: "1",
              pageRecords: "20",
            }}
          />
          <ApiConsole
            title="Active Safety — Evidence Inquiry (list)"
            endpoint="/api/fleet/safety/evidence-list"
            description="Connected to uctracking Active Safety Business → Security Evidence Inquiry."
            defaultParams={{
              vehIdno: "",
              beginTime: "",
              endTime: "",
              alarmType: "",
              mediaType: "1",
              toMap: "2",
              currentPage: "1",
              pageRecords: "20",
            }}
          />
          <ApiConsole
            title="Active Safety — Evidence Query (by file/guid)"
            endpoint="/api/fleet/safety/evidence-query"
            description="Connected to uctracking Active Safety Business → Evidence Query."
            defaultParams={{
              devIdno: "",
              beginTime: "",
              endTime: "",
              alarmType: "",
              guid: "",
              toMap: "2",
            }}
          />
        </div>
      </div>
    </div>
  );
}
