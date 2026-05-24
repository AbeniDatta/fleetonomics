"use client";

import { useQuery } from "@tanstack/react-query";
import type { FleetFooter } from "@/lib/uctracking/schemas";
import { DataSourcePill } from "@/components/ui/data-source-pill";

async function fetchFooter(): Promise<{ source: string; data: FleetFooter }> {
  const res = await fetch("/api/fleet/footer");
  if (!res.ok) throw new Error("footer");
  return res.json();
}

export function FooterBar() {
  const { data } = useQuery({ queryKey: ["fleet-footer"], queryFn: fetchFooter });
  const f = data?.data;
  return (
    <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-vms-border bg-vms-elevated px-5 py-3 text-xs text-zinc-400 md:px-10 md:text-sm">
      <span>Last sync: {f ? `${f.lastSyncSecondsAgo}s ago` : "—"}</span>
      <span className="min-w-0 flex-1 text-center leading-snug">
        {f ? (
          <>
            GPS online: {f.gpsOnline.toLocaleString()} &nbsp;|&nbsp; OBD: {f.obdOnline.toLocaleString()} &nbsp;|&nbsp; Fuel sensor:{" "}
            {f.fuelSensorOnline.toLocaleString()} &nbsp;|&nbsp; DMS: {f.dmsOnline.toLocaleString()} &nbsp;|&nbsp; TPMS:{" "}
            {f.tpmsOnline.toLocaleString()}
          </>
        ) : (
          "Loading telemetry summary…"
        )}
      </span>
      <span className="flex items-center gap-2">
        <DataSourcePill source={data?.source} />
        <span>Fleetonomics VMS · v{f?.version ?? "—"}</span>
      </span>
    </footer>
  );
}
