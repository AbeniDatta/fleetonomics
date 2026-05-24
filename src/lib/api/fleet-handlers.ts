import { UctrackingClient, getUctrackingConfigFromEnv, isUctrackingConfigured } from "@/lib/uctracking/client";
import {
  demoAlarms,
  demoBreath,
  demoCompliance,
  demoDrivers,
  demoFaults,
  demoFines,
  demoFooter,
  demoFuelEvents,
  demoFuelRows,
  demoIncidents,
  demoKpi,
  demoObd,
  demoParts,
  demoPositions,
  demoTpms,
  demoTripRequests,
  demoTrips,
  demoVehicles,
  demoWorkOrders,
  hourlyFuelSeries,
} from "@/lib/uctracking/demo-data";
import { alarmSchema, positionSchema, vehicleSchema } from "@/lib/uctracking/schemas";

export async function getVehiclesPayload() {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const rows = await client.listVehicles();
      // queryUserVehicle often lacks live status; enrich with current positions (single call)
      // so Vehicles page matches the vendor "monitor" list more closely.
      const posByPlate = new Map<
        string,
        { lat: number; lng: number; speedKmh: number | null; recordedAt: string; status?: "active" | "offline" }
      >();
      try {
        const posRows = await client.listPositions();
        const normalizeCoord = (n: number) => {
          if (Math.abs(n) > 180) {
            const d6 = n / 1_000_000;
            if (Math.abs(d6) <= 180) return d6;
            const d5 = n / 100_000;
            if (Math.abs(d5) <= 180) return d5;
          }
          return n;
        };
        for (const row of posRows) {
          const r = row as Record<string, unknown>;
          const plate = String(r.vi ?? r.nm ?? r.vehicleNo ?? r.vid ?? r.devIDNO ?? r.id ?? "");
          const latRaw = Number(r.wd ?? r.lat ?? r.latitude);
          const lngRaw = Number(r.jd ?? r.lng ?? r.longitude);
          const lat = normalizeCoord(latRaw);
          const lng = normalizeCoord(lngRaw);
          if (!plate || !Number.isFinite(lat) || !Number.isFinite(lng)) continue;
          const olRaw = r.ol ?? r.online ?? r.isOnline ?? r.olStatus;
          const olNum =
            typeof olRaw === "number"
              ? olRaw
              : typeof olRaw === "string" && olRaw.trim().length
                ? Number(olRaw)
                : undefined;
          const online =
            typeof olRaw === "boolean"
              ? olRaw
              : typeof olNum === "number" && Number.isFinite(olNum)
                ? olNum !== 0
                : typeof olRaw === "string"
                  ? ["1", "true", "online", "yes"].includes(olRaw.toLowerCase())
                  : undefined;
          posByPlate.set(plate, {
            lat,
            lng,
            speedKmh: typeof r.sp === "number" ? (r.sp as number) : typeof r.speed === "number" ? (r.speed as number) : null,
            recordedAt: toIsoFromUnknown(r.tm ?? r.gpsTime ?? r.time ?? r.gpsTimeStr),
            status: online === false ? "offline" : online === true ? "active" : undefined,
          });
        }
      } catch {
        // ignore enrichment failures; we'll fall back to raw vehicle payload
      }
      const data = rows.map((row, i) => {
        const r = row as Record<string, unknown>;
        const plate = String(r.nm ?? r.plate ?? r.registration ?? r.name ?? `VEH-${i}`);
        const pos = posByPlate.get(plate);
        const lastSeenAt = pos?.recordedAt ?? null;
        const ageMs = lastSeenAt ? Date.now() - new Date(lastSeenAt).valueOf() : null;
        // If last GPS update is old, treat as offline even if online flag is missing.
        const inferredOffline = ageMs != null && Number.isFinite(ageMs) ? ageMs > 10 * 60 * 1000 : false;
        const online = pos?.status === "active" && !inferredOffline ? true : pos?.status === "offline" || inferredOffline ? false : undefined;
        const devRaw = r.devIdno ?? r.devIDNO ?? r.DevIDNO ?? r.deviceId ?? r.did ?? r.devId;
        const devIdno =
          typeof devRaw === "string" && devRaw.trim().length > 0
            ? devRaw.trim()
            : typeof devRaw === "number" && Number.isFinite(devRaw)
              ? String(devRaw)
              : null;
        return vehicleSchema.parse({
          // uctracking docs (Get User Vehicle): id (vehicle id), nm (plate number)
          id: String(r.id ?? r.vehicleId ?? i),
          plate,
          devIdno,
          driverName: (r.driverName as string) ?? (r.driver as string) ?? null,
          type: (r.type as string) ?? undefined,
          status: online === false ? "offline" : online === true ? "active" : (r.status as string) ?? "active",
          speedKmh: pos?.speedKmh ?? (typeof r.speed === "number" ? r.speed : typeof r.speedKmh === "number" ? r.speedKmh : null),
          locationLabel: (r.address as string) ?? (r.location as string) ?? null,
          position:
            pos
              ? { lat: pos.lat, lng: pos.lng }
              : typeof r.lat === "number" && typeof r.lng === "number"
                ? { lat: r.lat as number, lng: r.lng as number }
                : null,
          fuelPercent: typeof r.fuel === "number" ? r.fuel : typeof r.fuelPercent === "number" ? r.fuelPercent : null,
          driverScore: typeof r.score === "number" ? r.score : typeof r.driverScore === "number" ? r.driverScore : null,
          alarmSummary: (r.alarm as string) ?? null,
          lastSeenAt,
        });
      });
      return { source: "uctracking" as const, data };
    } catch (e) {
      console.error("[fleet] uctracking vehicles failed, using demo", e);
    }
    // Important: if uctracking is configured but calls fail, do NOT pretend with demo data.
    return { source: "error" as const, data: [] as typeof demoVehicles };
  }
  return { source: "demo" as const, data: demoVehicles };
}

