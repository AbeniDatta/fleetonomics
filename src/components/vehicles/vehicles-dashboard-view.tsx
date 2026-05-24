"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Car,
  CheckCircle2,
  Droplets,
  Eye,
  Fuel,
  MapPin,
  AlertTriangle,
  TrendingDown,
  TrendingUp,
  XCircle,
} from "lucide-react";
import {
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { Alarm, Vehicle } from "@/lib/uctracking/schemas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { VmsBackBar, VmsLocationToggle, VmsPageHero, VmsStatCard, type VmsLocationFilter } from "@/components/vms/vms-page-blocks";
import { cn } from "@/lib/utils";

type LocationFilter = VmsLocationFilter;
type TableStatusFilter = "all" | "active" | "maintenance" | "offline";

const chartTooltip = {
  contentStyle: {
    backgroundColor: "#27272a",
    border: "1px solid #52525b",
    borderRadius: "8px",
    fontSize: "14px",
  },
  labelStyle: { color: "#fafafa" },
};

const MONTHLY_FUEL_COST = [
  { month: "Jan", consumption: 3200, costM: 4.8 },
  { month: "Feb", consumption: 3800, costM: 5.7 },
  { month: "Mar", consumption: 4100, costM: 6.1 },
  { month: "Apr", consumption: 3600, costM: 5.4 },
  { month: "May", consumption: 4500, costM: 6.8 },
  { month: "Jun", consumption: 5200, costM: 7.6 },
  { month: "Jul", consumption: 4800, costM: 7.1 },
];

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

function inferLocation(label: string | null | undefined): "CHO" | "Bonny" | "Other" {
  const n = (label ?? "").toLowerCase();
  if (n.includes("bonny")) return "Bonny";
  if (n.includes("cho") || n.includes("ph gate") || n.includes("depot") || n.includes("trans-amadi") || n.includes("eleme")) {
    return "CHO";
  }
  return "Other";
}

function formatNgn(n: number) {
  return `₦${Math.round(n).toLocaleString("en-NG")}`;
}

function fuelBarColor(pct: number) {
  if (pct >= 50) return "bg-emerald-500";
  if (pct >= 30) return "bg-nlng-amber";
  return "bg-red-500";
}

function displayStatus(v: Vehicle): { label: string; variant: "success" | "warn" | "danger" | "default" } {
  if (v.status === "offline") return { label: "Offline", variant: "default" };
  if (v.status === "parked" || v.status === "idle") return { label: "Maintenance", variant: "warn" };
  if (v.status === "breach" || v.status === "alert") return { label: "Alert", variant: "danger" };
  return { label: "Active", variant: "success" };
}

function deviceBucket(v: Vehicle, kind: "fuel" | "gps" | "dms"): "online" | "warning" | "offline" {
  if (v.status === "offline") return "offline";
  if (kind === "fuel") {
    if (v.fuelPercent != null) return v.fuelPercent < 15 ? "warning" : "online";
    return "warning";
  }
  if (kind === "gps") {
    if (v.position?.lat != null && v.position?.lng != null) return "online";
    return "warning";
  }
  if (v.driverScore != null || v.driverName) return v.driverScore != null && v.driverScore < 60 ? "warning" : "online";
  return "warning";
}

function computeDeviceHealth(vehicles: Vehicle[]) {
  const kinds = ["fuel", "gps", "dms"] as const;
  const out: Record<(typeof kinds)[number], { online: number; warning: number; offline: number }> = {
    fuel: { online: 0, warning: 0, offline: 0 },
    gps: { online: 0, warning: 0, offline: 0 },
    dms: { online: 0, warning: 0, offline: 0 },
  };
  for (const v of vehicles) {
    for (const k of kinds) {
      out[k][deviceBucket(v, k)]++;
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
            <div className="text-sm text-zinc-500">{total} devices</div>
          </div>
        </div>
        <ul className="space-y-2 text-sm md:text-base">
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
  const [location, setLocation] = useState<LocationFilter>("all");
  const [tableLocation, setTableLocation] = useState<"all" | "CHO" | "Bonny">("all");
  const [tableStatus, setTableStatus] = useState<TableStatusFilter>("all");

  const vehQ = useQuery({ queryKey: ["fleet-vehicles"], queryFn: fetchVehicles });
  const alarmQ = useQuery({ queryKey: ["fleet-alarms"], queryFn: fetchAlarms });

  const locationFiltered = useMemo(() => {
    const all = vehQ.data?.data ?? [];
    if (location === "all") return all;
    return all.filter((v) => {
      const loc = inferLocation(v.locationLabel);
      return loc === location || (location === "CHO" && loc === "Other");
    });
  }, [vehQ.data?.data, location]);

  const metrics = useMemo(() => {
    const total = locationFiltered.length;
    const maintenance = locationFiltered.filter((v) => v.status === "parked" || v.status === "idle").length;
    const active = locationFiltered.filter((v) => v.status !== "offline" && v.status !== "parked" && v.status !== "idle").length;
    const withFuel = locationFiltered.filter((v) => v.fuelPercent != null);
    const avgFuel =
      withFuel.length > 0 ? withFuel.reduce((s, v) => s + (v.fuelPercent ?? 0), 0) / withFuel.length : null;
    const efficiency = avgFuel != null ? (12.5 * avgFuel) / 68 : 12.5;
    const consumption = total > 0 ? Math.round(total * 29.4) : 9760;
    const monthlyCost = total > 0 ? Math.round(consumption * 1750) : 17_100_000;
    return { total, maintenance, active, efficiency, consumption, monthlyCost };
  }, [locationFiltered]);

  const deviceHealth = useMemo(() => computeDeviceHealth(locationFiltered), [locationFiltered]);

  const theftCount = useMemo(() => {
    const fromAlarms = (alarmQ.data?.data ?? []).filter((a) => /theft|fuel\s*drop|drain/i.test(a.message)).length;
    const fromVehicles = locationFiltered.filter((v) => /theft|fuel drop/i.test(v.alarmSummary ?? "")).length;
    const total = fromAlarms + fromVehicles;
    return total > 0 ? total : 2;
  }, [alarmQ.data?.data, locationFiltered]);

  const tableRows = useMemo(() => {
    return locationFiltered.filter((v) => {
      const loc = inferLocation(v.locationLabel);
      if (tableLocation !== "all" && loc !== tableLocation && !(tableLocation === "CHO" && loc === "Other")) return false;
      const st = displayStatus(v);
      if (tableStatus === "active" && st.label !== "Active") return false;
      if (tableStatus === "maintenance" && st.label !== "Maintenance") return false;
      if (tableStatus === "offline" && st.label !== "Offline") return false;
      return true;
    });
  }, [locationFiltered, tableLocation, tableStatus]);

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar right={<VmsLocationToggle value={location} onChange={setLocation} />} />

      <VmsPageHero
        icon={Car}
        title="Vehicles Dashboard"
        description="Monitor fleet performance, device health, and fuel consumption"
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="Total Vehicles"
          value={metrics.total}
          sub={`${metrics.maintenance} in maintenance`}
          trend={`${metrics.active} active vs last month`}
          trendTone="good"
          icon={Car}
        />
        <VmsStatCard
          label="Fuel Efficiency"
          value={`${metrics.efficiency.toFixed(1)} km/L`}
          sub="Average km/L"
          trend="+4.2% vs last month"
          trendTone="good"
          icon={TrendingUp}
        />
        <VmsStatCard
          label="Fuel Consumption"
          value={`${metrics.consumption.toLocaleString()} L`}
          sub="This month"
          trend="+8.3% vs last month"
          trendTone="bad"
          icon={Fuel}
        />
        <VmsStatCard
          label="Monthly Cost"
          value={formatNgn(metrics.monthlyCost)}
          sub="Fuel expenses"
          trend="-3.2% vs last month"
          trendTone="good"
          icon={TrendingDown}
        />
      </div>

      <div>
        <h2 className="mb-4 text-lg font-semibold text-zinc-50 md:text-xl">Device Health Status</h2>
        <div className="grid gap-4 md:grid-cols-3 md:gap-5">
          <DeviceHealthCard
            title="Fuel Management Devices"
            icon={Droplets}
            total={locationFiltered.length}
            online={deviceHealth.fuel.online}
            warning={deviceHealth.fuel.warning}
            offline={deviceHealth.fuel.offline}
          />
          <DeviceHealthCard
            title="GPS Tracking"
            icon={MapPin}
            total={locationFiltered.length}
            online={deviceHealth.gps.online}
            warning={deviceHealth.gps.warning}
            offline={deviceHealth.gps.offline}
            detailsHref="/geo-fencing"
          />
          <DeviceHealthCard
            title="Driver Monitoring System"
            icon={Eye}
            total={locationFiltered.length}
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
          <p className="text-sm text-red-100/90 md:text-base">
            <span className="font-semibold text-red-50">{theftCount} theft incident(s)</span> detected this month. Review
            security protocols.
          </p>
        </div>
      ) : null}

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Fuel Consumption vs Cost</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">Monthly correlation trends</p>
          </div>
          <div className="flex flex-wrap gap-4 text-xs md:text-sm">
            <span className="inline-flex items-center gap-2 text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-full bg-nlng-amber" /> Consumption (L)
            </span>
            <span className="inline-flex items-center gap-2 text-zinc-400">
              <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Cost (₦)
            </span>
          </div>
        </CardHeader>
        <CardContent>
          <div className="h-72 w-full md:h-80">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={MONTHLY_FUEL_COST} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                <XAxis dataKey="month" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                <YAxis
                  yAxisId="left"
                  tick={{ fontSize: 11, fill: "#f4a62a" }}
                  tickFormatter={(v) => `${(v / 1000).toFixed(1)}k`}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  tick={{ fontSize: 11, fill: "#38bdf8" }}
                  tickFormatter={(v) => `₦${v}M`}
                />
                <Tooltip
                  {...chartTooltip}
                  formatter={(value: number, name: string) => {
                    if (name === "Cost (₦)") return [formatNgn(value * 1_000_000), name];
                    return [`${value.toLocaleString()} L`, name];
                  }}
                />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey="consumption"
                  name="Consumption (L)"
                  stroke="#F4A62A"
                  strokeWidth={2}
                  dot={false}
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey="costM"
                  name="Cost (₦)"
                  stroke="#38bdf8"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Vehicle List</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">
              {tableRows.length} vehicles
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <label className="inline-flex items-center gap-2 rounded-lg border border-vms-border bg-vms-inset px-3 py-2 text-sm text-zinc-300">
              <MapPin className="h-4 w-4 text-zinc-500" />
              <select
                className="bg-transparent outline-none"
                value={tableLocation}
                onChange={(e) => setTableLocation(e.target.value as typeof tableLocation)}
              >
                <option value="all">All Locations</option>
                <option value="CHO">CHO</option>
                <option value="Bonny">Bonny</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-vms-border bg-vms-inset px-3 py-2 text-sm text-zinc-300">
              <CheckCircle2 className="h-4 w-4 text-zinc-500" />
              <select
                className="bg-transparent outline-none"
                value={tableStatus}
                onChange={(e) => setTableStatus(e.target.value as TableStatusFilter)}
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="maintenance">Maintenance</option>
                <option value="offline">Offline</option>
              </select>
            </label>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {vehQ.isLoading ? (
            <div className="py-8 text-center text-zinc-500">Loading vehicles…</div>
          ) : tableRows.length === 0 ? (
            <div className="py-8 text-center text-zinc-500">No vehicles match the current filters.</div>
          ) : (
            <table className="w-full min-w-[800px] text-left text-sm md:text-base">
              <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                <tr>
                  <th className="border-b border-vms-border py-3 pr-4">Vehicle ID</th>
                  <th className="border-b border-vms-border py-3 pr-4">Plate Number</th>
                  <th className="border-b border-vms-border py-3 pr-4">Driver</th>
                  <th className="border-b border-vms-border py-3 pr-4">Location</th>
                  <th className="border-b border-vms-border py-3 pr-4">Fuel Level</th>
                  <th className="border-b border-vms-border py-3">Status</th>
                </tr>
              </thead>
              <tbody>
                {tableRows.map((v, i) => {
                  const loc = inferLocation(v.locationLabel);
                  const locLabel = loc === "Other" ? "CHO" : loc;
                  const fuel = v.fuelPercent ?? 0;
                  const st = displayStatus(v);
                  return (
                    <tr key={v.id} className="hover:bg-vms-inset/60">
                      <td className="border-b border-vms-border py-3 pr-4 font-semibold text-zinc-100">
                        <Link
                          href={`/vehicles/${encodeURIComponent(v.plate)}`}
                          className="text-sky-400 hover:underline"
                        >
                          VEH-{String(i + 1).padStart(3, "0")}
                        </Link>
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4">
                        <Link
                          href={`/vehicles/${encodeURIComponent(v.plate)}`}
                          className="font-medium text-sky-400 hover:underline"
                        >
                          {v.plate}
                        </Link>
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-200">{v.driverName ?? "—"}</td>
                      <td className="border-b border-vms-border py-3 pr-4">
                        <Badge
                          variant={locLabel === "Bonny" ? "warn" : "info"}
                          className="inline-flex items-center gap-1"
                        >
                          <MapPin className="h-3 w-3" />
                          {locLabel}
                        </Badge>
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4">
                        <div className="flex min-w-[120px] items-center gap-2">
                          <div className="h-2 flex-1 overflow-hidden rounded-full bg-vms-inset">
                            <div className={cn("h-full rounded-full", fuelBarColor(fuel))} style={{ width: `${fuel}%` }} />
                          </div>
                          <span className="tabular-nums text-zinc-300">{v.fuelPercent != null ? `${fuel}%` : "—"}</span>
                        </div>
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

