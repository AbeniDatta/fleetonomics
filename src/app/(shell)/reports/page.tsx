"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Car, FileSpreadsheet, Route, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSourcePill } from "@/components/ui/data-source-pill";
import { VmsBackBar, VmsPageHero, VmsStatCard } from "@/components/vms/vms-page-blocks";
import {
  buildTopVehiclesByKm,
  driverScoreChart,
  openAlarmsChart,
  perVehicleFuelChart,
  perVehicleKmChart,
  safetyAlarmsBySeverityChart,
  type ReportChartPoint,
} from "@/lib/reports/fleet-report-views";
import { fuelPerVehicleMetrics, type FuelPerVehicleRow } from "@/lib/uctracking/normalize-fleet-fuel-snapshot";
import type { Alarm, Vehicle } from "@/lib/uctracking/schemas";
import { cn } from "@/lib/utils";

const categories = ["Mileage", "Fuel", "Safety", "Driver scoring", "Cost allocation", "Maintenance", "Compliance"] as const;
type ReportCategory = (typeof categories)[number];

type KpiPayload = {
  source: string;
  totalVehicles: number;
  kmToday: number;
  alarmsOpen: number;
  active: number;
  offline: number;
  avgKmPerDay: number;
};

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json() as Promise<T>;
}

function chartMeta(cat: ReportCategory): { title: string; valueLabel: string; description: string } {
  switch (cat) {
    case "Mileage":
      return {
        title: "Distance by vehicle",
        valueLabel: "km (today)",
        description: "Per-device distance from live GPS status.",
      };
    case "Fuel":
      return {
        title: "Fuel volume by vehicle",
        valueLabel: "liters",
        description: "Tank volume from device status (yl field).",
      };
    case "Safety":
      return {
        title: "Safety alarms (7 days)",
        valueLabel: "events",
        description: "ADAS and DMS events from uctracking safety APIs.",
      };
    case "Driver scoring":
      return {
        title: "Driver scores",
        valueLabel: "score",
        description: "Scores attached to fleet vehicles when reported by the vendor.",
      };
    default:
      return {
        title: "Fleet alarms",
        valueLabel: "events",
        description: "Open vs acknowledged alarms from the fleet alarm feed.",
      };
  }
}

function combinedSource(sources: (string | undefined)[]): string {
  if (sources.some((s) => s === "error")) return "error";
  if (sources.some((s) => s === "uctracking")) return "uctracking";
  if (sources.every((s) => s === "demo")) return "demo";
  return sources.find(Boolean) ?? "unknown";
}