function toIsoFromUnknown(v: unknown): string {
  if (typeof v === "string") {
    const d = new Date(v);
    if (!Number.isNaN(d.valueOf())) return d.toISOString();
  }
  if (typeof v === "number") {
    const ms = v > 1e12 ? v : v > 1e10 ? v : v * 1000;
    return new Date(ms).toISOString();
  }
  return new Date().toISOString();
}

export async function getPositionsPayload() {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const rows = await client.listPositions();
      const normalizeCoord = (n: number) => {
        // Some endpoints return degrees * 1e6 or * 1e5 integers.
        if (Math.abs(n) > 180) {
          const d6 = n / 1_000_000;
          if (Math.abs(d6) <= 180) return d6;
          const d5 = n / 100_000;
          if (Math.abs(d5) <= 180) return d5;
        }
        return n;
      };
      const data = rows
        .map((row) => {
          const r = row as Record<string, unknown>;
          const plate = String(r.vi ?? r.nm ?? r.vehicleNo ?? r.vid ?? r.devIDNO ?? r.id ?? "");
          const latRaw = Number(r.wd ?? r.lat ?? r.latitude);
          const lngRaw = Number(r.jd ?? r.lng ?? r.longitude);
          const lat = normalizeCoord(latRaw);
          const lng = normalizeCoord(lngRaw);
          if (!Number.isFinite(lat) || !Number.isFinite(lng)) return null;
          const olRaw = r.ol ?? r.online ?? r.isOnline ?? r.olStatus;
          const olNum =
            typeof olRaw === "number"
              ? olRaw
              : typeof olRaw === "string" && olRaw.trim().length
                ? Number(olRaw)
                : undefined;
          const online =
            typeof olRaw === "boolean"
              ? olRaw
              : typeof olNum === "number" && Number.isFinite(olNum)
                ? olNum !== 0
                : typeof olRaw === "string"
                  ? ["1", "true", "online", "yes"].includes(olRaw.toLowerCase())
                  : undefined;
          return positionSchema.parse({
            vehicleId: String(r.vid ?? r.id ?? r.vehicleId ?? plate),
            plate,
            lat,
            lng,
            speedKmh: typeof r.sp === "number" ? r.sp : typeof r.speed === "number" ? r.speed : null,
            heading: typeof r.c === "number" ? r.c : typeof r.heading === "number" ? r.heading : null,
            recordedAt: toIsoFromUnknown(r.tm ?? r.gpsTime ?? r.time ?? r.gpsTimeStr),
            status: online === false ? "offline" : online === true ? "active" : undefined,
          });
        })
        .filter(Boolean);
      return { source: "uctracking" as const, data: data as unknown[] };
    } catch (e) {
      console.error("[fleet] uctracking positions failed, using demo", e);
    }
    return { source: "error" as const, data: [] as unknown[] };
  }
  return { source: "demo" as const, data: demoPositions };
}

