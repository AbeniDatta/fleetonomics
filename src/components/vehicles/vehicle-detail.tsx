"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Layers, Settings } from "lucide-react";
import type { Position, Vehicle } from "@/lib/uctracking/schemas";
import { Button } from "@/components/ui/button";
import { DataSourcePill } from "@/components/ui/data-source-pill";
import { cn } from "@/lib/utils";

const FleetMapInner = dynamic(() => import("@/components/maps/fleet-map-inner").then((m) => m.FleetMapInner), {
  ssr: false,
  loading: () => <div className="h-[min(72vh,720px)] w-full animate-pulse rounded-xl bg-vms-inset" />,
});

type DetailResponse = {
  vehicle: Vehicle;
  gpsStatus?: { source: string; data: unknown } | null;
};

type LiveStatus = {
  plate: string;
  devIdno?: string | null;
  teamName?: string | null;
  driver?: string | null;
  speedKmh?: number | null;
  headingDeg?: number | null;
  online?: boolean | null;
  gpsTime?: string | null;
  address?: string | null;
  lat?: number | null;
  lng?: number | null;
  fuelLiters?: number | null;
  mileageTodayKm?: number | null;
  statusLabel?: string | null;
  raw?: Record<string, unknown>;
};

function isRec(v: unknown): v is Record<string, unknown> {
  return typeof v === "object" && v !== null;
}

function pickFirstRow(raw: unknown): Record<string, unknown> | null {
  if (Array.isArray(raw)) return (isRec(raw[0]) ? raw[0] : null) ?? null;
  if (!isRec(raw)) return null;
  const candidate = (raw.infos ?? raw.data ?? raw.rows ?? raw.items) as unknown;
  if (Array.isArray(candidate)) return isRec(candidate[0]) ? candidate[0] : null;
  return raw;
}

function toNum(v: unknown): number | null {
  const n = typeof v === "number" ? v : typeof v === "string" ? Number(v) : NaN;
  return Number.isFinite(n) ? n : null;
}

function toBool(v: unknown): boolean | null {
  if (typeof v === "boolean") return v;
  if (typeof v === "number") return v !== 0;
  if (typeof v === "string") {
    const s = v.toLowerCase().trim();
    if (["1", "true", "yes", "online"].includes(s)) return true;
    if (["0", "false", "no", "offline"].includes(s)) return false;
  }
  return null;
}

function toIsoMaybe(v: unknown): string | null {
  if (v == null) return null;
  if (typeof v === "string") {
    const s = v.trim();
    if (!s) return null;
    const d = new Date(s);
    if (!Number.isNaN(d.valueOf())) return d.toISOString();
    const d2 = new Date(s.replace(" ", "T"));
    if (!Number.isNaN(d2.valueOf())) return d2.toISOString();
    return s;
  }
  if (typeof v === "number") {
    const d = new Date(v > 10_000_000_000 ? v : v * 1000);
    return !Number.isNaN(d.valueOf()) ? d.toISOString() : null;
  }
  return null;
}

function formatGpsTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.valueOf())) return iso;
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

function headingLabel(deg: number | null | undefined): string {
  if (deg == null || !Number.isFinite(deg)) return "—";
  const d = Math.round(((deg % 360) + 360) % 360);
  const dirs = ["North", "North-East", "East", "South-East", "South", "South-West", "West", "North-West"];
  const idx = Math.round(d / 45) % 8;
  return `${dirs[idx]}(${d})`;
}

function buildStatusString(row: Record<string, unknown> | null, vehicle: Vehicle, online: boolean | null): string {
  const parts: string[] = [];
  if (online === false || vehicle.status === "offline") parts.push("Offline");
  else if (online === true) parts.push("Online");
  else parts.push(vehicle.status === "parked" ? "Parking" : vehicle.status === "moving" ? "Moving" : "Active");

  const net = row?.net ?? row?.network ?? row?.g4 ?? row?.signal;
  if (net != null && String(net).trim()) parts.push(String(net).includes("4") ? "4G" : String(net));

  const acc = row?.acc ?? row?.accStatus ?? row?.accOn;
  if (acc != null) {
    const on = toBool(acc);
    if (on === true) parts.push("ACC On");
    else if (on === false) parts.push("ACC Off");
  }

  const park = row?.parkTime ?? row?.parkingTime ?? row?.parkDuration;
  if (park != null && String(park).trim()) parts.push(`Parking(${park})`);
  else if (vehicle.status === "parked" || vehicle.status === "idle") parts.push("Parking");

  const sats = row?.sn ?? row?.satellite ?? row?.satellites ?? row?.gpsCount;
  if (sats != null) parts.push(`Number Of Satellites(${sats})`);

  const signal = row?.signal ?? row?.signalLevel ?? row?.networkSignal;
  if (signal != null && String(signal).trim()) {
    const s = String(signal);
    parts.push(s.toLowerCase().includes("good") ? "Network Signal Good" : `Network Signal ${s}`);
  } else if (online) {
    parts.push("Network Signal Good");
  }

  return parts.join(", ");
}

