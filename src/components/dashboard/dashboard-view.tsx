"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Bell, Bus, Droplets, Gauge, LayoutDashboard, MapPin, Route, TableProperties } from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Alarm, DashboardKpi, Vehicle } from "@/lib/uctracking/schemas";
import { fuelPerVehicleMetrics, type FuelPerVehicleRow } from "@/lib/uctracking/normalize-fleet-fuel-snapshot";
import {
  formatLatLng,
  type DashboardVehicleTableRow,
} from "@/lib/dashboard/vehicle-table-rows";
import { Badge } from "@/components/ui/badge";
import { VmsPageHero } from "@/components/vms/vms-page-blocks";
import { cn } from "@/lib/utils";

const DashboardFleetMap = dynamic(
  () => import("@/components/maps/dashboard-fleet-map").then((m) => m.DashboardFleetMap),
  {
    ssr: false,
    loading: () => <div className="h-[min(52vh,560px)] min-h-[320px] animate-pulse rounded-xl bg-[#12151a]" />,
  },
);

const ACCENT = "#f58220";

const chartTooltip = {
  contentStyle: {
    backgroundColor: "#1a1d24",
    border: "1px solid #3f3f46",
    borderRadius: "10px",
    fontSize: "13px",
  },
  labelStyle: { color: "#fafafa" },
};

type KpiResponse = DashboardKpi & { source?: string };

async function fetchJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(url);
  return res.json();
}

function pillForStatus(status: string) {
  if (status === "moving" || status === "active") return <Badge variant="success">Online</Badge>;
  if (status === "parked" || status === "idle") return <Badge variant="warn">Parked</Badge>;
  if (status === "offline") return <Badge variant="purple">Offline</Badge>;
  if (status === "breach") return <Badge variant="danger">Breach</Badge>;
  return <Badge variant="info">{status}</Badge>;
}

function alarmPill(message: string, severity?: string | null) {
  if (severity === "critical" || severity === "high") return <Badge variant="danger">{message}</Badge>;
  if (severity === "medium") return <Badge variant="warn">{message}</Badge>;
  const critical = ["Overspeed", "Fatigue", "Geofence"].some((x) => message.includes(x));
  if (critical) return <Badge variant="danger">{message}</Badge>;
  return <Badge variant="warn">{message}</Badge>;
}

type FleetStatusSegment = { name: string; value: number; count: number; color: string };

function fleetStatusFromVehicles(vehicles: Vehicle[]): FleetStatusSegment[] {
  const total = vehicles.length;
  if (total === 0) {
    return [
      { name: "Online", value: 0, count: 0, color: "#4ade80" },
      { name: "Idle", value: 0, count: 0, color: "#fbbf24" },
      { name: "Offline", value: 0, count: 0, color: "#a78bfa" },
    ];
  }
  const offline = vehicles.filter((v) => v.status === "offline").length;
  const idle = vehicles.filter((v) => v.status === "idle" || v.status === "parked").length;
  const online = vehicles.filter(
    (v) => v.status !== "offline" && v.status !== "idle" && v.status !== "parked",
  ).length;
  const toPct = (n: number) => Math.round((100 * n) / total);
  return [
    { name: "Online", value: toPct(online), count: online, color: "#4ade80" },
    { name: "Idle", value: toPct(idle), count: idle, color: "#fbbf24" },
    { name: "Offline", value: toPct(offline), count: offline, color: "#a78bfa" },
  ];
}

function dashCardClass({ interactive }: { interactive?: boolean } = {}) {
  return cn(
    "rounded-2xl border border-zinc-700/45 bg-gradient-to-br from-[#1a1d24] to-[#15171c] p-5 shadow-[0_12px_40px_-12px_rgba(0,0,0,0.55)] md:p-6",
    interactive && "transition hover:border-[#f58220]/35 hover:shadow-[0_16px_48px_-12px_rgba(0,0,0,0.65)]",
  );
}