export async function getAlarmsPayload() {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const isLikelyPlate = (v: unknown): v is string => {
        if (typeof v !== "string") return false;
        const s = v.trim();
        if (s.length < 2 || s.length > 20) return false;
        // Avoid tokens / hashes being rendered as plates
        if (/^[0-9a-f]{24,}$/i.test(s)) return false;
        // Typical plates: "NL-0847", "ABC123", etc.
        return /^[a-z0-9][a-z0-9-]*[a-z0-9]$/i.test(s);
      };

      // Best-effort plate mapping (alarms often reference devIdno/devIDNO, not vehicleNo)
      const vehicleRows = await client.listVehicles().catch(() => [] as unknown[]);
      const plateByDev = new Map<string, string>();
      const plateByVehId = new Map<string, string>();
      for (const row of vehicleRows) {
        const r = row as Record<string, unknown>;
        const plate = (r.nm ?? r.plate ?? r.vehicleNo ?? r.name) as unknown;
        const plateStr = isLikelyPlate(plate) ? plate.trim() : null;
        if (!plateStr) continue;
        const devRaw = r.devIdno ?? r.devIDNO ?? r.DevIDNO ?? r.deviceId ?? r.did ?? r.devId;
        const devIdno =
          typeof devRaw === "string" && devRaw.trim().length > 0
            ? devRaw.trim()
            : typeof devRaw === "number" && Number.isFinite(devRaw)
              ? String(devRaw)
              : null;
        const vehId =
          typeof r.id === "string" && r.id.trim().length > 0
            ? r.id.trim()
            : typeof r.vehicleId === "string" && r.vehicleId.trim().length > 0
              ? r.vehicleId.trim()
              : null;
        if (devIdno) plateByDev.set(devIdno, plateStr);
        if (vehId) plateByVehId.set(vehId, plateStr);
      }

      const rows = await client.listAlarms();
      const data = rows
        .map((row) => {
          const r = row as Record<string, unknown>;
          const id = String(r.guid ?? r.id ?? `${r.devIDNO ?? "dev"}-${r.type ?? "t"}-${r.time ?? Date.now()}`);
          const devIdnoRaw = r.devIdno ?? r.devIDNO ?? r.DevIDNO ?? r.deviceId;
          const devIdno =
            typeof devIdnoRaw === "string" && devIdnoRaw.trim().length > 0
              ? devIdnoRaw.trim()
              : typeof devIdnoRaw === "number" && Number.isFinite(devIdnoRaw)
                ? String(devIdnoRaw)
                : undefined;
          const plateCandidate = (r.vehicleNo as unknown) ?? (r.vi as unknown) ?? (r.nm as unknown);
          const plate =
            (isLikelyPlate(plateCandidate) ? String(plateCandidate).trim() : undefined) ??
            (devIdno ? plateByDev.get(devIdno) : undefined) ??
            plateByVehId.get(String(r.vehIdno ?? r.vehId ?? r.vid ?? r.vehicleId ?? "")) ??
            undefined;
          const rawMsg = r.desc ?? r.message ?? r.info;
          const msg =
            typeof rawMsg === "string" && rawMsg.trim().length
              ? rawMsg
              : typeof rawMsg === "number"
                ? `Alarm (${rawMsg})`
                : `Alarm (${String(r.type ?? "unknown")})`;
          const typeNum = typeof r.type === "number" ? r.type : undefined;
          const severity = typeNum != null && typeNum > 0 ? "high" : "medium";
          return alarmSchema.parse({
            id,
            vehicleId: String(r.devIDNO ?? r.vid ?? r.vehicleId ?? r.id ?? plate ?? "unknown"),
            plate,
            type: String(r.type ?? "alarm"),
            message: msg,
            severity,
            source: "GPS",
            raisedAt: toIsoFromUnknown(r.time ?? r.tm ?? r.gpsTime ?? Date.now()),
            acknowledged: typeof r.hd === "number" ? r.hd === 1 : undefined,
          });
        })
        .filter(Boolean);
      if (data.length) return { source: "uctracking" as const, data };
    } catch (e) {
      console.error("[fleet] uctracking alarms failed, using demo", e);
    }
    return { source: "error" as const, data: [] as typeof demoAlarms };
  }
  return { source: "demo" as const, data: demoAlarms };
}

