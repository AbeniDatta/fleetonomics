"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  Car,
  CheckCircle2,
  Droplets,
  Eye,
  Fuel,
  MapPin,
  AlertTriangle,
  Route,
  XCircle,
} from "lucide-react";
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Alarm, DashboardKpi, Vehicle } from "@/lib/uctracking/schemas";
import {
  fuelPerVehicleMetrics,
  type FuelPerVehicleRow,
} from "@/lib/uctracking/normalize-fleet-fuel-snapshot";
import { formatLatLng } from "@/lib/dashboard/vehicle-table-rows";
import { formatPlateNumberCell } from "@/lib/vehicle-plates/keys";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VmsBackBar, VmsPageHero, VmsStatCard } from "@/components/vms/vms-page-blocks";
import { cn } from "@/lib/utils";

type KpiResponse = DashboardKpi & { source?: string };

const chartTooltip = {
  contentStyle: {
    backgroundColor: "#27272a",
    border: "1px solid #52525b",
    borderRadius: "8px",
    fontSize: "14px",
  },
  labelStyle: { color: "#fafafa" },
};

async function fetchVehicles() {
  const res = await fetch("/api/fleet/vehicles");
  if (!res.ok) throw new Error("vehicles");
  return res.json() as Promise<{ source: string; data: Vehicle[] }>;
}

async function fetchAlarms() {
  const res = await fetch("/api/fleet/alarms");
  if (!res.ok) return { source: "error", data: [] as Alarm[] };
  return res.json() as Promise<{ source: string; data: Alarm[] }>;
}

async function fetchKpi() {
  const res = await fetch("/api/fleet/kpi");
  if (!res.ok) throw new Error("kpi");
  return res.json() as Promise<KpiResponse>;
}

async function fetchFuelPerVehicle() {
  const res = await fetch("/api/fleet/fuel/per-vehicle");
  if (!res.ok) throw new Error("fuel");
  return res.json() as Promise<{ source: string; vehicles: FuelPerVehicleRow[] }>;
}

async function fetchFuelHourly() {
  const res = await fetch("/api/fleet/dashboard/fuel-hourly");
  if (!res.ok) throw new Error("fuel-hourly");
  return res.json() as Promise<{ source: string; data: { hour: string; liters: number }[] }>;
}

function formatFuelLiters(l: number | null): string {
  if (l == null || !Number.isFinite(l)) return "—";
  return `${l.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`;
}

function fuelBarPercent(liters: number | null, maxLiters = 200): number {
  if (liters == null || !Number.isFinite(liters)) return 0;
  return Math.min(100, Math.round((liters / maxLiters) * 100));
}

function fuelBarColorFromLiters(liters: number | null, maxLiters: number): string {
  const pct = fuelBarPercent(liters, maxLiters);
  if (liters == null) return "bg-zinc-600";
  if (pct < 15) return "bg-red-500";
  if (pct < 30) return "bg-nlng-amber";
  return "bg-emerald-500";
}

function displayStatus(v: Vehicle): { label: string; variant: "success" | "warn" | "danger" | "default" } {
  if (v.status === "offline") return { label: "Offline", variant: "default" };
  if (v.status === "parked") return { label: "Parked", variant: "warn" };
  if (v.status === "idle") return { label: "Idle", variant: "warn" };
  if (v.status === "moving") return { label: "Moving", variant: "success" };
  if (v.status === "breach" || v.status === "alert") return { label: "Alert", variant: "danger" };
  return { label: "Online", variant: "success" };
}

function deviceBucket(
  v: Vehicle,
  kind: "fuel" | "gps" | "dms",
  fuelRow?: FuelPerVehicleRow,
): "online" | "warning" | "offline" {
  if (v.status === "offline") return "offline";
  if (kind === "fuel") {
    if (fuelRow?.fuelVolumeL != null) return fuelRow.fuelVolumeL < 15 ? "warning" : "online";
    if (v.fuelPercent != null) return v.fuelPercent < 15 ? "warning" : "online";
    return "warning";
  }
  if (kind === "gps") {
    if (v.position?.lat != null && v.position?.lng != null) return "online";
    return "warning";
  }
  if (v.driverName || v.driverScore != null) {
    return v.driverScore != null && v.driverScore < 60 ? "warning" : "online";
  }
  return "warning";
}

