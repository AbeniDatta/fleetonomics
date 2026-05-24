"use client";

import { MapContainer, CircleMarker, TileLayer, Tooltip } from "react-leaflet";
import "leaflet/dist/leaflet.css";

type Pt = { lat: number; lng: number; plate?: string; status?: string };

// Nigeria-wide view for dashboard mini map.
const center: [number, number] = [9.08, 8.675];

function statusColor(status: string | undefined) {
  switch (status) {
    case "moving":
    case "active":
      return "#22c55e"; // online
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

export function MiniFleetMap({ points }: { points: Pt[] }) {
  return (
    <div className="relative h-[220px] w-full overflow-hidden rounded-lg bg-vms-inset md:h-[280px] lg:h-[300px]">
      <MapContainer center={center} zoom={6} className="h-full w-full" scrollWheelZoom={false} dragging={false} doubleClickZoom={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap" />
        {points.map((p, i) => (
          <CircleMarker
            key={`${p.plate ?? "p"}-${i}`}
            center={[p.lat, p.lng]}
            radius={7}
            pathOptions={{ color: "#18181b", weight: 1, fillColor: statusColor(p.status), fillOpacity: 0.95 }}
          >
            <Tooltip direction="top" sticky>
              {p.plate ?? "Vehicle"} {p.status ? `· ${p.status}` : ""}
            </Tooltip>
          </CircleMarker>
        ))}
      </MapContainer>
    </div>
  );
}