export async function getTrackPayload(opts: { devIdno?: string; vehicleNo?: string; beginTime: string; endTime: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      // docs: devIdno (device no) and/or vehicleNo; beginTime/endTime required
      const rows = await client.listFrom(cfg.paths.track, {
        devIdno: opts.devIdno,
        vehicleNo: opts.vehicleNo,
        beginTime: opts.beginTime,
        endTime: opts.endTime,
        toMap: 2,
      });
      return { source: "uctracking" as const, data: rows };
    } catch (e) {
      console.error("[fleet] uctracking track failed", e);
    }
  }
  return { source: "demo" as const, data: [] as unknown[] };
}

export async function getAlarmPagePayload(opts: {
  devIdno?: string;
  vehicleNo?: string;
  beginTime: string;
  endTime: string;
  currentPage?: number;
  pageRecords?: number;
  armType?: string;
  handle?: number;
}) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.getJson(cfg.paths.alarmsPage, {
        devIdno: opts.devIdno,
        vehicleNo: opts.vehicleNo,
        beginTime: opts.beginTime,
        endTime: opts.endTime,
        currentPage: opts.currentPage ?? 1,
        pageRecords: opts.pageRecords ?? 20,
        armType: opts.armType,
        handle: opts.handle,
      });
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking alarms page failed", e);
    }
  }
  return { source: "demo" as const, data: { items: demoAlarms, total: demoAlarms.length, currentPage: 1 } as unknown };
}

export async function getMileagePayload(opts: {
  vehicleNo?: string;
  beginTime: string;
  endTime: string;
  currentPage?: number;
  pageRecords?: number;
  /** Extra query parameters forwarded to the vendor mileage action (e.g. reportType). */
  vendor?: Record<string, string | number | undefined>;
}) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.getJson(cfg.paths.mileage, {
        vehicleNo: opts.vehicleNo,
        beginTime: opts.beginTime,
        endTime: opts.endTime,
        currentPage: opts.currentPage ?? 1,
        pageRecords: opts.pageRecords ?? 50,
        ...(opts.vendor ?? {}),
      });
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking mileage failed", e);
      return { source: "error" as const, data: null as unknown };
    }
  }
  return { source: "demo" as const, data: { items: [], total: 0, currentPage: 1 } as unknown };
}

export async function getMileageDetailsPayload(opts: {
  vehicleNo?: string;
  beginTime: string;
  endTime: string;
  byOil?: number;
  currentPage?: number;
  pageRecords?: number;
  /** Extra query parameters forwarded to getOilTrackDetail (spacing, changeFuel, etc.). */
  vendor?: Record<string, string | number | undefined>;
}) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.getJson(cfg.paths.mileageDetails, {
        vehicleNo: opts.vehicleNo,
        beginTime: opts.beginTime,
        endTime: opts.endTime,
        byOil: opts.byOil,
        currentPage: opts.currentPage ?? 1,
        pageRecords: opts.pageRecords ?? 50,
        ...(opts.vendor ?? {}),
      });
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking mileage details failed", e);
      return { source: "error" as const, data: null as unknown };
    }
  }
  return { source: "demo" as const, data: { items: [], total: 0, currentPage: 1 } as unknown };
}