export default function ReportsPage() {
  const [cat, setCat] = useState<ReportCategory>("Mileage");

  const kpiQ = useQuery({
    queryKey: ["reports-kpi"],
    queryFn: () => fetchJson<KpiPayload>("/api/fleet/kpi"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const statusQ = useQuery({
    queryKey: ["reports-device-status"],
    queryFn: () => fetchJson<{ source: string; data: unknown[] }>("/api/fleet/devices/status-gps?toMap=2"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const fuelQ = useQuery({
    queryKey: ["reports-fuel-per-vehicle"],
    queryFn: () => fetchJson<{ source: string; vehicles: FuelPerVehicleRow[] }>("/api/fleet/fuel/per-vehicle"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const fuelHourlyQ = useQuery({
    queryKey: ["reports-fuel-hourly"],
    queryFn: () => fetchJson<{ source: string; data: { hour: string; liters: number }[] }>("/api/fleet/dashboard/fuel-hourly"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const vehiclesQ = useQuery({
    queryKey: ["reports-vehicles"],
    queryFn: () => fetchJson<{ source: string; data: Vehicle[] }>("/api/fleet/vehicles"),
    staleTime: 60_000,
  });

  const safetyQ = useQuery({
    queryKey: ["reports-safety-alarms"],
    queryFn: () =>
      fetchJson<{ source: string; data: Alarm[] }>("/api/fleet/safety/alarms?role=all&hours=168"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const alarmsQ = useQuery({
    queryKey: ["reports-alarms"],
    queryFn: () => fetchJson<{ source: string; data: Alarm[] }>("/api/fleet/alarms"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const vehicles = vehiclesQ.data?.data ?? [];
  const statusRows = statusQ.data?.data ?? [];
  const fuelRows = fuelQ.data?.vehicles ?? [];
  const fuelMetrics = useMemo(() => fuelPerVehicleMetrics(fuelRows), [fuelRows]);
  const safetyAlarms = safetyQ.data?.data ?? [];
  const fleetAlarms = alarmsQ.data?.data ?? [];

  const topVehicles = useMemo(
    () => buildTopVehiclesByKm(statusRows, vehicles, 10),
    [statusRows, vehicles],
  );

  const chartPoints: ReportChartPoint[] = useMemo(() => {
    switch (cat) {
      case "Mileage":
        return perVehicleKmChart(statusRows, vehicles);
      case "Fuel": {
        const byVehicle = perVehicleFuelChart(fuelRows);
        if (byVehicle.length > 0) return byVehicle;
        const hourly = fuelHourlyQ.data?.data ?? [];
        return hourly.filter((p) => p.liters > 0).map((p) => ({ label: p.hour, value: p.liters }));
      }
      case "Safety": {
        const bySev = safetyAlarmsBySeverityChart(safetyAlarms);
        return bySev.length ? bySev : openAlarmsChart(safetyAlarms);
      }
      case "Driver scoring":
        return driverScoreChart(vehicles);
      default:
        return openAlarmsChart(fleetAlarms);
    }
  }, [cat, statusRows, vehicles, fuelRows, fuelHourlyQ.data?.data, safetyAlarms, fleetAlarms]);

  const chartTotal = useMemo(() => chartPoints.reduce((s, p) => s + p.value, 0), [chartPoints]);
  const chartAvg = chartPoints.length > 0 ? Math.round((chartTotal / chartPoints.length) * 10) / 10 : 0;

  const meta = chartMeta(cat);
  const dataSource = combinedSource([
    kpiQ.data?.source,
    statusQ.data?.source,
    fuelQ.data?.source,
    vehiclesQ.data?.source,
    cat === "Safety" ? safetyQ.data?.source : alarmsQ.data?.source,
  ]);

  const isLoading =
    kpiQ.isLoading ||
    statusQ.isLoading ||
    fuelQ.isLoading ||
    vehiclesQ.isLoading ||
    (cat === "Safety" ? safetyQ.isLoading : alarmsQ.isLoading);

  const hasError =
    kpiQ.isError ||
    statusQ.isError ||
    fuelQ.isError ||
    vehiclesQ.isError ||
    dataSource === "error";

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar />

      <VmsPageHero
        icon={FileSpreadsheet}
        title="Reports"
        description="Mileage, fuel, and fleet analytics for the period and vehicles you select."
        meta={
          <>
            <DataSourcePill
              source={
                dataSource === "uctracking" && chartPoints.length === 0 && !isLoading
                  ? "uctracking-empty"
                  : dataSource
              }
              uctrackingLabel="Live"
            />
            {isLoading ? <span className="text-zinc-500">Loading…</span> : null}
          </>
        }
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="Fleet distance today"
          value={kpiQ.data?.kmToday != null ? `${Math.round(kpiQ.data.kmToday).toLocaleString()} km` : "—"}
          sub={`${kpiQ.data?.totalVehicles ?? "—"} vehicles on account`}
          trend={kpiQ.isLoading ? "Loading fleet KPI…" : "From device GPS status"}
          trendTone="neutral"
          icon={Route}
        />
        <VmsStatCard
          label={`Avg per ${meta.valueLabel === "score" ? "vehicle" : "bucket"}`}
          value={chartAvg.toLocaleString()}
          sub={meta.valueLabel}
          trend={`${chartPoints.length} in chart`}
          trendTone="good"
          icon={BarChart3}
        />
        <VmsStatCard
          label="Open alarms"
          value={kpiQ.data?.alarmsOpen ?? fleetAlarms.filter((a) => a.acknowledged !== true).length}
          sub={`${safetyAlarms.length} safety events (7d)`}
          trend={`${kpiQ.data?.active ?? 0} vehicles online now`}
          trendTone="neutral"
          icon={Shield}
        />
        <VmsStatCard
          label="Fleet fuel reporting"
          value={fuelMetrics.withVolumeCount}
          sub={
            fuelMetrics.totalFleetFuelL != null
              ? `${Math.round(fuelMetrics.totalFleetFuelL).toLocaleString()} L total`
              : "No tank volume on status feed"
          }
          trend={`${fuelMetrics.movingCount} vehicles moving`}
          trendTone={fuelMetrics.movingCount > 0 ? "good" : "neutral"}
          icon={Car}
        />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">Charts and tables follow the selected report family.</p>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col gap-1 rounded-lg border border-vms-border bg-vms-inset/60 p-1">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCat(c)}
                  className={cn(
                    "rounded-md px-3 py-2.5 text-left text-sm font-medium transition-colors md:px-4 md:py-3",
                    c === cat ? "bg-nlng-amber text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </CardContent>
        </Card>

        <div className="space-y-4 md:space-y-6">
          <Card>
            <CardHeader>
              <div>
                <CardTitle>{meta.title}</CardTitle>
                <p className="mt-1 text-sm text-zinc-400">
                  {meta.description} · <span className="text-zinc-500">{cat}</span>
                </p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs md:text-sm">
                <span className="inline-flex items-center gap-2 text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> {meta.valueLabel}
                </span>
              </div>
            </CardHeader>
            <CardContent>
              {hasError ? (
                <p className="py-8 text-center text-sm text-red-400">
                  Could not load report data. Check uctracking connection and try again.
                </p>
              ) : isLoading ? (
                <p className="py-8 text-center text-sm text-zinc-500">Loading {cat.toLowerCase()} report…</p>
              ) : chartPoints.length === 0 ? (
                <p className="py-8 text-center text-sm text-zinc-500">
                  No {cat.toLowerCase()} data for this period. The fleet connection is working; there may be nothing to
                  chart yet.
                </p>
              ) : (
                <div className="h-64 w-full md:h-72">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={chartPoints.map((p) => ({ m: p.label, km: p.value }))}
                      margin={{ top: 8, right: 8, left: 0, bottom: 0 }}
                    >
                      <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                      <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: "#27272a",
                          border: "1px solid #52525b",
                          borderRadius: "8px",
                          fontSize: "14px",
                        }}
                        formatter={(value: number) => [`${value} ${meta.valueLabel}`, cat]}
                      />
                      <Bar dataKey="km" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Top vehicles (distance today · score)</CardTitle>
                <p className="mt-1 text-sm text-zinc-400">Ranked by live GPS odometer / distance fields from device status.</p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" type="button">
                  Export PDF
                </Button>
                <Button size="sm" type="button" variant="secondary">
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              {statusQ.isLoading || vehiclesQ.isLoading ? (
                <p className="py-6 text-center text-sm text-zinc-500">Loading vehicle rankings…</p>
              ) : topVehicles.length === 0 ? (
                <p className="py-6 text-center text-sm text-zinc-500">No distance reported for vehicles today.</p>
              ) : (
                <table className="w-full min-w-[520px] text-left text-sm">
                  <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                    <tr>
                      <th className="border-b border-vms-border py-3 pr-4">Device number</th>
                      <th className="border-b border-vms-border py-3 pr-4">Plate number</th>
                      <th className="border-b border-vms-border py-3 pr-4">km (today)</th>
                      <th className="border-b border-vms-border py-3">Score</th>
                    </tr>
                  </thead>
                  <tbody>
                    {topVehicles.map((r) => (
                      <tr key={r.key} className="hover:bg-vms-inset/60">
                        <td className="border-b border-vms-border py-3 pr-4">
                          <Link
                            href={`/vehicles/${encodeURIComponent(r.deviceLabel)}`}
                            className="font-semibold text-sky-400 hover:underline"
                          >
                            {r.deviceLabel}
                          </Link>
                        </td>
                        <td className="border-b border-vms-border py-3 pr-4 text-zinc-200">{r.plateNumber}</td>
                        <td className="border-b border-vms-border py-3 pr-4 tabular-nums text-zinc-200">
                          {r.km.toLocaleString()}
                        </td>
                        <td className="border-b border-vms-border py-3 font-semibold text-zinc-100">
                          {r.score ?? "—"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
