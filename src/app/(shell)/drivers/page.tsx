"use client";

import Link from "next/link";
import { useDeferredValue, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle, BookOpen, GraduationCap, Users, Wifi } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataSourcePill } from "@/components/ui/data-source-pill";
import { VmsBackBar, VmsLocationToggle, VmsPageHero, VmsStatCard, type VmsLocationFilter } from "@/components/vms/vms-page-blocks";
import { fatigueHeatGrid } from "@/lib/fatigue-grid";
import type { BreathLog } from "@/lib/uctracking/schemas";
import type { DriverListRow } from "@/lib/uctracking/normalize-driver-list";
import { cn } from "@/lib/utils";

type RosterResponse = {
  source: string;
  drivers: DriverListRow[];
  total: number;
  raw: unknown;
};

/** Legacy mock payload for breathalyzer panel (fatigue grid is local synthetic). */
type MockPanelPayload = {
  breathalyzer: BreathLog[];
};

async function fetchRoster(dName: string): Promise<RosterResponse> {
  const qs = new URLSearchParams();
  if (dName.trim()) qs.set("dName", dName.trim());
  const res = await fetch(`/api/fleet/drivers/roster?${qs.toString()}`);
  if (!res.ok) throw new Error("roster");
  return res.json();
}

async function fetchMockPanels(): Promise<{ source: string; data: MockPanelPayload }> {
  const res = await fetch("/api/fleet/drivers");
  if (!res.ok) throw new Error("drivers-mock");
  return res.json();
}

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return (parts[0].slice(0, 1) + parts[parts.length - 1].slice(0, 1)).toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function scoreBarWidth(score: number | null): number {
  if (score == null || !Number.isFinite(score)) return 0;
  return Math.min(100, Math.max(8, score));
}

/** Deterministic pseudo-score for UI demo when API has no score (labeled as mock in UI). */
function mockScoreFromId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h + id.charCodeAt(i) * (i + 1)) % 997;
  return 55 + (h % 45);
}

function inferDriverLocation(label: string | null | undefined): "CHO" | "Bonny" | "Other" {
  const n = (label ?? "").toLowerCase();
  if (n.includes("bonny")) return "Bonny";
  if (n.includes("cho") || n.includes("ph gate") || n.includes("depot") || n.includes("trans-amadi") || n.includes("eleme")) {
    return "CHO";
  }
  return "Other";
}