function computeDeviceHealth(vehicles: Vehicle[], fuelByKey: Map<string, FuelPerVehicleRow>) {
  const kinds = ["fuel", "gps", "dms"] as const;
  const out: Record<(typeof kinds)[number], { online: number; warning: number; offline: number }> = {
    fuel: { online: 0, warning: 0, offline: 0 },
    gps: { online: 0, warning: 0, offline: 0 },
    dms: { online: 0, warning: 0, offline: 0 },
  };
  for (const v of vehicles) {
    const fuelRow = fuelByKey.get(v.plate) ?? (v.devIdno ? fuelByKey.get(v.devIdno) : undefined);
    for (const k of kinds) {
      out[k][deviceBucket(v, k, fuelRow)]++;
    }
  }
  return out;
}

function DeviceHealthCard({
  title,
  icon: Icon,
  total,
  online,
  warning,
  offline,
  detailsHref = "/fuel",
}: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  total: number;
  online: number;
  warning: number;
  offline: number;
  detailsHref?: string;
}) {
  const healthPct = total > 0 ? Math.round((online / total) * 100) : 0;
  return (
    <Card>
      <CardContent className="space-y-4 pt-5">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-nlng-amber/15 text-nlng-amber">
            <Icon className="h-5 w-5" />
          </div>
          <div>
            <div className="font-semibold text-zinc-100">{title}</div>
            <div className="text-sm text-zinc-500">{total} vehicles</div>
          </div>
        </div>
        <ul className="space-y-2 text-sm">
          <li className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-zinc-400">
              <CheckCircle2 className="h-4 w-4 text-emerald-400" /> Online
            </span>
            <span className="font-semibold text-emerald-400">{online}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-zinc-400">
              <AlertTriangle className="h-4 w-4 text-nlng-amber" /> Warning
            </span>
            <span className="font-semibold text-nlng-amber">{warning}</span>
          </li>
          <li className="flex items-center justify-between">
            <span className="inline-flex items-center gap-2 text-zinc-400">
              <XCircle className="h-4 w-4 text-red-400" /> Offline
            </span>
            <span className="font-semibold text-red-400">{offline}</span>
          </li>
        </ul>
        <div>
          <div className="h-2 overflow-hidden rounded-full bg-vms-inset">
            <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${healthPct}%` }} />
          </div>
          <div className="mt-1 text-right text-sm font-medium text-emerald-400">{healthPct}%</div>
        </div>
        <Link href={detailsHref} className="text-sm font-medium text-nlng-amber hover:underline">
          Click to view details →
        </Link>
      </CardContent>
    </Card>
  );
}

export function VehiclesDashboardView() {
  const vehQ = useQuery({
    queryKey: ["fleet-vehicles"],
    queryFn: fetchVehicles,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const alarmQ = useQuery({
    queryKey: ["fleet-alarms"],
    queryFn: fetchAlarms,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const kpiQ = useQuery({
    queryKey: ["fleet-kpi"],
    queryFn: fetchKpi,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const fuelQ = useQuery({
    queryKey: ["fuel-per-vehicle"],
    queryFn: fetchFuelPerVehicle,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const fuelHourlyQ = useQuery({
    queryKey: ["dashboard-fuel-hourly"],
    queryFn: fetchFuelHourly,
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const fleetVehicles = useMemo(() => {
    const list = vehQ.data?.data ?? [];
    return [...list].sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehQ.data?.data]);

  const fuelByKey = useMemo(() => {
    const map = new Map<string, FuelPerVehicleRow>();
    for (const row of fuelQ.data?.vehicles ?? []) {
      map.set(row.plate, row);
      if (row.devIdno) map.set(row.devIdno, row);
    }
    return map;
  }, [fuelQ.data?.vehicles]);

  const fuelMetrics = useMemo(() => fuelPerVehicleMetrics(fuelQ.data?.vehicles ?? []), [fuelQ.data?.vehicles]);

  const maxTankL = useMemo(() => {
    const volumes = (fuelQ.data?.vehicles ?? [])
      .map((r) => r.fuelVolumeL)
      .filter((v): v is number => v != null && v > 0);
    return volumes.length > 0 ? Math.max(...volumes, 80) : 200;
  }, [fuelQ.data?.vehicles]);

  const metrics = useMemo(() => {
    const total = fleetVehicles.length;
    const online = fleetVehicles.filter((v) => v.status !== "offline").length;
    const idle = fleetVehicles.filter((v) => v.status === "idle" || v.status === "parked").length;
    const moving = fleetVehicles.filter((v) => (v.speedKmh ?? 0) > 0).length;
    return { total, online, idle, moving };
  }, [fleetVehicles]);

  const kpi = kpiQ.data;
  const deviceHealth = useMemo(() => computeDeviceHealth(fleetVehicles, fuelByKey), [fleetVehicles, fuelByKey]);

  const theftCount = useMemo(() => {
    const fromAlarms = (alarmQ.data?.data ?? []).filter((a) => /theft|fuel\s*drop|drain/i.test(a.message)).length;
    const fromVehicles = fleetVehicles.filter((v) => /theft|fuel drop/i.test(v.alarmSummary ?? "")).length;
    return fromAlarms + fromVehicles;
  }, [alarmQ.data?.data, fleetVehicles]);

  const openAlarms = useMemo(
    () => (alarmQ.data?.data ?? []).filter((a) => a.acknowledged !== true).length,
    [alarmQ.data?.data],
  );

  const fuelHourly = fuelHourlyQ.data?.data ?? [];
  const fuelChartHasData = fuelHourly.some((p) => p.liters > 0);

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar />

      <VmsPageHero
        icon={Car}
        title="Vehicles"
        description="Monitor fleet performance, device health, and fuel consumption"
      />

      {vehQ.isError ? (
        <p className="rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-red-200">
          Could not load the fleet list from uctracking. Check your connection and{" "}
          <code className="text-red-100">UCTRACKING_*</code> settings in <code className="text-red-100">.env.local</code>.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="Total vehicles"
          value={vehQ.isLoading ? "—" : metrics.total.toLocaleString()}
          sub={`${metrics.idle} idle or parked`}
          trend={`${metrics.online} online now`}
          trendTone={metrics.online > 0 ? "good" : "neutral"}
          icon={Car}
        />
        <VmsStatCard
          label="Fleet fuel on board"
          value={fuelMetrics.totalFleetFuelL != null ? formatFuelLiters(fuelMetrics.totalFleetFuelL) : "—"}
          sub={`${fuelMetrics.withVolumeCount} reporting tank volume`}
          trend={fuelQ.isFetching ? "Refreshing fuel data…" : `${fuelMetrics.movingCount} vehicles moving`}
          trendTone={fuelMetrics.withVolumeCount > 0 ? "good" : "neutral"}
          icon={Fuel}
        />
        <VmsStatCard
          label="Distance today"
          value={kpi?.kmToday != null ? `${kpi.kmToday.toLocaleString()} km` : "—"}
          sub="Fleet total from device status"
          trend={kpiQ.isFetching ? "Updating…" : `${metrics.moving} vehicles in motion`}
          trendTone="neutral"
          icon={Route}
        />
        <VmsStatCard
          label="Open alarms"
          value={openAlarms.toLocaleString()}
          sub="Active issues in alarm feed"
          trend={openAlarms === 0 ? "No open alarms" : "Review on ADAS page"}
          trendTone={openAlarms > 0 ? "bad" : "good"}
          icon={Activity}
        />
      </div>

      <div>
        <h2 className="vms-page-title mb-4">Device health</h2>
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          <DeviceHealthCard
            title="Fuel telemetry"
            icon={Droplets}
            total={fleetVehicles.length}
            online={deviceHealth.fuel.online}
            warning={deviceHealth.fuel.warning}
            offline={deviceHealth.fuel.offline}
          />
          <DeviceHealthCard
            title="GPS tracking"
            icon={MapPin}
            total={fleetVehicles.length}
            online={deviceHealth.gps.online}
            warning={deviceHealth.gps.warning}
            offline={deviceHealth.gps.offline}
            detailsHref="/geo-fencing"
          />
          <DeviceHealthCard
            title="Driver monitoring"
            icon={Eye}
            total={fleetVehicles.length}
            online={deviceHealth.dms.online}
            warning={deviceHealth.dms.warning}
            offline={deviceHealth.dms.offline}
            detailsHref="/drivers"
          />
        </div>
      </div>

      {theftCount > 0 ? (
        <div className="flex items-start gap-3 rounded-xl border border-red-500/40 bg-red-500/10 px-4 py-3 md:px-5 md:py-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
          <p className="text-sm text-red-100/90">
            <span className="font-semibold text-red-50">{theftCount} fuel security alert(s)</span> in the current feed.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Fuel use today</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">Hourly consumption from today&apos;s telematics report</p>
          </div>
        </CardHeader>
        <CardContent>
          {fuelHourlyQ.isLoading ? (
            <p className="py-16 text-center text-sm text-zinc-500">Loading fuel chart…</p>
          ) : !fuelChartHasData ? (
            <p className="py-16 text-center text-sm text-zinc-500">
              No consumption data for today yet. Run a fuel report on the Fuel page or wait for the next sync.
            </p>
          ) : (
            <div className="h-72 w-full md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fuelHourly} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                  <XAxis dataKey="hour" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                  <YAxis tick={{ fontSize: 11, fill: "#f4a62a" }} tickFormatter={(v) => `${v} L`} />
                  <Tooltip
                    {...chartTooltip}
                    formatter={(value: number) => [`${value.toLocaleString()} L`, "Consumption"]}
                  />
                  <Line
                    type="monotone"
                    dataKey="liters"
                    name="Consumption (L)"
                    stroke="#F4A62A"
                    strokeWidth={2}
                    dot={false}
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Vehicle list</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {vehQ.isLoading ? (
            <p className="text-sm text-zinc-500">Loading vehicles…</p>
          ) : fleetVehicles.length === 0 ? (
            <p className="text-sm text-zinc-500">No vehicles in the fleet list.</p>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                <tr>
                  <th className="border-b border-vms-border py-3 pr-4">Device number</th>
                  <th className="border-b border-vms-border py-3 pr-4">Plate number</th>
                  <th className="border-b border-vms-border py-3 pr-4">Driver</th>
                  <th className="border-b border-vms-border py-3 pr-4">Location</th>
                  <th className="border-b border-vms-border py-3 pr-4">Speed</th>
                  <th className="border-b border-vms-border py-3 pr-4">Fuel volume</th>
                  <th className="border-b border-vms-border py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {fleetVehicles.map((v) => {
                  const fuelRow = fuelByKey.get(v.plate) ?? (v.devIdno ? fuelByKey.get(v.devIdno) : undefined);
                  const fuelL = fuelRow?.fuelVolumeL ?? null;
                  const speed = fuelRow?.speedKmh ?? v.speedKmh;
                  const coords =
                    v.position?.lat != null && v.position?.lng != null
                      ? formatLatLng(v.position.lat, v.position.lng)
                      : null;
                  const location = coords ?? v.locationLabel ?? "—";
                  const st = displayStatus(v);
                  const deviceId = v.devIdno ?? v.plate;

                  return (
                    <tr key={v.id} className="hover:bg-vms-inset/60">
                      <td className="border-b border-vms-border py-3 pr-4">
                        <Link
                          href={`/vehicles/${encodeURIComponent(v.plate)}`}
                          className="font-semibold text-sky-400 hover:underline"
                        >
                          {deviceId}
                        </Link>
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-200">
                        {formatPlateNumberCell(v.plateNumber)}
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-200">{v.driverName ?? "—"}</td>
                      <td className="max-w-[12rem] border-b border-vms-border py-3 pr-4 tabular-nums text-zinc-200">
                        {location}
                      </td>
                      <td
                        className={cn(
                          "border-b border-vms-border py-3 pr-4 tabular-nums",
                          speed != null && speed > 90 ? "font-semibold text-red-400" : "text-zinc-200",
                        )}
                      >
                        {speed != null ? `${Math.round(speed)} km/h` : "—"}
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4">
                        {fuelL != null ? (
                          <div className="flex min-w-[120px] items-center gap-2">
                            <div className="h-2 flex-1 overflow-hidden rounded-full bg-vms-inset">
                              <div
                                className={cn("h-full rounded-full", fuelBarColorFromLiters(fuelL, maxTankL))}
                                style={{ width: `${fuelBarPercent(fuelL, maxTankL)}%` }}
                              />
                            </div>
                            <span className="tabular-nums text-zinc-200">{formatFuelLiters(fuelL)}</span>
                          </div>
                        ) : v.fuelPercent != null ? (
                          <span className="tabular-nums text-zinc-200">{v.fuelPercent}%</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="border-b border-vms-border py-3">
                        <Badge variant={st.variant}>{st.label}</Badge>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
