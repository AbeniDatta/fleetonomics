"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { Fuel, Gauge, Navigation, Truck } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { VmsBackBar, VmsPageHero, VmsStatCard } from "@/components/vms/vms-page-blocks";
import { cn } from "@/lib/utils";
import { extractTotalFromRaw, fuelReportTableFromRaw, fuelVelocitySeriesFromRaw } from "@/lib/uctracking/normalize-fuel-report";
import {
  fuelPerVehicleMetrics,
  type FuelPerVehicleRow,
} from "@/lib/uctracking/normalize-fleet-fuel-snapshot";
import { formatPlateNumberCell } from "@/lib/vehicle-plates/keys";

type ReportTab =
  | "summary"
  | "quantity"
  | "volume"
  | "consumption"
  | "daily"
  | "track";

/** Report mode codes forwarded as `byOil` to StandardApiAction_getOilTrackDetail (vendor-specific). */
const TAB_BY_OIL: Record<Exclude<ReportTab, "daily">, number | undefined> = {
  /** Omit to use vendor default for the summary report. */
  summary: undefined,
  quantity: 1,
  volume: 2,
  consumption: 3,
  track: 4,
};

const TABS: { id: ReportTab; label: string }[] = [
  { id: "summary", label: "Summary table of oil" },
  { id: "quantity", label: "Oil quantity details" },
  { id: "volume", label: "Oil volume changes" },
  { id: "consumption", label: "Fuel consumption" },
  { id: "daily", label: "Daily / monthly (mileage)" },
  { id: "track", label: "Oil track detailed" },
];

function pad2(n: number) {
  return String(n).padStart(2, "0");
}

