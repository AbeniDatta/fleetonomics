"use client";

import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

type CompPayload = {
  stats: { expired: number; expiring30d: number; openIncidents: number; complianceRate: number };
  documents: { subjectId: string; docType: string; expiresOn: string; band: string; statusLabel: string }[];
  incidents: { id: string; title: string; openedAt: string; status: string }[];
  fines: { id: string; vehiclePlate: string; amountNgn: number; issuedAt: string; violation: string }[];
};

async function fetchComp(): Promise<{ source: string; data: CompPayload }> {
  const res = await fetch("/api/fleet/compliance");
  if (!res.ok) throw new Error("compliance");
  return res.json();
}

function bandColor(band: string) {
  if (band === "red") return "bg-red-600";
  if (band === "amber") return "bg-amber-500";
  return "bg-emerald-600";
}

export default function CompliancePage() {
  const { data } = useQuery({ queryKey: ["fleet-compliance"], queryFn: fetchComp });
  const payload = data?.data;

  return (
    <div className="space-y-6 md:space-y-8">
      <h1 className="vms-page-title mb-4 md:mb-6">Compliance</h1>
      <div className="text-sm text-zinc-400">
        Data source: <span className="font-semibold">{data?.source ?? "—"}</span>{" "}
        {data?.source === "mock" ? <span className="text-amber-300">(mock data)</span> : null}
      </div>
      <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
        {[
          ["Expired docs", payload?.stats.expired ?? "—", "text-red-600"],
          ["Expiring 30d", payload?.stats.expiring30d ?? "—", "text-amber-700"],
          ["Open incidents", payload?.stats.openIncidents ?? "—", "text-nlng-blue"],
          ["Compliance rate", `${payload?.stats.complianceRate ?? "—"}%`, "text-emerald-600"],
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
            <CardTitle>Document expiry tracker</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-[11px]">
            {(payload?.documents ?? []).map((d) => (
              <div key={`${d.subjectId}-${d.docType}`} className="flex items-center gap-3 rounded-md bg-surface-secondary p-2">
                <div className={`h-8 w-1 rounded-sm ${bandColor(d.band)}`} />
                <div className="flex-1">
                  <div className="font-medium">
                    {d.subjectId} — {d.docType}
                  </div>
                  <div className="text-xs md:text-sm text-zinc-400">Expires {d.expiresOn}</div>
                </div>
                <Badge variant={d.band === "red" ? "danger" : d.band === "amber" ? "warn" : "success"}>{d.statusLabel}</Badge>
              </div>
            ))}
          </CardContent>
        </Card>

        <div className="space-y-2.5">
          <Card>
            <CardHeader>
              <CardTitle>Open incidents</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(payload?.incidents ?? []).map((i) => (
                <div key={i.id} className="flex justify-between border-b border-border-tertiary py-1 last:border-0">
                  <span className="font-medium">{i.title}</span>
                  <span className="text-zinc-400">{i.openedAt}</span>
                  <Badge variant="warn">{i.status}</Badge>
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Traffic fines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              {(payload?.fines ?? []).map((f) => (
                <div key={f.id} className="flex justify-between border-b border-border-tertiary py-1 last:border-0">
                  <span className="font-medium text-nlng-blue">{f.vehiclePlate}</span>
                  <span>₦{f.amountNgn.toLocaleString()}</span>
                  <span className="text-zinc-400">{f.issuedAt}</span>
                  <span className="text-zinc-300">{f.violation}</span>
                </div>
              ))}
              <div className="pt-2 text-sm text-zinc-400">FRSC export: wire to compliance service when ready.</div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