export async function getVideoPlayerUrlPayload(opts: { devIdno?: string; vehicleNo?: string; channel?: number; stream?: number }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const url = await client.buildPlayerUrl({
        devIdno: opts.devIdno,
        vehicleNo: opts.vehicleNo,
        channel: opts.channel,
        stream: opts.stream,
        lang: "en",
      });
      return { source: "uctracking" as const, data: { url } };
    } catch (e) {
      console.error("[fleet] uctracking build player url failed", e);
    }
  }
  return { source: "demo" as const, data: { url: null as string | null } };
}

export async function getVideoHlsUrlPayload(opts: { devIdno: string; channel: number; bitstream?: number; requestType?: number }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const url = await client.buildHlsUrl({
        devIdno: opts.devIdno,
        channel: opts.channel,
        bitstream: opts.bitstream,
        requestType: opts.requestType,
      });
      return { source: "uctracking" as const, data: { url } };
    } catch (e) {
      console.error("[fleet] uctracking build hls url failed", e);
    }
  }
  return { source: "demo" as const, data: { url: null as string | null } };
}

export async function startRealtimeVideoPayload(opts: { devIdno: string; chn: string; sec: number; label?: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.startRealtimeVideo(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking realtime video failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function queryVideoPayload(opts: Parameters<UctrackingClient["queryVideo"]>[0] & { crossDay?: boolean }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = opts.crossDay ? await client.queryVideoCrossDay(opts) : await client.queryVideo(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking query video failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function addVideoDownloadTaskPayload(opts: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.addDownloadTask(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking add download task failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function listVideoDownloadTasksPayload(opts: {
  devIdno?: string;
  begintime?: string;
  endtime?: string;
  currentPage?: number;
  pageRecords?: number;
}) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.listDownloadTasks(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking list download tasks failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function deleteVideoDownloadTaskPayload(opts: { devIdno: string; taskTag: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.deleteDownloadTask(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking delete download task failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function controlVideoDownloadPayload(opts: { seq: number | string; devIdno: string; taskType: number | string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.controlDownload(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking control download failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function capturePicturePayload(opts: { devIdno: string; chn: string; type: number; resolution?: number }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.capturePicture(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking capture picture failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function getSnapPhotosPayload(opts: { type: number; fpLength: number; fpOffset?: number; mType: number; fPath: string; saveName?: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.getSnapPhotos(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking snap photos failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function ftpUploadPayload(opts: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.ftpUpload(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking ftp upload failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function ftpStatusPayload(opts: { devIdno: string; seq: number | string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.ftpStatus(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking ftp status failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function ftpTaskListPayload(opts: { devIdno: string; begintime: string; endtime: string; currentPage?: number; pageRecords?: number; status?: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.ftpTaskList(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking ftp task list failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function getDeviceInfoPayload(opts: { devIdno: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.getDeviceInfo(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking get device info failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function addDevicePayload(opts: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.addDevice(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking add device failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function editDevicePayload(opts: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.editDevice(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking edit device failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function addVehiclePayload(opts: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.addVehicle(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking add vehicle failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function deleteDevicePayload(opts: { devIdno: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.deleteDevice(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking delete device failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function deleteVehiclePayload(opts: { vehIdno: string; delDevice?: number }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.deleteVehicle(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking delete vehicle failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function installVehiclePayload(opts: { vehIdno: string; devIdno: string; devType?: number }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.installVehicle(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking install vehicle failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function uninstallDevicePayload(opts: { vehIdno: string; devIdno: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.uninstallDevice(opts);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking uninstall device failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

// --- Safety / Control / Markers / Org / Flow (raw passthrough) ---
async function passthrough(cfgPath: string, params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.getJson(cfgPath, params);
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking passthrough failed", e);
    }
  }
  return { source: "demo" as const, data: null as unknown };
}

export async function safetyAlarmQueryPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.safetyAlarmQuery, params);
}
export async function safetyEvidenceListPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.safetyEvidenceList, params);
}
export async function safetyEvidenceQueryPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.safetyEvidenceQuery, params);
}
export async function controlGpsReportPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.controlGpsReport, params);
}
export async function controlOthersPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.controlOthers, params);
}
export async function controlTtsPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.controlTts, params);
}
export async function controlPtzPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.controlPtz, params);
}
export async function flowInfoPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.flowInfo, params);
}
export async function flowSavePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.flowSave, params);
}
export async function userMarkersPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.userMarkers, params);
}
export async function markAddPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.markAdd, params);
}
export async function markEditPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.markEdit, params);
}
export async function markFindPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.markFind, params);
}
export async function markDeletePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.markDelete, params);
}
export async function companyMergePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.companyMerge, params);
}
export async function companyFindPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.companyFind, params);
}
export async function companyDeletePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.companyDelete, params);
}
export async function roleMergePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.roleMerge, params);
}

// --- Driver Management / SIM Management (raw passthrough) ---
export async function findVehicleDriverByDevicePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.findVehicleDriverByDevice, params);
}
export async function findDriverChangedByDevicePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.findDriverChangedByDevice, params);
}
export async function findDriverByLicensePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.findDriverByLicense, params);
}
export async function queryPunchCardPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.queryPunchCard, params);
}
export async function queryIdentifyAlarmPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.queryIdentifyAlarm, params);
}
export async function queryDriverListPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.queryDriverList, params);
}
export async function driverMergePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.driverMerge, params);
}
export async function driverLoadPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.driverLoad, params);
}
export async function driverDeletePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.driverDelete, params);
}
export async function simMergePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.simMerge, params);
}
export async function simFindPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.simFind, params);
}
export async function simDeletePayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.simDelete, params);
}
export async function simQueryPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.simQuery, params);
}
export async function simUnbindPayload(params: Record<string, string | number | undefined>) {
  const cfg = getUctrackingConfigFromEnv();
  return await passthrough(cfg.paths.simUnbind, params);
}

