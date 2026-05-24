"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  AlertTriangle,
  ArrowRight,
  Bell,
  Bus,
  Droplets,
  Gauge,
  MapPin,
  TableProperties,
} from "lucide-react";
import { Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import type { Alarm, DashboardKpi, Vehicle } from "@/lib/uctracking/schemas";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { DataSourcePill } from "@/components/ui/data-source-pill";

const DashboardFleetMap = dynamic(
  () => import("@/components/maps/dashboard-fleet-map").then((m) => m.DashboardFleetMap),
  {
    ssr: false,
    loading: () => <div className="h-[min(52vh,560px)] min-h-[320px] animate-pulse rounded-xl bg-[#12151a]" />,
  },
);

/** Mockup primary accent */
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

function alarmPill(label: string) {
  const critical = ["Overspeed", "Fatigue", "Geofence"].some((x) => label.includes(x));
  if (critical) return <Badge variant="danger">{label}</Badge>;
  return <Badge variant="warn">{label}</Badge>;
}

const scoreBands = [
  { label: "Excellent 90–100", n: 412, pct: 67, color: "#4ade80" },
  { label: "Good 75–89", n: 588, pct: 94, color: "#38bdf8" },
  { label: "Fair 60–74", n: 187, pct: 30, color: "#fbbf24" },
  { label: "Poor < 60", n: 60, pct: 10, color: "#f87171" },
];

function fleetStatusFromVehicles(vehicles: Vehicle[]) {
  const total = vehicles.length || 1;
  const online = vehicles.filter((v) => v.status !== "offline").length;
  const idle = vehicles.filter((v) => v.status === "idle" || v.status === "parked").length;
  const offline = vehicles.filter((v) => v.status === "offline").length;
  const other = Math.max(0, total - (online + idle + offline));
  const toPct = (n: number) => Math.round((100 * n) / total);
  return [
    { name: "Online", value: toPct(online), color: "#4ade80" },
    { name: "Idle", value: toPct(idle), color: "#fbbf24" },
    { name: "Offline", value: toPct(offline), color: "#a78bfa" },
    { name: "Other", value: toPct(other), color: "#9ca3af" },
  ];
}

function fuelTankBadge(percent: number | null | undefined) {
  if (percent == null) return <Badge variant="info">Unknown</Badge>;
  if (percent < 15) return <Badge variant="danger">Critical</Badge>;
  if (percent < 30) return <Badge variant="warn">Low</Badge>;
  return <Badge variant="success">Normal</Badge>;
}

function mockFuelByHour() {
  return ["12a", "2a", "4a", "6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"].map((hour, i) => ({
    hour,
    liters: 300 + Math.round(180 * Math.sin(i / 2) + i * 15),
  }));
}

type LocationFilter = "all" | "cho" | "bonny";

function matchesLocation(v: Vehicle, filter: LocationFilter): boolean {
  if (filter === "all") return true;
  const loc = (v.locationLabel ?? "").toLowerCase();
  if (filter === "cho") return loc.includes("cho");
  return loc.includes("bonny");
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
  description,
  action,
}: {
  icon: typeof Droplets;
  title: string;
  description?: string;
  action?: ReactNode;
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
        <div>
          <h2 className="text-lg font-semibold tracking-tight text-zinc-50 md:text-xl">{title}</h2>
          {description ? <p className="mt-0.5 max-w-2xl text-sm text-zinc-500 md:text-[0.9375rem]">{description}</p> : null}
        </div>
      </div>
      {action ? <div className="flex shrink-0 flex-wrap items-center gap-2">{action}</div> : null}
    </div>
  );
}

