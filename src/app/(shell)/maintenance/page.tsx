"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type MaintPayload = {
  stats: { dueThisWeek: number; overdue: number; inWorkshop: number; spendMtdNgn: number };
  workOrders: { id: string; vehiclePlate: string; type: string; issue: string; priority: string; status: string }[];
  faults: { vehiclePlate: string; code: string; description: string; severity: string }[];
  parts: { name: string; quantityLabel: string; stockStatus: string }[];
};

async function fetchMaint(): Promise<{ source: string; data: MaintPayload }> {
  const res = await fetch("/api/fleet/maintenance");
  if (!res.ok) throw new Error("maintenance");
  return res.json();
}

export default function MaintenancePage() {
  const { data } = useQuery({ queryKey: ["fleet-maintenance"], queryFn: fetchMaint });
  const payload = data?.data;

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="vms-page-title mb-4 md:mb-6">Maintenance</h1>
      <div className="text-sm text-zinc-400">
        Data source: <span className="font-semibold">{data?.source ?? "—"}</span>{" "}
        {data?.source === "mock" ? <span className="text-amber-300">(mock data)</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["Due this week", payload?.stats.dueThisWeek ?? "—", "text-amber-700"],
          ["Overdue", payload?.stats.overdue ?? "—", "text-red-600"],
          ["In workshop", payload?.stats.inWorkshop ?? "—", "text-emerald-600"],
          ["Spend MTD", `₦${((payload?.stats.spendMtdNgn ?? 0) / 1_000_000).toFixed(1)}M`, "text-nlng-blue"],
        ].map(([l, v, c]) => (
          <Card key={String(l)} className="p-4 text-center md:p-5">
            <div className={`vms-stat-value ${c}`}>{v}</div>
            <div className="mt-1 text-xs md:text-sm text-zinc-400">{l}</div>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 md:gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Open work orders</CardTitle>
          </CardHeader>
          <CardContent className="overflow-x-auto">
            <table className="w-full min-w-[640px] text-left text-sm">
              <thead className="text-xs md:text-sm uppercase text-zinc-400">
                <tr>
                  <th className="border-b border-border-tertiary py-2">WO</th>
                  <th className="border-b border-border-tertiary py-2">Vehicle</th>
                  <th className="border-b border-border-tertiary py-2">Type</th>
                  <th className="border-b border-border-tertiary py-2">Issue</th>
                  <th className="border-b border-border-tertiary py-2">Priority</th>
                  <th className="border-b border-border-tertiary py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {(payload?.workOrders ?? []).map((w) => (
                  <tr key={w.id} className="hover:bg-vms-inset">
                    <td className="border-b border-border-tertiary py-2 font-medium text-nlng-blue">{w.id}</td>
                    <td className="border-b border-border-tertiary py-2 font-medium">{w.vehiclePlate}</td>
                    <td className="border-b border-border-tertiary py-2 text-zinc-400">{w.type}</td>
                    <td className="border-b border-border-tertiary py-2">{w.issue}</td>
                    <td className="border-b border-border-tertiary py-2">
                      <Badge variant={w.priority === "high" ? "danger" : w.priority === "medium" ? "warn" : "success"}>
                        {w.priority}
                      </Badge>
                    </td>
                    <td className="border-b border-border-tertiary py-2">
                      <Badge variant={w.status === "Complete" ? "success" : "warn"}>{w.status}</Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>

        <div className="space-y-2.5">
          <Card>
            <CardHeader>
              <CardTitle>OBD fault codes</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(payload?.faults ?? []).map((f, i) => (
                <div key={i} className="flex justify-between border-b border-border-tertiary py-1 last:border-0">
                  <span className="font-medium text-nlng-blue">{f.vehiclePlate}</span>
                  <Badge variant="purple">{f.code}</Badge>
                  <span className="text-zinc-400">{f.description}</span>
                  <span className={f.severity === "high" ? "text-red-600" : "text-amber-600"}>●</span>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Spare parts</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(payload?.parts ?? []).map((p) => (
                <div key={p.name} className="flex justify-between border-b border-border-tertiary py-1 last:border-0">
                  <span>{p.name}</span>
                  <span className="font-medium text-emerald-600">{p.quantityLabel}</span>
                  <Badge variant={p.stockStatus === "critical" ? "danger" : p.stockStatus === "low" ? "warn" : "success"}>
                    {p.stockStatus}
                  </Badge>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