export async function getParkedPayload(opts: { vehicleNo?: string; beginTime: string; endTime: string; parkTime?: number; toMap?: number }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.getJson(cfg.paths.parked, {
        vehicleNo: opts.vehicleNo,
        beginTime: opts.beginTime,
        endTime: opts.endTime,
        parkTime: opts.parkTime,
        toMap: opts.toMap ?? 2,
      });
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking parked failed", e);
    }
  }
  return { source: "demo" as const, data: { items: [], total: 0 } as unknown };
}

export async function getDevByVehiclePayload(opts: { vehicleNo: string }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const raw = await client.getJson(cfg.paths.devByVehicle, { vehicleNo: opts.vehicleNo });
      return { source: "uctracking" as const, data: raw };
    } catch (e) {
      console.error("[fleet] uctracking devByVehicle failed", e);
    }
  }
  return { source: "demo" as const, data: {} as unknown };
}

export async function getDeviceOnlinePayload(opts: { devIdno?: string; vehicleNo?: string; status?: number }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const rows = await client.listFrom(cfg.paths.deviceOnline, { devIdno: opts.devIdno, vehicleNo: opts.vehicleNo, status: opts.status });
      return { source: "uctracking" as const, data: rows };
    } catch (e) {
      console.error("[fleet] uctracking device online failed", e);
    }
  }
  return { source: "demo" as const, data: [] as unknown[] };
}

export async function getDeviceStatusGpsPayload(opts: { devIdno?: string; vehicleNo?: string; geoaddress?: number; driver?: number; toMap?: number }) {
  const cfg = getUctrackingConfigFromEnv();
  if (isUctrackingConfigured(cfg)) {
    try {
      const client = new UctrackingClient(cfg);
      const rows = await client.listFrom(cfg.paths.deviceStatusGps, {
        devIdno: opts.devIdno,
        vehicleNo: opts.vehicleNo,
        geoaddress: opts.geoaddress,
        driver: opts.driver,
        toMap: opts.toMap ?? 2,
      });
      return { source: "uctracking" as const, data: rows };
    } catch (e) {
      console.error("[fleet] uctracking device status gps failed", e);
    }
  }
  return { source: "demo" as const, data: [] as unknown[] };
}