function MetricHeroCard({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  href,
}: {
  title: string;
  value: ReactNode;
  subtitle: string;
  trend?: { text: string; positive: boolean };
  icon: typeof Droplets;
  href: string;
}) {
  const inner = (
    <>
      <Icon
        className="pointer-events-none absolute right-4 top-4 h-9 w-9 opacity-[0.88] md:right-5 md:top-5 md:h-10 md:w-10"
        style={{ color: ACCENT }}
        strokeWidth={1.75}
      />
      <p className="pr-14 text-sm font-medium text-zinc-500">{title}</p>
      <p className="mt-2 text-3xl font-bold tabular-nums tracking-tight text-zinc-50 md:text-[2rem] lg:text-4xl">{value}</p>
      <p className="mt-1 text-xs text-zinc-500 md:text-sm">{subtitle}</p>
      {trend ? (
        <p className={cn("mt-3 text-sm font-medium tabular-nums", trend.positive ? "text-emerald-400" : "text-red-400")}>
          {trend.text}
        </p>
      ) : null}
      <span
        className="mt-5 inline-flex items-center gap-1 text-sm font-semibold transition group-hover:gap-2"
        style={{ color: ACCENT }}
      >
        Click to view details
        <ArrowRight className="h-4 w-4" />
      </span>
    </>
  );

  return (
    <Link href={href} className={cn("group block", dashCardClass({ interactive: true }))}>
      <div className="relative">{inner}</div>
    </Link>
  );
}