function extractLiveStatus(plate: string, vehicle: Vehicle, gpsStatus: DetailResponse["gpsStatus"]): LiveStatus {
  const row = pickFirstRow(gpsStatus?.data ?? null);
  const devIdno = row
    ? (row.devIdno ?? row.devIDNO ?? row.DevIDNO ?? row.deviceId ?? row.did)
    : vehicle.devIdno;
  const teamName = row
    ? (row.pn ?? row.team ?? row.fleet ?? row.companyName ?? row.orgName ?? row.depName)
    : null;
  const driver = row ? (row.driverName ?? row.driver ?? row.dn) : vehicle.driverName;
  const speed = row ? toNum(row.sp ?? row.speed ?? row.speedKmh) : vehicle.speedKmh;
  const heading = row ? toNum(row.c ?? row.course ?? row.heading) : vehicle.heading;
  const online = row ? toBool(row.ol ?? row.online ?? row.isOnline) : vehicle.status !== "offline";
  const gpsTime = row ? toIsoMaybe(row.tm ?? row.gpsTime ?? row.time) : vehicle.lastSeenAt;
  const address = row ? (row.address ?? row.ga ?? row.geoAddress) : vehicle.locationLabel;
  const lat = row ? toNum(row.wd ?? row.lat ?? row.latitude) : vehicle.position?.lat;
  const lng = row ? toNum(row.jd ?? row.lng ?? row.longitude) : vehicle.position?.lng;
  const fuelLiters = row
    ? toNum(row.oil ?? row.fuel ?? row.fuelL ?? row.oilL ?? row.youLiang)
    : vehicle.fuelPercent != null
      ? Math.round((vehicle.fuelPercent / 100) * 100)
      : null;
  const mileageTodayKm = row
    ? toNum(row.lc ?? row.todayMile ?? row.mileage ?? row.todayLicheng ?? row.dkm)
    : null;

  return {
    plate,
    devIdno: typeof devIdno === "string" ? devIdno : typeof devIdno === "number" ? String(devIdno) : vehicle.devIdno ?? null,
    teamName: typeof teamName === "string" ? teamName : typeof teamName === "number" ? String(teamName) : null,
    driver: typeof driver === "string" ? driver : typeof driver === "number" ? String(driver) : null,
    speedKmh: speed,
    headingDeg: heading,
    online,
    gpsTime,
    address: typeof address === "string" ? address : null,
    lat,
    lng,
    fuelLiters,
    mileageTodayKm,
    statusLabel: buildStatusString(row, vehicle, online),
    raw: row ?? undefined,
  };
}

async function fetchDetail(plate: string): Promise<DetailResponse> {
  const res = await fetch(`/api/fleet/vehicles/${encodeURIComponent(plate)}`);
  if (!res.ok) throw new Error("detail");
  return res.json();
}

async function fetchPositions(): Promise<Position[]> {
  const res = await fetch("/api/fleet/positions");
  if (!res.ok) return [];
  return res.json();
}

function InfoRow({ label, value, className }: { label: string; value: ReactNode; className?: string }) {
  return (
    <div className={cn("space-y-0.5", className)}>
      <div className="text-sm font-medium text-sky-600 md:text-[0.9375rem]">{label}</div>
      <div className="break-words text-sm text-zinc-900 md:text-[0.9375rem]">{value}</div>
    </div>
  );
}

