"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Vehicle } from "@/lib/uctracking/schemas";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

function relativeTime(iso?: string | null) {
  if (!iso) return null;
  const t = new Date(iso).valueOf();
  if (Number.isNaN(t)) return null;
  const ms = Date.now() - t;
  if (ms < 0) return "now";
  const min = Math.floor(ms / 60000);
  if (min < 1) return "just now";
  const hr = Math.floor(min / 60);
  const day = Math.floor(hr / 24);
  if (day > 0) return `${day}d ${hr % 24}h ago`;
  if (hr > 0) return `${hr}h ${min % 60}m ago`;
  return `${min}m ago`;
}

async function fetchVehicles(): Promise<{ data: Vehicle[] }> {
  const res = await fetch("/api/fleet/vehicles");
  if (!res.ok) throw new Error("vehicles");
  const body = await res.json();
  return { data: body.data ?? [] };
}

export function VehicleList() {
  const [q, setQ] = useState("");
  const { data } = useQuery({ queryKey: ["fleet-vehicles"], queryFn: fetchVehicles });

  const filtered = useMemo(() => {
    const rows = data?.data ?? [];
    const s = q.trim().toLowerCase();
    if (!s) return rows;
    return rows.filter(
      (v) =>
        v.plate.toLowerCase().includes(s) ||
        (v.driverName ?? "").toLowerCase().includes(s) ||
        (v.locationLabel ?? "").toLowerCase().includes(s),
    );
  }, [data, q]);

  return (
    <div className="space-y-4 md:space-y-5">
      <div className="flex flex-wrap gap-3">
        <Input
          className="max-w-xl flex-1 md:min-h-[44px]"
          placeholder="Search plate / driver / location…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
        <Button variant="secondary" size="sm" className="md:h-11 md:px-4 md:text-base">
          Filters
        </Button>
        <Button size="sm" className="bg-nlng-amber text-white hover:bg-nlng-amber/90 md:h-11 md:px-4 md:text-base">
          + Add vehicle
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All vehicles</CardTitle>
          <span className="text-sm text-zinc-400 md:text-base">{filtered.length} shown</span>
        </CardHeader>
        <CardContent className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm md:text-base">
            <thead className="text-xs font-semibold uppercase tracking-wide text-zinc-500 md:text-sm">
              <tr>
                <th className="border-b border-vms-border py-3">Plate</th>
                <th className="border-b border-vms-border py-3">Driver</th>
                <th className="border-b border-vms-border py-3">Location</th>
                <th className="border-b border-vms-border py-3">Status</th>
                <th className="border-b border-vms-border py-3">Speed</th>
                <th className="border-b border-vms-border py-3">Fuel</th>
                <th className="border-b border-vms-border py-3">Score</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((v) => (
                <tr key={v.id} className="hover:bg-vms-inset">
                  <td className="border-b border-vms-border py-3">
                    <Link className="font-semibold text-sky-400 hover:underline" href={`/vehicles/${encodeURIComponent(v.plate)}`}>
                      {v.plate}
                    </Link>
                  </td>
                  <td className="border-b border-vms-border py-3 text-zinc-200">{v.driverName}</td>
                  <td className="border-b border-vms-border py-3 text-zinc-400">{v.locationLabel}</td>
                  <td className="border-b border-vms-border py-3">
                    <Badge
                      variant={
                        v.status === "offline"
                          ? "purple"
                          : v.status === "breach" || v.status === "alert"
                            ? "danger"
                            : v.status === "parked" || v.status === "idle"
                              ? "warn"
                              : "success"
                      }
                    >
                      {v.status}
                    </Badge>
                    {v.status === "offline" ? (
                      <div className="mt-1 text-xs text-zinc-500 md:text-sm">{relativeTime(v.lastSeenAt) ?? "—"}</div>
                    ) : null}
                  </td>
                  <td className={cn("border-b border-vms-border py-3", v.speedKmh && v.speedKmh > 90 && "font-semibold text-red-400")}>
                    {v.speedKmh != null ? `${v.speedKmh} km/h` : "—"}
                  </td>
                  <td className={cn("border-b border-vms-border py-3", v.fuelPercent != null && v.fuelPercent < 30 && "text-red-400")}>
                    {v.fuelPercent != null ? `${v.fuelPercent}%` : "—"}
                  </td>
                  <td className="border-b border-vms-border py-3 font-semibold text-zinc-100">{v.driverScore ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