function LocationSegment({
  value,
  onChange,
}: {
  value: LocationFilter;
  onChange: (v: LocationFilter) => void;
}) {
  const opts: { id: LocationFilter; label: string }[] = [
    { id: "all", label: "All Locations" },
    { id: "cho", label: "CHO" },
    { id: "bonny", label: "Bonny" },
  ];
  return (
    <div className="inline-flex rounded-xl border border-zinc-700/50 bg-[#12151a] p-1 shadow-inner">
      {opts.map((o) => (
        <button
          key={o.id}
          type="button"
          onClick={() => onChange(o.id)}
          className={cn(
            "rounded-lg px-4 py-2 text-sm font-medium transition md:px-5 md:text-[0.9375rem]",
            value === o.id
              ? "bg-zinc-800 text-zinc-50 shadow-md ring-1 ring-[#f58220]/45"
              : "text-zinc-500 hover:bg-zinc-800/50 hover:text-zinc-300",
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function DashboardView() {
  const [locationFilter, setLocationFilter] = useState<LocationFilter>("all");
  const fuelSeries = useMemo(() => mockFuelByHour(), []);

  const kpiQ = useQuery({
    queryKey: ["fleet-kpi"],
    queryFn: () => fetchJson<DashboardKpi>("/api/fleet/kpi"),
  });
  const vehQ = useQuery({
    queryKey: ["fleet-vehicles"],
    queryFn: () => fetchJson<{ source: string; data: Vehicle[] }>("/api/fleet/vehicles"),
  });
  const alarmQ = useQuery({
    queryKey: ["fleet-alarms"],
    queryFn: () => fetchJson<{ source: string; data: Alarm[] }>("/api/fleet/alarms"),
  });

  const kpi = kpiQ.data;
  const allVehicles = useMemo(() => {
    const list = vehQ.data?.data ?? [];
    return [...list].sort((a, b) => a.plate.localeCompare(b.plate));
  }, [vehQ.data?.data]);

  const filteredVehicles = useMemo(
    () => allVehicles.filter((v) => matchesLocation(v, locationFilter)),
    [allVehicles, locationFilter],
  );

  const activeAlarms = useMemo(() => {
    const list = alarmQ.data?.data ?? [];
    return list
      .filter((a) => a.acknowledged !== true)
      .sort((a, b) => new Date(b.raisedAt).valueOf() - new Date(a.raisedAt).valueOf());
  }, [alarmQ.data?.data]);

  const filteredPlates = useMemo(() => new Set(filteredVehicles.map((v) => v.plate)), [filteredVehicles]);
  const scopedAlarms = useMemo(
    () => activeAlarms.filter((a) => !a.plate || filteredPlates.has(a.plate)),
    [activeAlarms, filteredPlates],
  );

  const pieData = fleetStatusFromVehicles(filteredVehicles);

  const fuelCurveTotal = useMemo(() => fuelSeries.reduce((s, x) => s + x.liters, 0), [fuelSeries]);
  const displayFuelTotal = useMemo(() => {
    const scale = filteredVehicles.length / Math.max(allVehicles.length, 1);
    return Math.round(fuelCurveTotal * 42 * scale + filteredVehicles.length * 180);
  }, [fuelCurveTotal, filteredVehicles.length, allVehicles.length]);

  const onlineCount = useMemo(() => filteredVehicles.filter((v) => v.status !== "offline").length, [filteredVehicles]);

  const fleetEfficiencyKmL = useMemo(() => {
    const scored = filteredVehicles.filter((v) => v.driverScore != null);
    if (!scored.length) return "—";
    const avg = scored.reduce((s, v) => s + (v.driverScore ?? 0), 0) / scored.length;
    return (avg / 9.2 + 2.4).toFixed(1);
  }, [filteredVehicles]);

  const compactStats = useMemo(
    () => [
      { label: "km today", value: kpi?.kmToday?.toLocaleString() ?? "—", color: "text-cyan-400" },
      { label: "Online today", value: kpi?.onlineToday?.toLocaleString() ?? "—", color: "text-emerald-300" },
      { label: "Idling", value: kpi?.idling?.toLocaleString() ?? "—", color: "text-amber-300" },
      { label: "Offline", value: kpi?.offline?.toLocaleString() ?? "—", color: "text-violet-400" },
      {
        label: "Avg km / day",
        value: kpi?.avgKmPerDay != null ? Math.round(kpi.avgKmPerDay).toLocaleString() : "—",
        color: "text-sky-300",
      },
    ],
    [kpi],
  );

  return (
    <div className="space-y-8 md:space-y-10">
      <header className="space-y-5">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50 md:text-3xl">Dashboard overview</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-zinc-400 md:text-base">
            Monitor fuel consumption, live positions, tank levels, and alarms in real time. One fleet view—no split by
            vehicle category.
          </p>
        </div>
        <LocationSegment value={locationFilter} onChange={setLocationFilter} />
        {locationFilter !== "all" && filteredVehicles.length === 0 ? (
          <p className="rounded-xl border border-amber-500/25 bg-amber-500/10 px-4 py-3 text-sm text-amber-200/90">
            No vehicles match this location filter. Try &ldquo;All Locations&rdquo; or another site.
          </p>
        ) : null}
      </header>

      <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <MetricHeroCard
          title="Total fuel consumption"
          value={`${displayFuelTotal.toLocaleString()} L`}
          subtitle="Estimated fleet draw · this month"
          trend={{ text: "+12.5% vs last month", positive: false }}
          icon={Droplets}
          href="/fuel"
        />
        <MetricHeroCard
          title="Active vehicles"
          value={filteredVehicles.length ? onlineCount.toLocaleString() : "—"}
          subtitle={
            filteredVehicles.length
              ? `${filteredVehicles.length.toLocaleString()} total in view`
              : "No vehicles in view"
          }
          trend={{ text: "+2.1% vs last month", positive: true }}
          icon={Bus}
          href="/vehicles"
        />
        <MetricHeroCard
          title="Fleet efficiency"
          value={fleetEfficiencyKmL === "—" ? "—" : `${fleetEfficiencyKmL} km/L`}
          subtitle="Blended fleet average"
          trend={fleetEfficiencyKmL === "—" ? undefined : { text: "+0.8 km/L vs last month", positive: true }}
          icon={Gauge}
          href="/reports"
        />
        <MetricHeroCard
          title="Open alarms"
          value={scopedAlarms.length.toLocaleString()}
          subtitle="Requires attention if &gt; 0"
          trend={
            scopedAlarms.length === 0
              ? { text: "−3 vs last week", positive: true }
              : { text: `+${scopedAlarms.length} active`, positive: false }
          }
          icon={Bell}
          href="/safety"
        />
      </section>

      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-5 md:gap-4">
        {compactStats.map((s) => (
          <div
            key={s.label}
            className={cn(
              "rounded-xl border border-zinc-700/40 bg-[#16181d] px-4 py-4 text-center shadow-[inset_0_1px_0_0_rgba(255,255,255,0.04)]",
            )}
          >
            <div className={cn("text-2xl font-bold tabular-nums md:text-3xl", s.color)}>{s.value}</div>
            <div className="mt-1.5 text-xs font-medium text-zinc-500 md:text-sm">{s.label}</div>
          </div>
        ))}
      </section>

      <section>
        <div className={dashCardClass()}>
          <SectionHeader
            icon={Droplets}
            title="Fuel consumption"
            description="Fleet fuel use by time of day (liters). Single series—no cost overlay."
            action={<DataSourcePill source="mock" />}
          />
          <div className="rounded-xl border border-zinc-800/80 bg-[#12151a] p-3 md:p-4">
            <div className="h-56 w-full md:h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={fuelSeries} margin={{ top: 12, right: 8, left: 0, bottom: 4 }}>
                  <XAxis dataKey="hour" stroke="#52525b" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} />
                  <YAxis stroke="#52525b" tick={{ fill: "#71717a", fontSize: 11 }} axisLine={false} tickLine={false} width={36} />
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
          </div>
        </div>
      </section>

      <section>
        <div className={dashCardClass()}>
          <SectionHeader
            icon={MapPin}
            title="Live fleet map"
            description="Hover a marker for vehicle summary (same fields as the vehicle detail page)."
            action={
              <div className="flex flex-wrap gap-3 text-sm font-semibold">
                <Link href="/fleet-map" className="transition hover:opacity-90" style={{ color: ACCENT }}>
                  Full-screen map →
                </Link>
                <Link href="/geo-fencing" className="text-zinc-400 transition hover:text-zinc-200">
                  Geo fencing →
                </Link>
                <DataSourcePill source={vehQ.data?.source} />
              </div>
            }
          />
          <p className="mb-3 text-sm text-zinc-500">
            On map:{" "}
            <span className="font-semibold text-zinc-200">
              {filteredVehicles.filter((v) => v.position).length.toLocaleString()}
            </span>{" "}
            / {filteredVehicles.length.toLocaleString()} in view
          </p>
          <div className="overflow-hidden rounded-xl border border-zinc-800/80 bg-[#12151a]">
            <DashboardFleetMap vehicles={filteredVehicles} />
          </div>
        </div>
      </section>

      <section>
        <div className={dashCardClass()}>
          <SectionHeader
            icon={TableProperties}
            title="Fuel tanks status"
            description="On-board tank level for every vehicle in the filtered view."
            action={<DataSourcePill source={vehQ.data?.source} />}
          />
          <div className="overflow-hidden rounded-xl border border-zinc-800/80">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] border-collapse text-left text-sm md:text-[0.9375rem]">
                <thead>
                  <tr className="border-b border-zinc-800 bg-[#12151a] text-xs font-semibold uppercase tracking-wider text-zinc-500">
                    <th className="px-4 py-3.5">Vehicle</th>
                    <th className="px-4 py-3.5">Driver</th>
                    <th className="px-4 py-3.5">Level</th>
                    <th className="px-4 py-3.5">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVehicles.map((v) => (
                    <tr
                      key={v.id}
                      className="border-b border-zinc-800/60 transition last:border-0 hover:bg-white/[0.03]"
                    >
                      <td className="px-4 py-3.5">
                        <Link
                          href={`/vehicles/${encodeURIComponent(v.plate)}`}
                          className="font-semibold transition hover:underline"
                          style={{ color: ACCENT }}
                        >
                          {v.plate}
                        </Link>
                      </td>
                      <td className="max-w-[14rem] truncate px-4 py-3.5 text-zinc-300">{v.driverName ?? "—"}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex max-w-xs items-center gap-3">
                          <div className="h-2.5 min-w-[7rem] flex-1 overflow-hidden rounded-full bg-zinc-800">
                            <div
                              className={cn(
                                "h-full rounded-full transition-all",
                                v.fuelPercent == null
                                  ? "w-0 bg-zinc-600"
                                  : v.fuelPercent < 15
                                    ? "bg-red-500"
                                    : v.fuelPercent < 30
                                      ? "bg-amber-500"
                                      : "bg-emerald-500",
                              )}
                              style={{ width: v.fuelPercent != null ? `${v.fuelPercent}%` : "0%" }}
                            />
                          </div>
                          <span className="tabular-nums text-zinc-200">{v.fuelPercent != null ? `${v.fuelPercent}%` : "—"}</span>
                        </div>
                      </td>
                      <td className="px-4 py-3.5">{fuelTankBadge(v.fuelPercent)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-2 lg:gap-6">
        <div className={cn(dashCardClass(), "border-red-500/20 lg:min-h-[20rem]")}>
          <SectionHeader
            icon={AlertTriangle}
            title="Current active alarms"
            description="Live issues for vehicles in the current location filter."
            action={
              <span className="flex items-center gap-2 text-sm font-semibold text-red-400/95">
                {scopedAlarms.length} open
                <DataSourcePill source={alarmQ.data?.source} />
              </span>
            }
          />
          <div className="max-h-[min(26rem,52vh)] space-y-2 overflow-y-auto pr-1">
            {scopedAlarms.length === 0 ? (
              <div className="rounded-xl border border-zinc-800/80 bg-[#12151a] py-10 text-center text-sm text-zinc-500">
                No active alarms in this view.
              </div>
            ) : (
              scopedAlarms.map((a) => (
                <div
                  key={a.id}
                  className={cn(
                    "flex items-center gap-3 rounded-xl border border-zinc-800/80 bg-[#12151a] px-3 py-3 text-sm md:text-[0.9375rem]",
                    (a.severity === "critical" || a.severity === "high") && "border-l-4 border-l-red-500",
                  )}
                >
                  <span
                    className={cn(
                      "h-2.5 w-2.5 shrink-0 rounded-full",
                      a.severity === "critical" || a.severity === "high" ? "bg-red-500" : "bg-amber-500",
                    )}
                  />
                  <div className="min-w-0 flex-1">
                    <span className="font-semibold text-zinc-100">{a.plate ?? a.vehicleId}</span>
                    <span className="text-zinc-500"> — {a.message}</span>
                  </div>
                  <span className="shrink-0 tabular-nums text-xs text-zinc-500">
                    {new Date(a.raisedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                  </span>
                </div>
              ))
            )}
          </div>
          <div className="mt-4 text-center">
            <Link href="/safety" className="text-sm font-semibold transition hover:underline" style={{ color: ACCENT }}>
              Safety center →
            </Link>
          </div>
        </div>

        <div className="grid gap-4">
          <div className={dashCardClass()}>
            <SectionHeader
              icon={Gauge}
              title="Driver score distribution"
              description="Training and coaching mix (illustrative)."
              action={<DataSourcePill source="mock" />}
            />
            <div className="space-y-4 text-sm md:text-[0.9375rem]">
              {scoreBands.map((b) => (
                <div key={b.label}>
                  <div className="flex justify-between text-zinc-500">
                    <span>{b.label}</span>
                    <span className="font-semibold text-zinc-100">{b.n}</span>
                  </div>
                  <div className="mt-2 h-2 overflow-hidden rounded-full bg-zinc-800">
                    <div className="h-full rounded-full" style={{ width: `${b.pct}%`, background: b.color }} />
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className={dashCardClass()}>
            <SectionHeader icon={Bus} title="Fleet status" description="Share of time in each state for the filtered fleet." />
            <div className="flex items-center gap-6 md:gap-8">
              <div className="h-32 w-32 shrink-0 md:h-36 md:w-36">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie data={pieData} dataKey="value" innerRadius="36%" outerRadius="52%" paddingAngle={2} stroke="none">
                      {pieData.map((e, i) => (
                        <Cell key={i} fill={e.color} />
                      ))}
                    </Pie>
                    <Tooltip {...chartTooltip} />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-2.5 text-sm md:text-[0.9375rem]">
                <div>
                  <span className="text-emerald-400">●</span> <span className="text-zinc-400">Online</span>{" "}
                  <span className="font-semibold text-zinc-100">{pieData[0]?.value ?? 0}%</span>
                </div>
                <div>
                  <span className="text-amber-400">●</span> <span className="text-zinc-400">Idle</span>{" "}
                  <span className="font-semibold text-zinc-100">{pieData[1]?.value ?? 0}%</span>
                </div>
                <div>
                  <span className="text-violet-400">●</span> <span className="text-zinc-400">Offline</span>{" "}
                  <span className="font-semibold text-zinc-100">{pieData[2]?.value ?? 0}%</span>
                </div>
                <div>
                  <span className="text-zinc-500">●</span> <span className="text-zinc-400">Other</span>{" "}
                  <span className="font-semibold text-zinc-100">{pieData[3]?.value ?? 0}%</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className={dashCardClass()}>
          <SectionHeader
            icon={Bus}
            title="All vehicles"
            description={`${filteredVehicles.length.toLocaleString()} vehicle${filteredVehicles.length === 1 ? "" : "s"} in view — click a row for detail.`}
          />
          <div className="max-h-[min(36rem,62vh)] overflow-auto rounded-xl border border-zinc-800/80">
            <div className="min-w-[720px]">
              <div className="sticky top-0 z-10 grid grid-cols-[minmax(5rem,6rem)_minmax(5.5rem,7rem)_minmax(0,1fr)_minmax(5.5rem,7rem)_minmax(4.5rem,5.5rem)_minmax(4rem,5rem)_minmax(4rem,5rem)_minmax(5.5rem,7rem)] gap-2 border-b border-zinc-800 bg-[#12151a] px-4 py-3 text-xs font-semibold uppercase tracking-wider text-zinc-500">
                <span>Plate</span>
                <span>Driver</span>
                <span>Location</span>
                <span>Status</span>
                <span>Speed</span>
                <span>Fuel</span>
                <span>Score</span>
                <span>Alarm</span>
              </div>
              <div>
                {filteredVehicles.map((v) => (
                  <Link
                    key={v.id}
                    href={`/vehicles/${encodeURIComponent(v.plate)}`}
                    className="grid grid-cols-[minmax(5rem,6rem)_minmax(5.5rem,7rem)_minmax(0,1fr)_minmax(5.5rem,7rem)_minmax(4.5rem,5.5rem)_minmax(4rem,5rem)_minmax(4rem,5rem)_minmax(5.5rem,7rem)] items-center gap-2 border-b border-zinc-800/50 px-4 py-3 text-sm transition last:border-0 hover:bg-white/[0.04] md:text-[0.9375rem]"
                  >
                    <span className="font-semibold text-zinc-100">{v.plate}</span>
                    <span className="truncate text-zinc-300">{v.driverName ?? "—"}</span>
                    <span className="truncate text-zinc-500">{v.locationLabel ?? "—"}</span>
                    <span className="min-w-0">{pillForStatus(v.status)}</span>
                    <span className={v.speedKmh && v.speedKmh > 90 ? "font-semibold text-red-400" : "text-zinc-200"}>
                      {v.speedKmh != null ? `${v.speedKmh} km/h` : "—"}
                    </span>
                    <span
                      className={v.fuelPercent != null && v.fuelPercent < 30 ? "font-medium text-red-400" : "text-zinc-200"}
                    >
                      {v.fuelPercent != null ? `${v.fuelPercent}%` : "—"}
                    </span>
                    <span className="font-semibold text-zinc-100">{v.driverScore ?? "—"}</span>
                    <span className="min-w-0">
                      {v.alarmSummary ? alarmPill(v.alarmSummary) : <Badge variant="info">—</Badge>}
                    </span>
                  </Link>
                ))}
              </div>
            </div>
          </div>
          <div className="mt-4 text-center">
            <Link href="/vehicles" className="text-sm font-semibold transition hover:underline" style={{ color: ACCENT }}>
              Vehicles workspace →
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