export function VehicleDetail({ plate }: { plate: string }) {
  const detailQ = useQuery({
    queryKey: ["vehicle", plate],
    queryFn: () => fetchDetail(plate),
    refetchInterval: 30_000,
  });

  const positionsQ = useQuery({
    queryKey: ["fleet-positions"],
    queryFn: fetchPositions,
    refetchInterval: 15_000,
    staleTime: 5_000,
  });

  const vehicle = detailQ.data?.vehicle;
  const live = useMemo(() => {
    if (!vehicle) return null;
    return extractLiveStatus(vehicle.plate, vehicle, detailQ.data?.gpsStatus ?? null);
  }, [vehicle, detailQ.data?.gpsStatus]);

  const mapPositions = useMemo(() => {
    const all = positionsQ.data ?? [];
    const p = plate.toLowerCase();
    const filtered = all.filter(
      (pos) => pos.plate?.toLowerCase() === p || pos.vehicleId.toLowerCase() === p || pos.vehicleId === vehicle?.id,
    );
    if (filtered.length > 0) return filtered;
    if (live?.lat != null && live?.lng != null && vehicle) {
      return [
        {
          vehicleId: vehicle.id,
          plate: vehicle.plate,
          lat: live.lat,
          lng: live.lng,
          speedKmh: live.speedKmh,
          heading: live.headingDeg,
          recordedAt: live.gpsTime ?? new Date().toISOString(),
          status: vehicle.status,
        } satisfies Position,
      ];
    }
    return [];
  }, [positionsQ.data, plate, vehicle, live]);

  useEffect(() => {
    if (vehicle?.plate) {
      document.title = `${vehicle.plate} — Fleetonomics`;
    }
  }, [vehicle?.plate]);

  if (detailQ.isLoading) {
    return <div className="text-base text-zinc-400 md:text-lg">Loading vehicle…</div>;
  }
  if (detailQ.error || !vehicle || !live) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" size="sm" asChild>
          <Link href="/vehicles">← Back to vehicles</Link>
        </Button>
        <div className="text-base text-red-400 md:text-lg">Vehicle not found.</div>
      </div>
    );
  }

  const headerStatus =
    vehicle.status === "parked" || vehicle.status === "idle"
      ? "Parking"
      : vehicle.status === "offline"
        ? "Offline"
        : live.speedKmh != null && live.speedKmh > 0
          ? "Moving"
          : "Active";

  const headerId = live.devIdno ?? vehicle.plate;
  const loc =
    live.lat != null && live.lng != null
      ? `${live.lat.toFixed(6)}, ${live.lng.toFixed(6)}`
      : (live.address ?? vehicle.locationLabel ?? "—");

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" className="md:h-11 md:px-4 md:text-base" asChild>
          <Link href="/vehicles">
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back to vehicles
          </Link>
        </Button>
        <DataSourcePill source={detailQ.data?.gpsStatus?.source} uctrackingLabel="Live" />
      </div>

      <div className="flex min-h-[min(72vh,720px)] flex-col overflow-hidden rounded-xl border border-vms-border bg-vms-inset lg:flex-row">
        <div className="flex min-h-[min(42vh,360px)] min-w-0 flex-1 flex-col lg:min-h-[min(72vh,720px)]">
          <FleetMapInner
            compact
            hideGeofencingPanel
            className="flex flex-1 flex-col"
            mapAreaClassName="!h-full"
            positions={mapPositions}
            userMarkers={null}
          />
        </div>

        <aside className="flex w-full shrink-0 flex-col border-t border-vms-border bg-white shadow-[inset_0_1px_0_0_rgba(0,0,0,0.04)] lg:w-[min(100%,420px)] lg:max-w-[440px] lg:border-l lg:border-t-0">
          <div className="flex items-center justify-between bg-[#1e6eb8] px-4 py-2.5 text-white">
            <span className="font-semibold tracking-tight">
              {headerId}[{headerStatus}]
            </span>
            <div className="flex items-center gap-1">
              <button type="button" className="rounded p-1 hover:bg-white/10" aria-label="Layers">
                <Layers className="h-4 w-4" />
              </button>
              <button type="button" className="rounded p-1 hover:bg-white/10" aria-label="Settings">
                <Settings className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="max-h-[min(60vh,560px)] overflow-y-auto lg:max-h-none lg:flex-1">
            <div className="grid grid-cols-1 gap-4 p-4 text-sm sm:grid-cols-2 md:gap-5 md:p-5 md:text-[0.9375rem] lg:grid-cols-1">
              <div className="space-y-3.5">
                <InfoRow label="Team Name" value={live.teamName ?? "—"} />
                <InfoRow label="GPS Time" value={formatGpsTime(live.gpsTime)} />
                <InfoRow label="Driving Direction" value={headingLabel(live.headingDeg)} />
                <InfoRow
                  label="Fuel Volume Data"
                  value={
                    live.fuelLiters != null
                      ? `${live.fuelLiters.toFixed(1)} L`
                      : vehicle.fuelPercent != null
                        ? `${vehicle.fuelPercent}%`
                        : "—"
                  }
                />
                <InfoRow label="Vehi Status" value={live.statusLabel ?? "—"} />
                <InfoRow label="Vehi Loc" value={loc} />
              </div>
              <div className="space-y-3.5">
                <InfoRow
                  label="Drive Speed"
                  value={live.speedKmh != null ? `${Math.round(live.speedKmh)}KM / H` : "0KM / H"}
                />
                <InfoRow
                  label="Mileage Today"
                  value={live.mileageTodayKm != null ? `${live.mileageTodayKm.toFixed(1)}KM` : "—"}
                />
                <InfoRow
                  label="Device No"
                  value={`${live.devIdno ?? "—"}${live.online === false ? "(Offline)" : live.online === true ? "(Online)" : ""}`}
                />
                {live.driver || vehicle.driverName ? (
                  <InfoRow label="Driver" value={live.driver ?? vehicle.driverName ?? "—"} />
                ) : null}
                {live.address ? <InfoRow label="Address" value={live.address} /> : null}
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
