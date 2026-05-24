"use client";

import { useEffect, useMemo } from "react";
import Link from "next/link";
import { CircleMarker, MapContainer, TileLayer, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { Vehicle, VehicleStatus } from "@/lib/uctracking/schemas";
const FALLBACK_CENTER: [number, number] = [9.08, 8.675];

function statusColor(status: VehicleStatus | undefined) {
  switch (status) {
    case "moving":
    case "active":
      return "#22c55e";
    case "idle":
    case "parked":
      return "#fbbf24";
    case "offline":
      return "#a78bfa";
    case "alert":
    case "breach":
      return "#ef4444";
    default:
      return "#71717a";
  }
}

function headerStatusLabel(v: Vehicle): string {
  if (v.status === "parked" || v.status === "idle") return "Parking";
  if (v.status === "offline") return "Offline";
  if (v.speedKmh != null && v.speedKmh > 0) return "Moving";
  return "Active";
}

function fuelLabel(v: Vehicle): string {
  if (v.fuelPercent != null) return `${v.fuelPercent}%`;
  return "—";
}

function FitToMarkers({ latlngs }: { latlngs: [number, number][] }) {
  const map = useMap();
  useEffect(() => {
    if (latlngs.length === 0) return;
    if (latlngs.length === 1) {
      map.setView(latlngs[0], 12);
      return;
    }
    map.fitBounds(L.latLngBounds(latlngs), { padding: [40, 40], maxZoom: 14 });
  }, [map, latlngs]);
  return null;
}

export function DashboardFleetMap({ vehicles }: { vehicles: Vehicle[] }) {
  const plotted = useMemo(
    () => vehicles.filter((v): v is Vehicle & { position: { lat: number; lng: number } } => !!v.position),
    [vehicles],
  );

  const latlngs = useMemo(() => plotted.map((v) => [v.position.lat, v.position.lng] as [number, number]), [plotted]);

  const center = latlngs[0] ?? FALLBACK_CENTER;

  if (plotted.length === 0) {
    return (
      <div className="flex h-[min(52vh,560px)] min-h-[320px] w-full items-center justify-center rounded-lg border border-dashed border-zinc-600 bg-vms-inset text-sm text-zinc-400">
        No vehicles with a current GPS position.
      </div>
    );
  }

  return (
    <div className="relative h-[min(52vh,560px)] min-h-[320px] w-full overflow-hidden rounded-lg bg-vms-inset">
      <MapContainer center={center} zoom={6} className="h-full w-full" scrollWheelZoom>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        <FitToMarkers latlngs={latlngs} />
        {plotted.map((v) => (
          <CircleMarker
            key={v.id}
            center={[v.position.lat, v.position.lng]}
            radius={8}
            pathOptions={{ color: "#18181b", weight: 1, fillColor: statusColor(v.status), fillOpacity: 0.95 }}
          >
            <Tooltip
              direction="top"
              offset={[0, -8]}
              opacity={1}
              sticky
              interactive
              className="!rounded-lg !border-0 !bg-transparent !p-0 !shadow-none"
            >
              <div className="w-[min(18rem,calc(100vw-2rem))] overflow-hidden rounded-lg border border-zinc-600 bg-zinc-950 text-left text-zinc-100 shadow-2xl">
                <div className="flex items-center justify-between bg-[#f58220] px-3 py-2 text-xs font-semibold text-zinc-950">
                  <span>
                    {v.plate}[{headerStatusLabel(v)}]
                  </span>
                </div>
                <div className="grid gap-2 p-3 text-[11px] leading-snug sm:grid-cols-2 sm:text-xs">
                  <div>
                    <div className="font-medium text-sky-400">Driver</div>
                    <div className="text-zinc-200">{v.driverName ?? "—"}</div>
                  </div>
                  <div>
                    <div className="font-medium text-sky-400">Drive Speed</div>
                    <div className="text-zinc-200">{v.speedKmh != null ? `${Math.round(v.speedKmh)} km/h` : "—"}</div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="font-medium text-sky-400">Vehi Loc</div>
                    <div className="break-words text-zinc-200">
                      {v.locationLabel ??
                        `${v.position.lat.toFixed(5)}, ${v.position.lng.toFixed(5)}`}
                    </div>
                  </div>
                  <div>
                    <div className="font-medium text-sky-400">Fuel Volume Data</div>
                    <div className="text-zinc-200">{fuelLabel(v)}</div>
                  </div>
                  <div>
                    <div className="font-medium text-sky-400">Score</div>
                    <div className="text-zinc-200">{v.driverScore ?? "—"}</div>
                  </div>
                  {v.alarmSummary ? (
                    <div className="sm:col-span-2">
                      <div className="font-medium text-sky-400">Alarm</div>
                      <div className="text-amber-300">{v.alarmSummary}</div>
                    </div>
                  ) : null}
                </div>
                <div className="border-t border-zinc-800 px-3 py-2">
                  <Link
                    href={`/vehicles/${encodeURIComponent(v.plate)}`}
                    className="text-xs font-medium text-sky-400 hover:underline"
                    onClick={(e) => e.stopPropagation()}
                  >
                    View details →
                  </Link>
                </div>
              </div>
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}