function toDatetimeLocalValue(d: Date): string {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}T${pad2(d.getHours())}:${pad2(d.getMinutes())}`;
}

function toVendorDateTime(local: string): string {
  const s = local.trim().replace("T", " ");
  if (s.length === 16) return `${s}:00`;
  return s.slice(0, 19);
}

async function fetchFuelPerVehicle(): Promise<{ source: string; vehicles: FuelPerVehicleRow[] }> {
  const res = await fetch("/api/fleet/fuel/per-vehicle");
  if (!res.ok) throw new Error("fuel-per-vehicle");
  return res.json();
}

async function fetchVehiclesForSelect(): Promise<{ source: string; data: { plate: string; driverName?: string | null }[] }> {
  const res = await fetch("/api/fleet/vehicles");
  if (!res.ok) throw new Error("vehicles");
  const body = await res.json();
  return body;
}

function formatFuelLiters(l: number | null): string {
  if (l == null || !Number.isFinite(l)) return "—";
  return `${l.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`;
}

function formatSpeed(kmh: number | null): string {
  if (kmh == null || !Number.isFinite(kmh)) return "—";
  return `${Math.round(kmh)} km/h`;
}

function buildOilReportUrl(opts: {
  tab: ReportTab;
  vehicleNo: string;
  begin: string;
  end: string;
  page: number;
  pageSize: number;
  byOilOverride: string;
  spacing: string;
  changeFuel: string;
  speedThreshold: string;
  reportType: string;
  oilType: string;
}): string {
  const params = new URLSearchParams();
  if (opts.vehicleNo && opts.vehicleNo !== "__all__") params.set("vehicleNo", opts.vehicleNo);
  params.set("beginTime", toVendorDateTime(opts.begin));
  params.set("endTime", toVendorDateTime(opts.end));
  params.set("currentPage", String(opts.page));
  params.set("pageRecords", String(opts.pageSize));

  if (opts.tab === "daily") {
    if (opts.reportType.trim()) params.set("reportType", opts.reportType.trim());
    const u = `/api/fleet/reports/mileage?${params.toString()}`;
    return u;
  }

  const byOil =
    opts.byOilOverride.trim() !== ""
      ? Number(opts.byOilOverride)
      : TAB_BY_OIL[opts.tab as Exclude<ReportTab, "daily">];
  if (byOil !== undefined && Number.isFinite(byOil)) params.set("byOil", String(byOil));

  // Only forward vendor extras for report types that use them (avoids breaking summary / track).
  if (opts.tab === "quantity" && opts.spacing.trim()) params.set("spacing", opts.spacing.trim());
  if (opts.tab === "consumption") {
    if (opts.spacing.trim()) params.set("spacing", opts.spacing.trim());
    if (opts.changeFuel.trim()) params.set("changeFuel", opts.changeFuel.trim());
    if (opts.speedThreshold.trim()) params.set("speedThreshold", opts.speedThreshold.trim());
  }
  if (opts.tab === "volume" && opts.oilType.trim()) params.set("oilType", opts.oilType.trim());

  return `/api/fleet/reports/mileage-details?${params.toString()}`;
}

export default function FuelPage() {
  const end0 = new Date();
  const begin0 = new Date(end0.getTime() - 24 * 60 * 60 * 1000);

  const [tab, setTab] = useState<ReportTab>("summary");
  const [vehicleNo, setVehicleNo] = useState<string>("__all__");
  const [begin, setBegin] = useState(toDatetimeLocalValue(begin0));
  const [end, setEnd] = useState(toDatetimeLocalValue(end0));
  const [pageSize] = useState(15);
  const [byOilOverride, setByOilOverride] = useState("");
  const [spacing, setSpacing] = useState("0");
  const [changeFuel, setChangeFuel] = useState("20");
  const [speedThreshold, setSpeedThreshold] = useState("");
  const [reportType, setReportType] = useState("1");
  const [oilType, setOilType] = useState("");

  const [queryKey, setQueryKey] = useState(() => ({
    tab: "summary" as ReportTab,
    vehicleNo: "__all__",
    begin: toDatetimeLocalValue(begin0),
    end: toDatetimeLocalValue(end0),
    page: 1,
    pageSize: 15,
    byOilOverride: "",
    spacing: "0",
    changeFuel: "20",
    speedThreshold: "",
    reportType: "1",
    oilType: "",
  }));

  /**
   * TanStack Query hashes `queryKey` by value. If the user clicks Query without changing
   * filters, the key is unchanged and the query stays "fresh" (staleTime) — no network call.
   * Bumping this nonce on every explicit Query forces a refetch.
   */
  const [refetchNonce, setRefetchNonce] = useState(0);

  const fuelPerVehicleQ = useQuery({
    queryKey: ["fuel-per-vehicle"],
    queryFn: fetchFuelPerVehicle,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const vehiclesSelectQ = useQuery({
    queryKey: ["fuel-vehicles-select"],
    queryFn: fetchVehiclesForSelect,
    staleTime: 60_000,
  });

  const reportQ = useQuery({
    queryKey: ["fuel-report", queryKey, refetchNonce],
    queryFn: async () => {
      const url = buildOilReportUrl({
        tab: queryKey.tab,
        vehicleNo: queryKey.vehicleNo,
        begin: queryKey.begin,
        end: queryKey.end,
        page: queryKey.page,
        pageSize: queryKey.pageSize,
        byOilOverride: queryKey.byOilOverride,
        spacing: queryKey.spacing,
        changeFuel: queryKey.changeFuel,
        speedThreshold: queryKey.speedThreshold,
        reportType: queryKey.reportType,
        oilType: queryKey.oilType,
      });
      const ac = new AbortController();
      const t = window.setTimeout(() => ac.abort(), 75_000);
      try {
        const res = await fetch(url, { signal: ac.signal });
        if (!res.ok) throw new Error("fuel-report");
        return (await res.json()) as { source: string; data: unknown };
      } finally {
        window.clearTimeout(t);
      }
    },
    staleTime: 0,
  });

  const table = useMemo(() => fuelReportTableFromRaw(reportQ.data?.data ?? null), [reportQ.data?.data]);
  const chartSeries = useMemo(() => fuelVelocitySeriesFromRaw(reportQ.data?.data ?? null), [reportQ.data?.data]);
  const totalHint = useMemo(() => extractTotalFromRaw(reportQ.data?.data ?? null), [reportQ.data?.data]);

  const fuelRows = fuelPerVehicleQ.data?.vehicles ?? [];
  const fuelMetrics = useMemo(() => fuelPerVehicleMetrics(fuelRows), [fuelRows]);

  const showChart = (tab === "quantity" || tab === "consumption") && chartSeries.length >= 1;

  const commitQuery = (pageNum: number, nextTab?: ReportTab) => {
    setQueryKey({
      tab: nextTab ?? tab,
      vehicleNo,
      begin,
      end,
      page: pageNum,
      pageSize,
      byOilOverride,
      spacing,
      changeFuel,
      speedThreshold,
      reportType,
      oilType,
    });
  };

  const onQuery = () => {
    commitQuery(1);
    setRefetchNonce((n) => n + 1);
  };

  const applyPage = (p: number) => {
    setQueryKey((k) => ({ ...k, page: p }));
  };

  const selectTab = (id: ReportTab) => {
    setTab(id);
    commitQuery(1, id);
    setRefetchNonce((n) => n + 1);
  };

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar />

      <VmsPageHero
        icon={Fuel}
        title="Fuel"
        description="Live tank volume by vehicle and fuel or mileage reports for any date range."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="Fleet vehicles"
          value={fuelMetrics.total}
          sub="On your account"
          icon={Truck}
        />
        <VmsStatCard
          label="Avg fuel volume"
          value={fuelMetrics.avgVolumeL != null ? formatFuelLiters(fuelMetrics.avgVolumeL) : "—"}
          sub={`${fuelMetrics.withVolumeCount} vehicles reporting volume (L)`}
          subTone={fuelMetrics.withVolumeCount > 0 ? "good" : "neutral"}
          icon={Gauge}
        />
        <VmsStatCard
          label="Live fuel reporting"
          value={fuelMetrics.withVolumeCount}
          sub={`${fuelMetrics.withVolumeCount} of ${fuelMetrics.total} vehicles with live fuel data`}
          subTone={fuelMetrics.withVolumeCount > 0 ? "good" : "neutral"}
          icon={Fuel}
        />
        <VmsStatCard
          label="Total fleet fuel"
          value={
            fuelMetrics.totalFleetFuelL != null ? formatFuelLiters(fuelMetrics.totalFleetFuelL) : "—"
          }
          sub={`${fuelMetrics.withVolumeCount} vehicles with tank volume`}
          subTone={fuelMetrics.withVolumeCount > 0 ? "good" : "neutral"}
          trend={`${fuelMetrics.movingCount} vehicles moving now`}
          trendTone={fuelMetrics.movingCount > 0 ? "good" : "neutral"}
          icon={Navigation}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fuel per vehicle</CardTitle>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {fuelPerVehicleQ.isError ? (
            <p className="text-sm text-red-400">Could not load live fuel data.</p>
          ) : fuelPerVehicleQ.isLoading ? (
            <p className="text-sm text-zinc-500">Loading fuel and speed from device status…</p>
          ) : fuelRows.length === 0 ? (
            <p className="text-sm text-zinc-500">No vehicles in the fleet list.</p>
          ) : (
            <table className="w-full min-w-[520px] text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                <tr>
                  <th className="border-b border-vms-border py-3 pr-4">Device number</th>
                  <th className="border-b border-vms-border py-3 pr-4">Plate number</th>
                  <th className="border-b border-vms-border py-3 pr-4">Fuel volume</th>
                  <th className="border-b border-vms-border py-3">Current speed</th>
                </tr>
              </thead>
              <tbody>
                {fuelRows.map((r) => (
                  <tr key={r.vehicleId} className="hover:bg-vms-inset/60">
                    <td className="border-b border-vms-border py-3 pr-4">
                      <Link
                        href={`/vehicles/${encodeURIComponent(r.plate)}`}
                        className="font-semibold text-sky-400 hover:underline"
                      >
                        {r.devIdno}
                      </Link>
                    </td>
                    <td className="border-b border-vms-border py-3 pr-4 text-zinc-200">
                      {formatPlateNumberCell(r.plateNumber)}
                    </td>
                    <td className="border-b border-vms-border py-3 pr-4 tabular-nums text-zinc-200">
                      {formatFuelLiters(r.fuelVolumeL)}
                    </td>
                    <td className="border-b border-vms-border py-3 tabular-nums text-zinc-200">
                      {formatSpeed(r.speedKmh)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Report type</CardTitle>
            <p className="vms-page-lead mt-1">Vendor tabs map to uctracking oil/mileage endpoints.</p>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-1 rounded-lg border border-vms-border bg-vms-inset/60 p-1">
            {TABS.map((t) => (
              <button
                key={t.id}
                type="button"
                onClick={() => selectTab(t.id)}
                className={cn(
                  "rounded-md px-3 py-1.5 text-left text-sm font-medium transition-colors md:px-4 md:py-2",
                  tab === t.id ? "bg-nlng-amber text-white shadow-sm" : "text-zinc-400 hover:text-zinc-200",
                )}
              >
                {t.label}
              </button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div>
            <CardTitle>Query</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">
              Narrow the window and vehicle scope. Use <strong className="text-zinc-300">byOil override</strong> if your tenant
              uses different report codes.
            </p>
          </div>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Starting time
            <Input type="datetime-local" value={begin} onChange={(e) => setBegin(e.target.value)} className="text-zinc-100" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            End time
            <Input type="datetime-local" value={end} onChange={(e) => setEnd(e.target.value)} className="text-zinc-100" />
          </label>
          <label className="flex flex-col gap-1 text-xs text-zinc-400">
            Vehicle
            <select
              className="h-10 rounded-md border border-vms-border bg-vms-inset px-3 text-sm text-zinc-100"
              value={vehicleNo}
              onChange={(e) => setVehicleNo(e.target.value)}
            >
              <option value="__all__">All vehicles</option>
              {(vehiclesSelectQ.data?.data ?? []).map((v, i) => (
                <option key={`${v.plate}-${i}`} value={v.plate}>
                  {v.plate}
                  {v.driverName ? ` — ${v.driverName}` : ""}
                </option>
              ))}
            </select>
          </label>
          {tab !== "daily" ? (
            <label className="flex flex-col gap-1 text-xs text-zinc-400">
              byOil override (optional)
              <Input
                placeholder={TAB_BY_OIL[tab] != null ? `default: ${TAB_BY_OIL[tab]}` : "vendor default"}
                value={byOilOverride}
                onChange={(e) => setByOilOverride(e.target.value)}
                className="text-zinc-100"
              />
            </label>
          ) : (
            <div />
          )}

          {tab !== "daily" ? (
            <>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Spacing (km)
                <Input value={spacing} onChange={(e) => setSpacing(e.target.value)} className="text-zinc-100" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Change ≥ (L, refuel hint)
                <Input value={changeFuel} onChange={(e) => setChangeFuel(e.target.value)} className="text-zinc-100" />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Speed threshold (optional)
                <Input
                  placeholder="Ignore oil jitter above speed"
                  value={speedThreshold}
                  onChange={(e) => setSpeedThreshold(e.target.value)}
                  className="text-zinc-100"
                />
              </label>
              <label className="flex flex-col gap-1 text-xs text-zinc-400">
                Type filter (vendor)
                <Input
                  placeholder="oilType / type — optional"
                  value={oilType}
                  onChange={(e) => setOilType(e.target.value)}
                  className="text-zinc-100"
                />
              </label>
            </>
          ) : (
            <label className="flex flex-col gap-1 text-xs text-zinc-400 md:col-span-2">
              Report type (vendor code, e.g. daily vs monthly)
              <Input value={reportType} onChange={(e) => setReportType(e.target.value)} className="text-zinc-100" />
            </label>
          )}

          <div className="flex items-end gap-2 md:col-span-2 lg:col-span-4">
            <Button type="button" className="bg-nlng-blue hover:bg-nlng-blue/90" onClick={onQuery}>
              Query
            </Button>
            {reportQ.isFetching ? (
              <span className="text-sm text-zinc-500">Fetching… (server times out slow uctracking calls after ~60s)</span>
            ) : null}
            {reportQ.isError ? (
              <span className="text-sm text-red-400">
                {reportQ.error instanceof Error &&
                (reportQ.error.name === "AbortError" || /aborted|timeout/i.test(reportQ.error.message))
                  ? "Timed out waiting for the report — try a shorter date range or check the terminal logs."
                  : "Request failed — check Network tab for /api/fleet/reports/mileage-details."}
              </span>
            ) : null}
          </div>
        </CardContent>
      </Card>

      {showChart ? (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>Fuel / velocity profile</CardTitle>
              <p className="mt-1 text-sm text-zinc-400">
                Built when the payload includes recognizable fuel-level and speed columns.
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <div className="h-72 w-full md:h-80">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartSeries} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
                  <CartesianGrid stroke="#3f3f46" strokeDasharray="3 3" />
                  <XAxis dataKey="t" tick={{ fontSize: 10, fill: "#a1a1aa" }} interval="preserveStartEnd" />
                  <YAxis yAxisId="fuel" tick={{ fontSize: 11, fill: "#38bdf8" }} />
                  <YAxis yAxisId="spd" orientation="right" tick={{ fontSize: 11, fill: "#a1a1aa" }} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: "#27272a",
                      border: "1px solid #52525b",
                      borderRadius: "8px",
                      fontSize: "13px",
                    }}
                  />
                  <Legend />
                  <Line yAxisId="fuel" type="monotone" dataKey="fuelL" name="Fuel (L)" stroke="#38bdf8" dot={false} strokeWidth={2} connectNulls />
                  <Line yAxisId="spd" type="monotone" dataKey="speedKmh" name="Speed (km/h)" stroke="#a1a1aa" dot={false} strokeWidth={2} connectNulls />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-2">
          <div>
            <CardTitle>Results</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">Paged vendor table — columns mirror the raw JSON.</p>
          </div>
          <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-500">
            {totalHint != null ? <span>Total (hint): {totalHint}</span> : null}
            <span>Page {queryKey.page}</span>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={queryKey.page <= 1 || reportQ.isFetching}
              onClick={() => applyPage(queryKey.page - 1)}
            >
              Previous
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={table.rows.length < pageSize || reportQ.isFetching}
              onClick={() => applyPage(queryKey.page + 1)}
            >
              Next
            </Button>
          </div>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          {reportQ.data?.source === "demo" ? (
            <p className="mb-3 rounded-lg border border-amber-500/40 bg-amber-500/10 px-3 py-2 text-sm text-amber-100">
              uctracking is not enabled or not configured (set UCTRACKING_ENABLED=true and base URL / account / password). The
              table below is an empty placeholder until the API returns real rows.
            </p>
          ) : null}
          {reportQ.data?.source === "error" ? (
            <p className="mb-3 rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm text-red-100">
              The oil/mileage request failed after connecting to uctracking (timeout, network, or vendor error). Check the
              terminal where <code className="text-red-50">next dev</code> is running, or set{" "}
              <code className="text-red-50">UCTRACKING_FETCH_TIMEOUT_MS</code> in <code className="text-red-50">.env.local</code>.
            </p>
          ) : null}
          {table.columns.length > 0 ? (
            <table className="w-full min-w-[960px] text-left text-sm">
              <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                <tr>
                  <th className="border-b border-vms-border py-3 pr-2">#</th>
                  {table.columns.map((c) => (
                    <th key={c} className="border-b border-vms-border py-3 pr-4">
                      {c}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {table.rows.map((row, i) => (
                  <tr key={`${queryKey.page}-${i}`} className="hover:bg-vms-inset/60">
                    <td className="border-b border-vms-border py-3 pr-2 text-zinc-500">
                      {(queryKey.page - 1) * pageSize + i + 1}
                    </td>
                    {row.map((cell, j) => (
                      <td key={j} className="border-b border-vms-border py-3 pr-4 text-zinc-200">
                        {cell}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          ) : !reportQ.isFetching ? (
            <p className="text-sm text-zinc-500">No rows for this report. Try a different date range or report type.</p>
          ) : null}
        </CardContent>
      </Card>
    </div>
  );
}