export default function DriversPage() {
  const [search, setSearch] = useState("");
  const [location, setLocation] = useState<VmsLocationFilter>("all");
  const deferredSearch = useDeferredValue(search);

  const rosterQ = useQuery({
    queryKey: ["drivers-roster", deferredSearch],
    queryFn: () => fetchRoster(deferredSearch),
    staleTime: 30_000,
    refetchOnWindowFocus: true,
  });

  const mockPanelsQ = useQuery({
    queryKey: ["drivers-mock-panels"],
    queryFn: fetchMockPanels,
    staleTime: 60_000,
  });

  const source = rosterQ.data?.source;
  const isReal = source === "uctracking";
  const rows = useMemo(() => rosterQ.data?.drivers ?? [], [rosterQ.data]);
  const totalFleet = rosterQ.data?.total ?? rows.length;

  const locationRows = useMemo(() => {
    if (location === "all") return rows;
    return rows.filter((r) => {
      const loc = inferDriverLocation(r.address ?? r.birthplace ?? "");
      return loc === location || (location === "CHO" && loc === "Other");
    });
  }, [rows, location]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return locationRows;
    return locationRows.filter(
      (r) =>
        r.name.toLowerCase().includes(q) ||
        r.workNumber.toLowerCase().includes(q) ||
        r.contact.toLowerCase().includes(q) ||
        r.licenseNumber.toLowerCase().includes(q) ||
        (r.vehiclePlate ?? "").toLowerCase().includes(q),
    );
  }, [locationRows, search]);

  const syncedAgo = rosterQ.dataUpdatedAt
    ? Math.max(0, Math.round((Date.now() - rosterQ.dataUpdatedAt) / 1000))
    : null;

  const grid = fatigueHeatGrid(5, 7);
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const mockPanel = mockPanelsQ.data?.data;

  const mockKpi = {
    onlineOnShift: 834,
    hosViolations: 12,
    docsExpiring: 38,
    trainingDue: 24,
  };

  function exportCsv() {
    const header = [
      "id",
      "name",
      "workNumber",
      "contact",
      "idNumber",
      "licenseNumber",
      "licenseExpires",
      "vehiclePlate",
    ];
    const lines = [header.join(",")];
    for (const r of filtered) {
      const esc = (s: string) => `"${s.replace(/"/g, '""')}"`;
      lines.push(
        [
          r.id,
          r.name,
          r.workNumber,
          r.contact,
          r.idNumber,
          r.licenseNumber,
          r.licenseExpires ?? "",
          r.vehiclePlate ?? "",
        ]
          .map(esc)
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "drivers-export.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 md:space-y-8">
      <VmsBackBar
        right={
          <div className="flex flex-wrap items-center gap-3">
            <VmsLocationToggle value={location} onChange={setLocation} />
            <div className="flex flex-wrap items-center gap-2 text-sm text-zinc-400 md:text-base">
              <span>Roster:</span>
              <DataSourcePill source={source} />
              {rosterQ.isFetching ? <span className="text-zinc-500">Refreshing…</span> : null}
            </div>
          </div>
        }
      />

      <VmsPageHero
        icon={Users}
        title="Drivers Dashboard"
        description="Roster from uctracking queryDriverList, exportable grid, and mock wellness panels until vendor fields land for HOS and breath data."
      />

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4 md:gap-5">
        <VmsStatCard
          label="Total drivers"
          value={rosterQ.isLoading ? "—" : totalFleet.toLocaleString()}
          sub={isReal ? "Vendor roster total" : "Includes demo fallback"}
          trend={isReal ? "Live queryDriverList" : "Check uctracking config"}
          trendTone={isReal ? "good" : "neutral"}
          icon={Users}
        />
        <VmsStatCard
          label="Online / on shift"
          value={mockKpi.onlineOnShift.toLocaleString()}
          sub="Synthetic operations KPI"
          trend="Placeholder until telematics shift state exists"
          trendTone="neutral"
          icon={Wifi}
        />
        <VmsStatCard
          label="HOS violations"
          value={mockKpi.hosViolations}
          sub="Mock compliance counter"
          trend="Not returned by queryDriverList yet"
          trendTone="bad"
          icon={AlertTriangle}
        />
        <VmsStatCard
          label="Training due"
          value={mockKpi.trainingDue}
          sub="Mock L&D queue"
          trend="Docs expiring (mock): 38"
          trendTone="neutral"
          icon={GraduationCap}
        />
      </div>

      <div className="flex items-start gap-3 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 md:px-5 md:py-4">
        <BookOpen className="mt-0.5 h-5 w-5 shrink-0 text-nlng-amber" />
        <p className="text-sm text-amber-100/90 md:text-base">
          Breathalyzer and fatigue widgets at the bottom of this page are <strong className="text-amber-50">mock data</strong>.
          Punch card and identify-alarm tools live under{" "}
          <Link href="/settings" className="font-medium text-sky-400 underline hover:text-sky-300">
            Settings → API tools
          </Link>
          .
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <CardTitle>Filters &amp; actions</CardTitle>
            <p className="mt-1 text-sm text-zinc-400 md:text-base">
              Location matches address / birthplace text when it mentions CHO or Bonny. Additional dropdowns are placeholders
              until the vendor exposes status and licence filters.
            </p>
          </div>
          <Button asChild size="sm" className="shrink-0 md:h-11 md:text-base">
            <Link href="/settings">+ Add driver (API tools)</Link>
          </Button>
        </CardHeader>
        <CardContent className="flex flex-col gap-3">
          <div className="flex min-w-0 flex-1 flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center">
            <Input
              placeholder="Search name, phone, licence…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-md bg-vms-inset"
            />
            <label className="inline-flex items-center gap-2 rounded-lg border border-vms-border bg-vms-inset px-3 py-2 text-sm text-zinc-300">
              <span className="text-zinc-500">Status</span>
              <select className="bg-transparent text-zinc-200 outline-none" disabled>
                <option>All status</option>
              </select>
            </label>
            <label className="inline-flex items-center gap-2 rounded-lg border border-vms-border bg-vms-inset px-3 py-2 text-sm text-zinc-300">
              <span className="text-zinc-500">Licence</span>
              <select className="bg-transparent text-zinc-200 outline-none" disabled>
                <option>All licence types</option>
              </select>
            </label>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle>Driver roster</CardTitle>
            <p className="mt-1 text-sm text-zinc-400 md:text-base">
              Showing {filtered.length} driver{filtered.length === 1 ? "" : "s"} for the current location and search.
            </p>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[920px] text-left text-sm md:text-base">
              <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
                <tr>
                  <th className="border-b border-vms-border py-3 pl-4 pr-4">Driver</th>
                  <th className="border-b border-vms-border py-3 pr-4">IC / RFID</th>
                  <th className="border-b border-vms-border py-3 pr-4">Vehicle</th>
                  <th className="border-b border-vms-border py-3 pr-4">Licence</th>
                  <th className="border-b border-vms-border py-3 pr-4">Score</th>
                  <th className="border-b border-vms-border py-3 pr-4">HOS</th>
                </tr>
              </thead>
              <tbody>
                {rosterQ.isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-zinc-500">
                      Loading drivers…
                    </td>
                  </tr>
                ) : rosterQ.isError ? (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-red-400">
                      Could not load driver roster. Check uctracking credentials and network.
                    </td>
                  </tr>
                ) : (
                  filtered.map((r) => {
                    const mockScore = mockScoreFromId(r.id);
                    const loc = r.address ?? r.birthplace ?? "—";
                    return (
                      <tr key={r.id} className="hover:bg-vms-inset/60">
                        <td className="border-b border-vms-border py-3 pl-4 pr-4">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-nlng-blue text-sm font-semibold text-white md:h-11 md:w-11 md:text-base">
                              {initials(r.name)}
                            </div>
                            <div>
                              <div className="font-medium text-zinc-100">{r.name}</div>
                              <div className="text-xs text-zinc-500 md:text-sm">{loc}</div>
                            </div>
                          </div>
                        </td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-300">
                        <div>{r.idNumber ? `IC-${r.idNumber}` : "—"}</div>
                        <div className="text-xs text-zinc-500">
                          {r.raw.crd != null ? `RFID-${String(r.raw.crd)}` : "RFID —"}
                        </div>
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4">
                        {r.vehiclePlate ? (
                          <span className="font-semibold text-sky-400">{r.vehiclePlate}</span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-300">
                        <div>{r.licenseTypeLabel ? `Class ${r.licenseTypeLabel}` : "Licence"}</div>
                        <div className="text-xs text-zinc-500">{r.licenseExpires ?? r.licenseIssued ?? "—"}</div>
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4">
                        <div className="flex items-center gap-2">
                          <span className="w-8 tabular-nums text-zinc-100">{mockScore}</span>
                          <div className="h-2 w-24 overflow-hidden rounded-full bg-vms-inset">
                            <div
                              className={cn(
                                "h-full rounded-full",
                                mockScore >= 85 ? "bg-emerald-500" : mockScore >= 70 ? "bg-amber-500" : "bg-red-500",
                              )}
                              style={{ width: `${scoreBarWidth(mockScore)}%` }}
                            />
                          </div>
                        </div>
                        <div className="mt-0.5 text-[10px] text-amber-600/90 md:text-xs">mock score (not in API)</div>
                      </td>
                      <td className="border-b border-vms-border py-3 pr-4 text-zinc-400">
                        —
                        <div className="text-[10px] text-zinc-600 md:text-xs">not in queryDriverList</div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

        <div className="flex flex-col gap-3 border-t border-vms-border px-4 py-3 text-sm text-zinc-500 md:flex-row md:items-center md:justify-between md:text-base">
          <p>
            Showing <span className="font-medium text-zinc-300">{filtered.length}</span> of{" "}
            <span className="font-medium text-zinc-300">{totalFleet.toLocaleString()}</span> drivers
            {syncedAgo != null ? (
              <>
                {" "}
                · synced from{" "}
                <code className="rounded bg-vms-inset px-1.5 py-0.5 text-sky-400">queryDriverList</code>{" "}
                {syncedAgo}s ago
              </>
            ) : null}
          </p>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" type="button" onClick={exportCsv} disabled={!filtered.length}>
              Export CSV
            </Button>
            <Button variant="outline" size="sm" type="button" disabled>
              Export Excel
            </Button>
          </div>
        </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <div className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Breathalyzer log</CardTitle>
              <Badge variant="warn">mock data</Badge>
            </CardHeader>
            <CardContent className="space-y-1 text-sm md:text-base">
              {(mockPanel?.breathalyzer ?? []).map((b, i) => (
                <div key={i} className="flex justify-between border-b border-vms-border py-2 last:border-0">
                  <span>{b.driverName}</span>
                  <span className="text-zinc-400">{b.time}</span>
                  <Badge variant="success">{b.result}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-base font-semibold">Fatigue risk heatmap</CardTitle>
              <Badge variant="warn">mock data</Badge>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-7 gap-1 text-center text-xs text-zinc-400 md:text-sm">
              {days.map((d) => (
                <div key={d} className="pb-1">
                  {d}
                </div>
              ))}
              {grid.flatMap((row, ri) =>
                row.map((risk, ci) => {
                  const col = risk > 0.7 ? "#dc2626" : risk > 0.4 ? "#ca8a04" : "#16a34a";
                  return (
                    <div
                      key={`${ri}-${ci}`}
                      className="h-4 rounded-sm md:h-5"
                      style={{ background: col, opacity: 0.2 + risk * 0.8 }}
                    />
                  );
                }),
              )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
