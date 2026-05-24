"use client";

import Link from "next/link";
import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DataSourcePill } from "@/components/ui/data-source-pill";
import type { SafetyAlarmsPayload } from "@/lib/api/fleet-handlers";
import type { Alarm } from "@/lib/uctracking/schemas";
import { cn } from "@/lib/utils";

type Props = {
  role: "ADAS" | "DMS";
  title: string;
  description?: string;
  limit?: number;
};

async function fetchSafetyAlarms(role: "ADAS" | "DMS", hours: number): Promise<SafetyAlarmsPayload> {
  const qs = new URLSearchParams({ role, hours: String(hours) });
  const res = await fetch(`/api/fleet/safety/alarms?${qs}`);
  if (!res.ok) throw new Error("safety-alarms");
  return res.json();
}

function severityVariant(severity: Alarm["severity"]) {
  if (severity === "critical" || severity === "high") return "danger" as const;
  if (severity === "medium") return "warn" as const;
  return "default" as const;
}

function vehicleHref(alarm: Alarm): string | null {
  const key = alarm.plate ?? alarm.vehicleId;
  if (!key || key === "unknown") return null;
  return `/vehicles/${encodeURIComponent(key)}`;
}

export function SafetyAlarmsPanel({ role, title, description, limit = 50 }: Props) {
  const alarmsQ = useQuery({
    queryKey: ["safety-alarms", role, 24],
    queryFn: () => fetchSafetyAlarms(role, 24),
    refetchInterval: 20_000,
    staleTime: 10_000,
  });

  const alarms = useMemo(() => (alarmsQ.data?.data ?? []).slice(0, limit), [alarmsQ.data?.data, limit]);

  const stats = useMemo(() => {
    const list = alarmsQ.data?.data ?? [];
    const open = list.filter((a) => a.acknowledged !== true).length;
    const critical = list.filter((a) => a.severity === "critical" || a.severity === "high").length;
    return { total: list.length, open, critical };
  }, [alarmsQ.data?.data]);

  const feeds = alarmsQ.data?.feeds;

  return (
    <Card>
      <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-nlng-amber" />
            {title}
          </CardTitle>
          {description ? <p className="mt-1 text-sm text-zinc-400">{description}</p> : null}
        </div>
        <DataSourcePill
          source={
            alarmsQ.data?.source === "uctracking" && (alarmsQ.data?.data?.length ?? 0) === 0
              ? "uctracking-empty"
              : alarmsQ.data?.source
          }
          uctrackingLabel="Live"
        />
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-3 text-xs text-zinc-500 md:text-sm">
          <span>
            <span className="font-medium text-zinc-300">{stats.total}</span> events (24h)
          </span>
          <span>
            <span className="font-medium text-zinc-300">{stats.critical}</span> high priority
          </span>
          <span>
            <span className="font-medium text-zinc-300">{stats.open}</span> unacknowledged
          </span>
          {feeds && alarmsQ.data?.source === "uctracking" ? (
            <span className="text-zinc-600">
              feeds: safety {feeds.safetyQuery} · detail {feeds.alarmPage} · identify {feeds.identify}
            </span>
          ) : null}
        </div>

        {alarmsQ.isLoading ? (
          <p className="py-8 text-center text-sm text-zinc-500">Loading {role} alarms…</p>
        ) : alarmsQ.isError || alarmsQ.data?.source === "error" ? (
          <p className="py-8 text-center text-sm text-red-400">
            Could not load safety alarms. Check uctracking connection and try again.
          </p>
        ) : alarms.length === 0 ? (
          <p className="py-8 text-center text-sm text-zinc-500">
            No {role} alarms in the last 24 hours. The connection to uctracking is working; your fleet may have no
            matching events in this period.
          </p>
        ) : (
          <div className="max-h-[min(28rem,50vh)] space-y-2 overflow-y-auto">
            {alarms.map((a) => {
              const href = vehicleHref(a);
              return (
                <div
                  key={a.id}
                  className={cn(
                    "flex flex-wrap items-center justify-between gap-2 rounded-lg border border-vms-border bg-vms-inset/50 px-3 py-2.5",
                    href && "hover:bg-vms-inset",
                  )}
                >
                  <div className="min-w-0 flex-1">
                    {href ? (
                      <Link href={href} className="font-semibold text-sky-400 hover:underline">
                        {a.plate ?? a.vehicleId}
                      </Link>
                    ) : (
                      <div className="font-semibold text-zinc-100">{a.plate ?? a.vehicleId}</div>
                    )}
                    <div className="mt-0.5 truncate text-sm text-zinc-300">{a.message}</div>
                    <div className="mt-1 font-mono text-[10px] text-zinc-600 md:text-xs">
                      {new Date(a.raisedAt).toLocaleString()} · {a.type}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1.5">
                    <Badge variant={severityVariant(a.severity)}>{a.severity}</Badge>
                    <Badge variant="default">{a.source}</Badge>
                    {a.acknowledged === true ? (
                      <span className="text-[10px] text-zinc-500">Acknowledged</span>
                    ) : null}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