function SectionHeader({
  icon: Icon,
  title,
  action,
}: {
  icon: typeof Droplets;
  title: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div className="flex items-start gap-3">
        <div
          className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl border border-zinc-700/60 bg-[#12151a]"
          style={{ boxShadow: `inset 0 1px 0 0 ${ACCENT}22` }}
        >
          <Icon className="h-5 w-5" style={{ color: ACCENT }} strokeWidth={2} />
        </div>
        <h2 className="text-base font-semibold tracking-tight text-zinc-100">{title}</h2>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

function MetricHeroCard({
  title,
  value,
  subtitle,
  icon: Icon,
  href,
}: {
  title: string;
  value: React.ReactNode;
  subtitle: string;
  icon: typeof Droplets;
  href: string;
}) {
  return (
    <Link href={href} className={cn("group block", dashCardClass({ interactive: true }))}>
      <div className="relative">
        <Icon
          className="pointer-events-none absolute right-4 top-4 h-9 w-9 opacity-[0.88] md:right-5 md:top-5 md:h-10 md:w-10"
          style={{ color: ACCENT }}
          strokeWidth={1.75}
        />
        <p className="pr-14 text-sm font-medium text-zinc-500">{title}</p>
        <p className="vms-stat-value mt-2">{value}</p>
        <p className="vms-stat-meta mt-1">{subtitle}</p>
        <span
          className="mt-5 inline-flex items-center gap-1 text-sm font-semibold transition group-hover:gap-2"
          style={{ color: ACCENT }}
        >
          Click to view details
          <ArrowRight className="h-4 w-4" />
        </span>
      </div>
    </Link>
  );
}

function formatFuelLiters(l: number | null): string {
  if (l == null || !Number.isFinite(l)) return "—";
  return `${l.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`;
}

export function DashboardView() {
  const kpiQ = useQuery({
    queryKey: ["fleet-kpi"],
    queryFn: () => fetchJson<KpiResponse>("/api/fleet/kpi"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const vehQ = useQuery({
    queryKey: ["fleet-vehicles"],
    queryFn: () => fetchJson<{ source: string; data: Vehicle[] }>("/api/fleet/vehicles"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const alarmQ = useQuery({
    queryKey: ["fleet-alarms"],
    queryFn: () => fetchJson<{ source: string; data: Alarm[] }>("/api/fleet/alarms"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const fuelPerVehicleQ = useQuery({
    queryKey: ["fuel-per-vehicle"],
    queryFn: () => fetchJson<{ source: string; vehicles: FuelPerVehicleRow[] }>("/api/fleet/fuel/per-vehicle"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const vehicleTableQ = useQuery({
    queryKey: ["dashboard-vehicle-table"],
    queryFn: () => fetchJson<{ source: string; rows: DashboardVehicleTableRow[] }>("/api/fleet/dashboard/vehicles"),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const fuelHourlyQ = useQuery({
    queryKey: ["dashboard-fuel-hourly"],
    queryFn: () => fetchJson<{ source: string; data: { hour: string; liters: number }[] }>("/api/fleet/dashboard/fuel-hourly"),
    staleTime: 60_000,
    refetchInterval: 120_000,
  });

  const kpi = kpiQ.data;
  const allVehicles = useMemo(() => {
    const list = vehQ.data?.data ?? [];
    return [...list].sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehQ.data?.data]);

  const tableRows = useMemo(() => {
    const list = vehicleTableQ.data?.rows ?? [];
    return [...list].sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehicleTableQ.data?.rows]);

  const fuelMetrics = useMemo(
    () => fuelPerVehicleMetrics(fuelPerVehicleQ.data?.vehicles ?? []),
    [fuelPerVehicleQ.data?.vehicles],
  );

  const openAlarms = useMemo(() => {
    const list = alarmQ.data?.data ?? [];
    return list.filter((a) => a.acknowledged !== true);
  }, [alarmQ.data?.data]);

  const pieData = fleetStatusFromVehicles(allVehicles);
  const pieSlices = useMemo(() => pieData.filter((s) => s.value > 0), [pieData]);
  const fuelSeries = fuelHourlyQ.data?.data ?? [];
  const onlineCount = useMemo(() => allVehicles.filter((v) => v.status !== "offline").length, [allVehicles]);

  const totalFuelLiters = fuelMetrics.totalFleetFuelL;
  const fuelChartTotal = useMemo(() => fuelSeries.reduce((s, x) => s + x.liters, 0), [fuelSeries]);

  return (
    <div className="space-y-8 md:space-y-10">
      <VmsPageHero
        icon={LayoutDashboard}
        title="Dashboard"
        description="Fleet-wide view of live map, vehicles, fuel levels, distance today, and status."
      />

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricHeroCard
          title="Total fleet fuel on board"
          value={totalFuelLiters != null ? formatFuelLiters(totalFuelLiters) : "—"}
          subtitle={
            fuelMetrics.withVolumeCount > 0
              ? `Sum of current tank levels · ${fuelMetrics.withVolumeCount} vehicles reporting`
              : "No live tank volume readings yet"
          }
          icon={Droplets}
          href="/fuel"
        />
        <MetricHeroCard
          title="Active vehicles"
          value={allVehicles.length ? onlineCount.toLocaleString() : "—"}
          subtitle={
            allVehicles.length
              ? `${allVehicles.length.toLocaleString()} total in fleet`
              : "No vehicles loaded"
          }
          icon={Bus}
          href="/vehicles"
        />
        <MetricHeroCard
          title="Distance today"
          value={kpi?.kmToday != null ? `${kpi.kmToday.toLocaleString()} km` : "—"}
          subtitle="Total distance covered today"
          icon={Route}
          href="/reports"
        />
        <MetricHeroCard
          title="Open alarms"
          value={openAlarms.length.toLocaleString()}
          subtitle={openAlarms.length === 0 ? "No active alarms" : "Requires attention"}
          icon={Bell}
          href="/safety"
        />
      </section>

      <section>
        <div className={dashCardClass()}>
          <SectionHeader
            icon={MapPin}
            title="Live fleet map"
            action={
              <Link href="/fleet-map" className="text-sm font-semibold transition hover:opacity-90" style={{ color: ACCENT }}>
                Open full-screen map →
              </Link>
            }
          />
          <p className="mb-3 text-sm text-zinc-500">
            On map:{" "}
            <span className="font-semibold text-zinc-200">
              {allVehicles.filter((v) => v.position).length.toLocaleString()}
            </span>{" "}
            / {allVehicles.length.toLocaleString()} in fleet
          </p>
          <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-[#12151a]">
            <DashboardFleetMap vehicles={allVehicles} />
          </div>
        </div>
      </section>

      <section>
        <div className={dashCardClass()}>
          <SectionHeader
            icon={TableProperties}
            title="All vehicles"
            action={
              <Link href="/vehicles" className="text-sm font-semibold transition hover:opacity-90" style={{ color: ACCENT }}>
                Vehicles workspace →
              </Link>
            }
          />
          <div className="max-h-[min(36rem,62vh)] overflow-auto rounded-xl border border-zinc-800/80">
            {vehicleTableQ.isLoading ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">Loading fleet table…</p>
            ) : tableRows.length === 0 ? (
              <p className="px-4 py-8 text-center text-sm text-zinc-500">No vehicles in the fleet list.</p>
            ) : (
              <table className="w-full table-fixed text-left text-sm">
                <colgroup>
                  <col style={{ width: "16%" }} />
                  <col style={{ width: "12%" }} />
                  <col style={{ width: "20%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "11%" }} />
                  <col style={{ width: "10%" }} />
                  <col style={{ width: "20%" }} />
                </colgroup>
                <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                  <tr>
                    <th className="sticky top-0 z-10 border-b border-zinc-800 bg-[#12151a] px-4 py-3 text-left">
                      Device number
                    </th>
                    <th className="sticky top-0 z-10 border-b border-zinc-800 bg-[#12151a] px-4 py-3 text-left">Driver</th>
                    <th className="sticky top-0 z-10 border-b border-zinc-800 bg-[#12151a] px-4 py-3 text-left">Lat, Lng</th>
                    <th className="sticky top-0 z-10 border-b border-zinc-800 bg-[#12151a] px-4 py-3 text-left">Status</th>
                    <th className="sticky top-0 z-10 border-b border-zinc-800 bg-[#12151a] px-4 py-3 text-left">Speed</th>
                    <th className="sticky top-0 z-10 border-b border-zinc-800 bg-[#12151a] px-4 py-3 text-left">Fuel</th>
                    <th className="sticky top-0 z-10 border-b border-zinc-800 bg-[#12151a] px-4 py-3 text-left">Alarm</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row) => (
                    <tr key={row.vehicleId} className="hover:bg-white/[0.04]">
                      <td className="border-b border-zinc-800/50 px-4 py-3">
                        <Link
                          href={`/vehicles/${encodeURIComponent(row.plate)}`}
                          className="font-semibold text-sky-400 hover:underline"
                        >
                          {row.devIdno ?? row.plate}
                        </Link>
                      </td>
                      <td className="border-b border-zinc-800/50 px-4 py-3 text-zinc-200">{row.driverName ?? "—"}</td>
                      <td className="border-b border-zinc-800/50 px-4 py-3 tabular-nums text-zinc-200">
                        {formatLatLng(row.lat, row.lng)}
                      </td>
                      <td className="border-b border-zinc-800/50 px-4 py-3">{pillForStatus(row.status)}</td>
                      <td
                        className={cn(
                          "border-b border-zinc-800/50 px-4 py-3 tabular-nums",
                          row.speedKmh != null && row.speedKmh > 90 ? "font-semibold text-red-400" : "text-zinc-200",
                        )}
                      >
                        {row.speedKmh != null ? `${Math.round(row.speedKmh)} km/h` : "—"}
                      </td>
                      <td className="border-b border-zinc-800/50 px-4 py-3 tabular-nums text-zinc-200">
                        {row.fuelVolumeL != null ? formatFuelLiters(row.fuelVolumeL) : "—"}
                      </td>
                      <td className="border-b border-zinc-800/50 px-4 py-3">
                        {row.alarmMessage ? (
                          <span className="line-clamp-2">{alarmPill(row.alarmMessage, row.alarmSeverity)}</span>
                        ) : (
                          <Badge variant="info">—</Badge>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className={dashCardClass()}>
          <SectionHeader icon={Droplets} title="Fuel consumption" />
          <div className="rounded-xl border border-zinc-800/80 bg-[#12151a] p-3 md:p-4">
            {fuelHourlyQ.isLoading ? (
              <p className="py-16 text-center text-sm text-zinc-500">Loading fuel consumption…</p>
            ) : (
              <>
                <p className="mb-2 text-xs text-zinc-500">
                  Today&apos;s fleet fuel use by time of day
                  {fuelChartTotal > 0 ? ` · ${formatFuelLiters(fuelChartTotal)} total in chart` : ""}
                </p>
                <div className="h-56 w-full md:h-64">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={fuelSeries} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
                      <XAxis
                        dataKey="hour"
                        stroke="#52525b"
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        stroke="#52525b"
                        tick={{ fill: "#71717a", fontSize: 11 }}
                        axisLine={false}
                        tickLine={false}
                        width={36}
                      />
                      <Tooltip {...chartTooltip} formatter={(v: number) => [`${v.toLocaleString()} L`, "Consumption"]} />
                      <Line
                        type="monotone"
                        dataKey="liters"
                        name="Consumption (L)"
                        stroke={ACCENT}
                        strokeWidth={2.5}
                        dot={false}
                        activeDot={{ r: 5, fill: ACCENT, stroke: "#1a1d24", strokeWidth: 2 }}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            )}
          </div>
        </div>

        <div className={dashCardClass()}>
          <SectionHeader icon={Gauge} title="Fleet status" />
          <div className="flex min-h-[14rem] flex-col items-center justify-center gap-8 sm:flex-row sm:gap-10 md:min-h-[16rem]">
            <div className="relative mx-auto h-48 w-48 shrink-0 sm:mx-0 sm:h-52 sm:w-52">
              {pieSlices.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieSlices}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      innerRadius="58%"
                      outerRadius="88%"
                      paddingAngle={pieSlices.length > 1 ? 3 : 0}
                      stroke="none"
                    >
                      {pieSlices.map((e) => (
                        <Cell key={e.name} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      {...chartTooltip}
                      formatter={(value: number, _name: string, item: { payload?: FleetStatusSegment }) => [
                        `${value}% (${item.payload?.count ?? 0} vehicles)`,
                        item.payload?.name ?? "Status",
                      ]}
                    />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex h-full items-center justify-center rounded-full border border-zinc-800 bg-[#12151a] text-sm text-zinc-500">
                  No fleet data
                </div>
              )}
            </div>
            <div className="flex w-full max-w-[12rem] flex-col justify-center gap-3 text-sm md:text-[0.9375rem]">
              {pieData.map((segment) => (
                <div key={segment.name} className="flex items-center justify-between gap-4">
                  <span className="flex items-center gap-2 text-zinc-400">
                    <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: segment.color }} />
                    {segment.name}
                  </span>
                  <span className="font-semibold tabular-nums text-zinc-100">
                    {segment.value}%{" "}
                    <span className="text-xs font-normal text-zinc-500">({segment.count})</span>
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
