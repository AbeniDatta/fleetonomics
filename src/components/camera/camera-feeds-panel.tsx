"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { DataSourcePill } from "@/components/ui/data-source-pill";
import { CameraLivePlayer } from "@/components/camera/camera-live-player";
import {
  ADAS_CAMERA_CHANNEL,
  cameraLabel,
  channelForRole,
  DMS_CAMERA_CHANNEL,
  type CameraRole,
} from "@/lib/uctracking/camera-channels";
import type { CameraRecordingRow } from "@/lib/camera-recordings/types";
import type { CameraFeedVehicle } from "@/lib/api/fleet-handlers";

type VehiclesResponse = { source: string; vehicles: CameraFeedVehicle[] };
type RecordingsResponse = {
  source: string;
  role: CameraRole;
  channel: number;
  recordings: CameraRecordingRow[];
};

async function fetchVehicles(): Promise<VehiclesResponse> {
  const res = await fetch("/api/fleet/camera-feeds/vehicles");
  if (!res.ok) throw new Error("vehicles");
  return res.json();
}

async function fetchRecordings(role: CameraRole, sync: boolean): Promise<RecordingsResponse> {
  const qs = new URLSearchParams({ role, hours: "168" });
  if (sync) qs.set("sync", "true");
  const res = await fetch(`/api/fleet/camera-recordings?${qs}`);
  if (!res.ok) throw new Error("recordings");
  return res.json();
}

type Props = {
  role: CameraRole;
  title: string;
  description: string;
};

export function CameraFeedsPanel({ role, title, description }: Props) {
  const channel = channelForRole(role);
  const [search, setSearch] = useState("");
  const [selectedPlate, setSelectedPlate] = useState<string | null>(null);

  const vehiclesQ = useQuery({
    queryKey: ["camera-feed-vehicles"],
    queryFn: fetchVehicles,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });

  const recordingsQ = useQuery({
    queryKey: ["camera-recordings", role],
    queryFn: () => fetchRecordings(role, true),
    staleTime: 60_000,
    refetchInterval: 5 * 60_000,
  });

  const vehicles = vehiclesQ.data?.vehicles ?? [];
  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return vehicles;
    return vehicles.filter(
      (v) =>
        v.plate.toLowerCase().includes(q) ||
        v.devIdno.toLowerCase().includes(q) ||
        (v.driverName ?? "").toLowerCase().includes(q),
    );
  }, [vehicles, search]);

  const recordings = recordingsQ.data?.recordings ?? [];
  const recordingsForPlate = useMemo(() => {
    if (!selectedPlate) return recordings.slice(0, 30);
    return recordings.filter((r) => r.plate === selectedPlate).slice(0, 30);
  }, [recordings, selectedPlate]);

  const cameraName = role === "DMS" ? "Camera 1 (DMS)" : "Camera 2 (ADAS)";
  const channelIndex = role === "DMS" ? DMS_CAMERA_CHANNEL : ADAS_CAMERA_CHANNEL;

  return (
    <div className="space-y-4 md:space-y-6">
      <Card>
        <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Video className="h-5 w-5 text-sky-400" />
              {title}
            </CardTitle>
            <p className="mt-1 text-sm text-zinc-400">{description}</p>
            <p className="mt-1 text-xs text-zinc-500">
              Live via uctracking <code className="text-sky-400">realTimeVideo</code> + HLS (
              {cameraLabel(channelIndex)} / CHN={channel})
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <DataSourcePill source={vehiclesQ.data?.source} />
            <DataSourcePill source={recordingsQ.data?.source} uctrackingLabel="stored" />
            {recordingsQ.isFetching ? <span className="text-xs text-zinc-500">Syncing recordings…</span> : null}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input
            placeholder="Filter by plate, device id, driver…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md bg-vms-inset"
          />

          {vehiclesQ.isLoading ? (
            <p className="py-8 text-center text-sm text-zinc-500">Loading vehicles with cameras…</p>
          ) : filtered.length === 0 ? (
            <p className="py-8 text-center text-sm text-zinc-500">
              No vehicles with a device id. Check uctracking vehicle list / device install.
            </p>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
              {filtered.map((v) => (
                <div key={v.devIdno} className="space-y-1">
                  <CameraLivePlayer
                    devIdno={v.devIdno}
                    channel={channel}
                    plate={v.plate}
                    online={v.online}
                    compact
                  />
                  <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-500">
                    <span>{cameraName}</span>
                    {v.driverName ? <span>· {v.driverName}</span> : null}
                    <Badge variant={v.online ? "success" : "default"}>{v.online ? "Online" : "Offline"}</Badge>
                    <button
                      type="button"
                      className="text-sky-400 underline hover:text-sky-300"
                      onClick={() => setSelectedPlate((p) => (p === v.plate ? null : v.plate))}
                    >
                      {selectedPlate === v.plate ? "Clear filter" : "Filter recordings"}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Stored recordings ({cameraName})</CardTitle>
          <p className="text-sm text-zinc-400">
            Pulled from uctracking <code className="text-sky-400">getVideoFileInfo</code> and saved locally.
            {selectedPlate ? ` Showing ${selectedPlate} only.` : " Click a vehicle above to filter."}
          </p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {recordingsQ.isLoading ? (
            <p className="py-6 text-center text-zinc-500">Loading recordings…</p>
          ) : recordingsForPlate.length === 0 ? (
            <p className="py-6 text-center text-zinc-500">
              No recordings stored yet. Devices must be online for the vendor to return file lists.
            </p>
          ) : (
            recordingsForPlate.map((r) => (
              <div key={r.id} className="flex flex-wrap items-center justify-between gap-2 rounded-md bg-vms-inset px-3 py-2">
                <div>
                  <div className="font-medium text-zinc-100">{r.plate}</div>
                  <div className="text-xs text-zinc-500">{r.fileName ?? r.playbackPath ?? "Recording segment"}</div>
                </div>
                <div className="text-right text-xs text-zinc-400">
                  <div>{new Date(r.beginAt).toLocaleString()}</div>
                  {r.durationSec != null ? <div>{r.durationSec}s</div> : null}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
