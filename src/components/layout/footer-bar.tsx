"use client";

import { useQuery } from "@tanstack/react-query";
import type { FleetFooter } from "@/lib/uctracking/schemas";

async function fetchFooter(): Promise<{ source: string; data: FleetFooter }> {
  const res = await fetch("/api/fleet/footer");
  if (!res.ok) throw new Error("footer");
  return res.json();
}

export function FooterBar() {
  const { data } = useQuery({
    queryKey: ["fleet-footer"],
    queryFn: fetchFooter,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
  const f = data?.data;

  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-vms-border bg-vms-elevated px-5 py-3 text-xs text-zinc-400 md:px-10 md:text-sm">
      <span className="text-zinc-500">
        © Nigeria LNG · <span className="text-zinc-300">Fleetonomics</span>
      </span>
      <span className="min-w-0 flex-1 text-center leading-snug text-zinc-400">
        {f ? (
          <>
            <span className="text-zinc-300">{f.fleetCount.toLocaleString()}</span> vehicles
            <span className="mx-2 text-zinc-600">·</span>
            <span className="text-zinc-300">{f.onlineCount.toLocaleString()}</span> online
            <span className="mx-2 text-zinc-600">·</span>
            <span className="text-zinc-300">{f.fuelReportingCount.toLocaleString()}</span> reporting fuel
            <span className="mx-2 text-zinc-600">·</span>
            <span className="text-zinc-300">{f.movingCount.toLocaleString()}</span> in motion
          </>
        ) : (
          "Loading fleet status…"
        )}
      </span>
      <span className="tabular-nums text-zinc-500">
        {f ? (
          <>
            {f.integrationLabel}
            <span className="mx-2 text-zinc-600">·</span>v{f.version}
          </>
        ) : (
          "—"
        )}
      </span>
    </footer>
  );
}
