"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { useEffect, useMemo, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Fuel, Gauge, MapPin, Radio, User } from "lucide-react";
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
  const normalizeCoord = (n: number | null) => {
    if (n == null || !Number.isFinite(n)) return null;
    if (Math.abs(n) > 180) {
      const d6 = n / 1_000_000;
      if (Math.abs(d6) <= 180) return d6;
      const d5 = n / 100_000;
      if (Math.abs(d5) <= 180) return d5;
    }
    return n;
  };
  const latRaw = row ? toNum(row.wd ?? row.lat ?? row.latitude) : vehicle.position?.lat ?? null;
  const lngRaw = row ? toNum(row.jd ?? row.lng ?? row.longitude) : vehicle.position?.lng ?? null;
  const lat = normalizeCoord(latRaw);
  const lng = normalizeCoord(lngRaw);
  const fuelLiters = (() => {
    if (!row) return null;
    const yl = toNum(row.yl ?? row.YL ?? row.youLiang);
    if (yl != null) return yl / 100;
    const oilL = toNum(row.oilL ?? row.fuelL);
    if (oilL != null) return oilL;
    const oil = toNum(row.oil ?? row.fuel);
    if (oil != null) {
      if (oil > 500) return oil / 100;
      if (oil <= 100) return null;
      return oil;
    }
    return null;
  })();
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

function statusBadgeClass(status: string) {
  if (status === "Offline") return "bg-violet-500/20 text-violet-200 ring-violet-500/40";
  if (status === "Parking" || status === "Idle") return "bg-amber-500/20 text-amber-100 ring-amber-500/40";
  if (status === "Moving") return "bg-emerald-500/20 text-emerald-100 ring-emerald-500/40";
  return "bg-sky-500/20 text-sky-100 ring-sky-500/40";
}

function DetailRow({ label, value, mono }: { label: string; value: ReactNode; mono?: boolean }) {
  return (
    <div className="border-b border-zinc-800/80 py-3.5 last:border-0">
      <dt className="text-xs font-medium uppercase tracking-wide text-zinc-500">{label}</dt>
      <dd className={cn("mt-1 break-words text-sm text-zinc-100", mono && "font-mono text-[0.8125rem] tabular-nums")}>
        {value}
      </dd>
    </div>
  );
}

function DetailSection({ title, icon: Icon, children }: { title: string; icon: typeof MapPin; children: ReactNode }) {
  return (
    <section className="border-b border-zinc-800/80 last:border-0">
      <h3 className="flex items-center gap-2 px-4 py-3 text-xs font-semibold uppercase tracking-wide text-zinc-400">
        <Icon className="h-3.5 w-3.5 text-nlng-amber" aria-hidden />
        {title}
      </h3>
      <dl className="px-4 pb-1">{children}</dl>
    </section>
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
    return <div className="text-base text-zinc-400">Loading vehicle…</div>;
  }
  if (detailQ.error || !vehicle || !live) {
    return (
      <div className="space-y-4">
        <Button variant="secondary" size="sm" asChild>
          <Link href="/vehicles">← Back to vehicles</Link>
        </Button>
        <div className="text-base text-red-400">Vehicle not found.</div>
      </div>
    );
  }

  const headerStatus =
    vehicle.status === "parked" || vehicle.status === "idle"
      ? "Parked"
      : vehicle.status === "offline" || live.online === false
        ? "Offline"
        : live.speedKmh != null && live.speedKmh > 0
          ? "Moving"
          : "Online";

  const coordinates =
    live.lat != null && live.lng != null
      ? `${live.lat.toFixed(6)}, ${live.lng.toFixed(6)}`
      : null;

  const fuelDisplay =
    live.fuelLiters != null
      ? `${live.fuelLiters.toLocaleString(undefined, { maximumFractionDigits: 1 })} L`
      : vehicle.fuelPercent != null
        ? `${vehicle.fuelPercent}% (level only)`
        : "—";

  const speedDisplay =
    live.speedKmh != null ? `${Math.round(live.speedKmh)} km/h` : live.online === false ? "—" : "0 km/h";

  const mileageDisplay =
    live.mileageTodayKm != null
      ? `${live.mileageTodayKm.toLocaleString(undefined, { maximumFractionDigits: 1 })} km`
      : "—";

  const deviceDisplay = live.devIdno ?? "—";
  const connectionLabel =
    live.online === false ? "Disconnected" : live.online === true ? "Connected" : "Unknown";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-3">
        <Button variant="secondary" size="sm" className="md:h-11 md:px-4" asChild>
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

        <aside className="flex w-full shrink-0 flex-col border-t border-vms-border bg-[#16181d] lg:w-[min(100%,400px)] lg:max-w-[420px] lg:border-l lg:border-t-0">
          <div className="border-b border-zinc-800 bg-gradient-to-r from-[#1a2332] to-[#16181d] px-4 py-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div className="min-w-0">
                <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">Vehicle</p>
                <h2 className="truncate text-lg font-semibold text-zinc-50">{vehicle.plate}</h2>
              </div>
              <span
                className={cn(
                  "shrink-0 rounded-full px-2.5 py-0.5 text-xs font-semibold ring-1 ring-inset",
                  statusBadgeClass(headerStatus),
                )}
              >
                {headerStatus}
              </span>
            </div>
            <p className="mt-2 font-mono text-xs text-zinc-500">
              Device <span className="text-zinc-300">{deviceDisplay}</span>
            </p>
          </div>

          <div className="max-h-[min(60vh,560px)] overflow-y-auto lg:max-h-none lg:flex-1">
            <DetailSection title="Location" icon={MapPin}>
              <DetailRow label="Coordinates" value={coordinates ?? "—"} mono />
              <DetailRow label="Address" value={live.address ?? vehicle.locationLabel ?? "—"} />
              <DetailRow label="Heading" value={headingLabel(live.headingDeg)} />
            </DetailSection>

            <DetailSection title="Telemetry" icon={Radio}>
              <DetailRow label="Last GPS fix" value={formatGpsTime(live.gpsTime)} />
              <DetailRow label="Current speed" value={speedDisplay} />
              <DetailRow label="Connection" value={connectionLabel} />
              <DetailRow label="Vehicle status" value={live.statusLabel ?? headerStatus} />
            </DetailSection>

            <DetailSection title="Fuel & distance" icon={Fuel}>
              <DetailRow label="Current fuel volume" value={fuelDisplay} />
              <DetailRow label="Distance today" value={mileageDisplay} />
            </DetailSection>

            <DetailSection title="Assignment" icon={User}>
              <DetailRow label="Team" value={live.teamName ?? "—"} />
              <DetailRow label="Driver" value={live.driver ?? vehicle.driverName ?? "—"} />
            </DetailSection>

            <DetailSection title="Device" icon={Gauge}>
              <DetailRow label="Device number" value={deviceDisplay} mono />
              <DetailRow label="Plate number" value={vehicle.plate} mono />
            </DetailSection>
          </div>
        </aside>
      </div>
    </div>
  );
}
