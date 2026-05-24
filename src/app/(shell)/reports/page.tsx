"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Bar, BarChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { BarChart3, Car, FileSpreadsheet, LayoutGrid, Route } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSourcePill } from "@/components/ui/data-source-pill";
import { VmsBackBar, VmsPageHero, VmsStatCard } from "@/components/vms/vms-page-blocks";
import { cn } from "@/lib/utils";

const categories = ["Mileage", "Fuel", "Safety", "Driver scoring", "Cost allocation", "Maintenance", "Compliance"];

const demoMileage = [
  { m: "Jan", km: 420000 },
  { m: "Feb", km: 445000 },
  { m: "Mar", km: 438000 },
  { m: "Apr", km: 460000 },
  { m: "May", km: 472000 },
];

const topVehicles = [
  { plate: "NL-0774", km: 18200, score: 94 },
  { plate: "NL-0392", km: 17120, score: 91 },
  { plate: "NL-0318", km: 16980, score: 82 },
  { plate: "NL-0847", km: 16840, score: 88 },
  { plate: "NL-0114", km: 16510, score: 79 },
];

export default function ReportsPage() {
  const [cat, setCat] = useState(categories[0]);

  const mileageQ = useQuery({
    queryKey: ["reports-mileage"],
    queryFn: async () => {
      const now = new Date();
      const begin = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
      const params = new URLSearchParams({
        beginTime: begin.toISOString(),
        endTime: now.toISOString(),
        currentPage: "1",
        pageRecords: "50",
      });
      const res = await fetch(`/api/fleet/reports/mileage?${params.toString()}`);
      if (!res.ok) throw new Error("mileage");
      return res.json() as Promise<{ source: string; data: unknown }>;
    },
    refetchOnWindowFocus: false,
  });

  const mileageSeries = useMemo(() => {
    const payload = mileageQ.data?.data as Record<string, unknown> | undefined;
    const arr =
      (payload?.items as unknown[]) ||
      (payload?.data as unknown[]) ||
      (payload?.result as unknown[]) ||
      (payload?.rows as unknown[]) ||
      null;
    if (!arr || !Array.isArray(arr) || arr.length === 0) return demoMileage;
    const pts = arr
      .map((r) => r as Record<string, unknown>)
      .map((r, i) => ({
        m: String(r.day ?? r.date ?? r.timeStr ?? r.beginTime ?? `#${i + 1}`).slice(0, 10),
        km: Number(r.mile ?? r.mileage ?? r.km ?? r.distance ?? 0),
      }))
      .filter((p) => Number.isFinite(p.km));
    return pts.length ? pts : demoMileage;
  }, [mileageQ.data]);

  const totalKm = useMemo(() => mileageSeries.reduce((s, p) => s + p.km, 0), [mileageSeries]);
  const avgKm = mileageSeries.length > 0 ? Math.round(totalKm / mileageSeries.length) : 0;

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar
        right={
          <div className="flex items-center gap-2 text-xs text-zinc-500 md:text-sm">
            <span>Mileage feed</span>
            <DataSourcePill source={mileageQ.data?.source} />
            {mileageQ.isFetching ? <span className="text-zinc-500">Loading…</span> : null}
          </div>
        }
      />

      <VmsPageHero
        icon={FileSpreadsheet}
        title="Reports Dashboard"
        description="Fleet analytics by category. Mileage trend below hydrates from the vendor mileage API when available, with a demo fallback for empty payloads."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="Total distance"
          value={`${(totalKm / 1000).toFixed(0)}k km`}
          sub="Sum of visible series"
          trend={mileageQ.isLoading ? "Loading vendor window…" : "Last 30 days window"}
          trendTone="neutral"
          icon={Route}
        />
        <VmsStatCard
          label="Avg per bucket"
          value={avgKm.toLocaleString()}
          sub="km per chart point"
          trend={`${mileageSeries.length} buckets in view`}
          trendTone="good"
          icon={BarChart3}
        />
        <VmsStatCard
          label="Report categories"
          value={categories.length}
          sub="Library coverage"
          trend={`Active view: ${cat}`}
          trendTone="neutral"
          icon={LayoutGrid}
        />
        <VmsStatCard
          label="Top fleet sample"
          value={topVehicles.length}
          sub="Demo leaderboard rows"
          trend="Swap to live ranking when API exposes it"
          trendTone="neutral"
          icon={Car}
        />
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-[220px_1fr]">
        <Card className="h-fit">
          <CardHeader>
            <CardTitle>Categories</CardTitle>
            <p className="mt-1 text-sm text-zinc-400">Pick a report family — charts follow the selection label.</p>
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
                <CardTitle>Mileage trend</CardTitle>
                <p className="mt-1 text-sm text-zinc-400">Category: {cat}</p>
              </div>
              <div className="flex flex-wrap gap-4 text-xs md:text-sm">
                <span className="inline-flex items-center gap-2 text-zinc-400">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-400" /> Distance (km)
                </span>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-64 w-full md:h-72">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={mileageSeries} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                    <XAxis dataKey="m" tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                    <YAxis tick={{ fontSize: 12, fill: "#a1a1aa" }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#27272a",
                        border: "1px solid #52525b",
                        borderRadius: "8px",
                        fontSize: "14px",
                      }}
                    />
                    <Bar dataKey="km" fill="#38bdf8" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <CardTitle>Top vehicles (km · score)</CardTitle>
                <p className="mt-1 text-sm text-zinc-400">Illustrative leaderboard until mileage ranking API lands.</p>
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
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                  <tr>
                    <th className="border-b border-vms-border py-3 pr-4">Plate</th>
                    <th className="border-b border-vms-border py-3 pr-4">km (30d)</th>
                    <th className="border-b border-vms-border py-3">Score</th>
                  </tr>
                </thead>
                <tbody>
                  {topVehicles.map((r) => (
                    <tr key={r.plate} className="hover:bg-vms-inset/60">
                      <td className="border-b border-vms-border py-3 pr-4 font-semibold text-sky-400">{r.plate}</td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-200">{r.km.toLocaleString()}</td>
                      <td className="border-b border-vms-border py-3 font-semibold text-zinc-100">{r.score}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
