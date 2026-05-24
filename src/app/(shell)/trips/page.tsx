"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type TripsPayload = {
  active: { plate: string; driverName?: string | null; origin: string; destination: string; eta?: string | null; progressPercent?: number | null }[];
  requests: { id: string; requesterName: string; route: string; datetime: string; vehicleType: string; priority: string }[];
  stats: { activeCount: number; completedToday: number; pendingApproval: number; kmToday: number };
};

async function fetchTrips(): Promise<{ source: string; data: TripsPayload }> {
  const res = await fetch("/api/fleet/trips");
  if (!res.ok) throw new Error("trips");
  return res.json();
}

export default function TripsPage() {
  const { data } = useQuery({ queryKey: ["fleet-trips"], queryFn: fetchTrips });
  const payload = data?.data;

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="mb-4 text-xl font-semibold tracking-tight text-zinc-50 md:mb-6 md:text-2xl">Trips</h1>
      <div className="text-sm text-zinc-400 md:text-base">
        Data source: <span className="font-semibold">{data?.source ?? "—"}</span>{" "}
        {data?.source === "mock" ? <span className="text-amber-300">(mock data)</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["Ongoing trips", payload?.stats.activeCount ?? "—", "text-emerald-600"],
          ["Completed today", payload?.stats.completedToday ?? "—", "text-nlng-blue"],
          ["Pending approval", payload?.stats.pendingApproval ?? "—", "text-amber-700"],
          ["km today", payload?.stats.kmToday?.toLocaleString() ?? "—", "text-nlng-blue"],
        ].map(([l, v, c]) => (
          <Card key={String(l)} className="p-4 text-center md:p-5">
            <div className={`text-2xl font-semibold md:text-3xl ${c}`}>{v}</div>
            <div className="mt-1 text-xs md:text-sm text-zinc-400">{l}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Ongoing trips</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm md:text-base">
              <thead className="text-xs md:text-sm uppercase text-zinc-400">
                <tr>
                  <th className="border-b border-border-tertiary py-2">Plate</th>
                  <th className="border-b border-border-tertiary py-2">Driver</th>
                  <th className="border-b border-border-tertiary py-2">From</th>
                  <th className="border-b border-border-tertiary py-2">To</th>
                  <th className="border-b border-border-tertiary py-2">ETA</th>
                  <th className="border-b border-border-tertiary py-2">Progress</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.active ?? []).map((t, idx) => (
                  <tr key={`${t.plate}-${idx}`} className="hover:bg-vms-inset">
                    <td className="border-b border-border-tertiary py-2 font-medium text-nlng-blue">{t.plate}</td>
                    <td className="border-b border-border-tertiary py-2">{t.driverName}</td>
                    <td className="border-b border-border-tertiary py-2 text-zinc-400">{t.origin}</td>
                    <td className="border-b border-border-tertiary py-2">{t.destination}</td>
                    <td className="border-b border-border-tertiary py-2 text-emerald-600">{t.eta}</td>
                    <td className="border-b border-border-tertiary py-2">
                      <div className="flex items-center gap-2">
                        <div className="h-1.5 w-20 overflow-hidden rounded-full bg-surface-secondary">
                          <div className="h-full bg-nlng-blue" style={{ width: `${t.progressPercent ?? 0}%` }} />
                        </div>
                        <span className="text-zinc-400">{t.progressPercent ?? 0}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Pending trip requests</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm md:text-base">
            {(payload?.requests ?? []).map((r) => (
              <div key={r.id} className="rounded-md bg-surface-secondary p-2">
                <div className="flex justify-between">
                  <span className="font-medium">{r.requesterName}</span>
                  <Badge variant={r.priority === "Urgent" ? "danger" : r.priority === "Executive" ? "purple" : "info"}>{r.priority}</Badge>
                </div>
                <div className="mt-1 text-xs md:text-sm text-zinc-400">
                  {r.route} · {r.datetime} · {r.vehicleType}
                </div>
                <div className="mt-2 flex gap-2">
                  <Button size="sm" variant="outline" className="border-emerald-600 text-emerald-700 hover:bg-emerald-50">
                    Approve
                  </Button>
                  <Button size="sm" variant="destructive">
                    Reject
                  </Button>
                </div>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
