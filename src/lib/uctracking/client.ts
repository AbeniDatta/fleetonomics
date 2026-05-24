import { z } from "zod";
import {
  alarmSchema,
  dashboardKpiSchema,
  driverSchema,
  fleetFooterSchema,
  fuelEventSchema,
  fuelVehicleRowSchema,
  obdReadingSchema,
  positionSchema,
  tripRequestSchema,
  tripSchema,
  vehicleSchema,
  uctrackingListSchema,
} from "./schemas";

function env(name: string, fallback = ""): string {
  return process.env[name] ?? fallback;
}

const jsessionResponseSchema = z
  .object({
    result: z.union([z.number(), z.string()]).optional(),
    jsession: z.string().optional(),
    JSESSION: z.string().optional(),
  })
  .passthrough();

export class UctrackingClientError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly body?: string,
  ) {
    super(message);
    this.name = "UctrackingClientError";
  }
}

export type UctrackingClientConfig = {
  baseUrl: string;
  apiPrefix: string;
  account: string;
  password: string;
  playerBasePath: string;
  hlsPort: number;
  snapPhotosBaseUrl: string;
  paths: {
    login: string;
    vehicles: string;
    positions: string;
    alarms: string;
    track: string;
    alarmsPage: string;
    mileage: string;
    mileageDetails: string;
    parked: string;
    devByVehicle: string;
    deviceOnline: string;
    deviceStatusGps: string;
    trips: string;
    fuel: string;
    obd: string;
    drivers: string;
    media: string;
    videoRealtime: string;
    videoQuery: string;
    videoQueryCrossDay: string;
    videoDownloadAdd: string;
    videoDownloadTaskList: string;
    videoDownloadTaskDelete: string;
    videoDownloadControl: string;
    videoCapturePicture: string;
    ftpUpload: string;
    ftpStatus: string;
    ftpTaskList: string;
    deviceInfo: string;
    deviceAdd: string;
    deviceEdit: string;
    vehicleAdd: string;
    deviceDelete: string;
    vehicleDelete: string;
    installVehicle: string;
    uninstallDevice: string;
    safetyAlarmQuery: string;
    safetyEvidenceList: string;
    safetyEvidenceQuery: string;
    controlGpsReport: string;
    controlOthers: string;
    controlTts: string;
    controlPtz: string;
    flowInfo: string;
    flowSave: string;
    userMarkers: string;
    markAdd: string;
    markEdit: string;
    markFind: string;
    markDelete: string;
    companyMerge: string;
    companyFind: string;
    companyDelete: string;
    roleMerge: string;
    findVehicleDriverByDevice: string;
    findDriverChangedByDevice: string;
    findDriverByLicense: string;
    queryPunchCard: string;
    queryIdentifyAlarm: string;
    queryDriverList: string;
    driverMerge: string;
    driverLoad: string;
    driverDelete: string;
    simMerge: string;
    simFind: string;
    simDelete: string;
    simQuery: string;
    simUnbind: string;
  };
};

export function getUctrackingConfigFromEnv(): UctrackingClientConfig {
  const baseUrl = env("UCTRACKING_BASE_URL", "").replace(/\/$/, "");
  const apiPrefix = env("UCTRACKING_API_PREFIX", "").replace(/\/$/, "");
  return {
    baseUrl,
    apiPrefix,
    account: env("UCTRACKING_ACCOUNT", ""),
    password: env("UCTRACKING_PASSWORD", ""),
    playerBasePath: env("UCTRACKING_PLAYER_BASE_PATH", "/808gps/open/player").replace(/\/$/, ""),
    hlsPort: Number(env("UCTRACKING_HLS_PORT", "6604")) || 6604,
    snapPhotosBaseUrl: env("UCTRACKING_SNAP_PHOTOS_BASE_URL", `${baseUrl}:6611/3/5/`).replace(/\/?$/, "/"),
    paths: {
      login: env("UCTRACKING_PATH_LOGIN", "/StandardApiAction_login.action"),
      vehicles: env("UCTRACKING_PATH_VEHICLES", "/StandardApiAction_queryUserVehicle.action"),
      positions: env("UCTRACKING_PATH_POSITIONS", "/StandardApiAction_vehicleStatus.action"),
      alarms: env("UCTRACKING_PATH_ALARMS", "/StandardApiAction_vehicleAlarm.action"),
      track: env("UCTRACKING_PATH_TRACK", "/StandardApiAction_queryTrackDetail.action"),
      alarmsPage: env("UCTRACKING_PATH_ALARMS_PAGE", "/StandardApiAction_queryAlarmDetail.action"),
      mileage: env("UCTRACKING_PATH_MILEAGE", "/StandardApiAction_runMileage.action"),
      mileageDetails: env("UCTRACKING_PATH_MILEAGE_DETAILS", "/StandardApiAction_getOilTrackDetail.action"),
      parked: env("UCTRACKING_PATH_PARKED", "/StandardApiAction_parkDetail.action"),
      devByVehicle: env("UCTRACKING_PATH_DEV_BY_VEHICLE", "/StandardApiAction_getDeviceByVehicle.action"),
      deviceOnline: env("UCTRACKING_PATH_DEVICE_ONLINE", "/StandardApiAction_getDeviceOnlineStatus.action"),
      deviceStatusGps: env("UCTRACKING_PATH_DEVICE_STATUS_GPS", "/StandardApiAction_getDeviceStatus.action"),
      trips: env("UCTRACKING_PATH_TRIPS", "/api/trips"),
      fuel: env("UCTRACKING_PATH_FUEL", "/api/fuel"),
      obd: env("UCTRACKING_PATH_OBD", "/api/obd"),
      drivers: env("UCTRACKING_PATH_DRIVERS", "/api/drivers"),
      media: env("UCTRACKING_PATH_MEDIA", "/api/media"),
      videoRealtime: env("UCTRACKING_PATH_VIDEO_REALTIME", "/StandardApiAction_realTimeVideo.action"),
      videoQuery: env("UCTRACKING_PATH_VIDEO_QUERY", "/StandardApiAction_getVideoFileInfo.action"),
      videoQueryCrossDay: env("UCTRACKING_PATH_VIDEO_QUERY_CROSS_DAY", "/StandardApiAction_getVideoHistoryFile.action"),
      videoDownloadAdd: env("UCTRACKING_PATH_VIDEO_DOWNLOAD_ADD", "/StandardApiAction_addDownLoadTask.action"),
      videoDownloadTaskList: env("UCTRACKING_PATH_VIDEO_DOWNLOAD_TASK_LIST", "/StandardApiAction_downloadTaskList.action"),
      videoDownloadTaskDelete: env("UCTRACKING_PATH_VIDEO_DOWNLOAD_TASK_DELETE", "/StandardApiAction_delDownLoadTaskList.action"),
      videoDownloadControl: env("UCTRACKING_PATH_VIDEO_DOWNLOAD_CONTROL", "/StandardApiAction_controlDownLoad.action"),
      videoCapturePicture: env("UCTRACKING_PATH_VIDEO_CAPTURE_PICTURE", "/StandardApiAction_capturePicture.action"),
      ftpUpload: env("UCTRACKING_PATH_FTP_UPLOAD", "/StandardApiAction_ftpUpload.action"),
      ftpStatus: env("UCTRACKING_PATH_FTP_STATUS", "/StandardApiAction_queryFtpStatus.action"),
      ftpTaskList: env("UCTRACKING_PATH_FTP_TASK_LIST", "/StandardApiAction_queryDownLoadReplayEx.action"),
      deviceInfo: env("UCTRACKING_PATH_DEVICE_INFO", "/StandardApiAction_getLoadDeviceInfo.action"),
      deviceAdd: env("UCTRACKING_PATH_DEVICE_ADD", "/StandardApiAction_addDevice.action"),
      deviceEdit: env("UCTRACKING_PATH_DEVICE_EDIT", "/StandardApiAction_editDevice.action"),
      vehicleAdd: env("UCTRACKING_PATH_VEHICLE_ADD", "/StandardApiAction_addVehicle.action"),
      deviceDelete: env("UCTRACKING_PATH_DEVICE_DELETE", "/StandardApiAction_deleteDevice.action"),
      vehicleDelete: env("UCTRACKING_PATH_VEHICLE_DELETE", "/StandardApiAction_deleteVehicle.action"),
      installVehicle: env("UCTRACKING_PATH_INSTALL_VEHICLE", "/StandardApiAction_installVehicle.action"),
      uninstallDevice: env("UCTRACKING_PATH_UNINSTALL_DEVICE", "/StandardApiAction_uninstallDevice.action"),
      safetyAlarmQuery: env("UCTRACKING_PATH_SAFETY_ALARM_QUERY", "/StandardApiAction_querySafetyAlarm.action"),
      safetyEvidenceList: env(
        "UCTRACKING_PATH_SAFETY_EVIDENCE_LIST",
        "/StandardApiAction_performanceReportPhotoListSafe.action",
      ),
      safetyEvidenceQuery: env("UCTRACKING_PATH_SAFETY_EVIDENCE_QUERY", "/StandardApiAction_alarmEvidence.action"),
      controlGpsReport: env("UCTRACKING_PATH_CONTROL_GPS_REPORT", "/StandardApiAction_vehicleControlGPSReport.action"),
      controlOthers: env("UCTRACKING_PATH_CONTROL_OTHERS", "/StandardApiAction_vehicleControlOthers.action"),
      controlTts: env("UCTRACKING_PATH_CONTROL_TTS", "/StandardApiAction_vehicleTTS.action"),
      controlPtz: env("UCTRACKING_PATH_CONTROL_PTZ", "/StandardApiAction_sendPTZControl.action"),
      flowInfo: env("UCTRACKING_PATH_FLOW_INFO", "/StandardApiAction_getFlowInfo.action"),
      flowSave: env("UCTRACKING_PATH_FLOW_SAVE", "/StandardApiAction_saveFlowConfig.action"),
      userMarkers: env("UCTRACKING_PATH_USER_MARKERS", "/StandardApiAction_getUserMarkers.action"),
      markAdd: env("UCTRACKING_PATH_MARK_ADD", "/MapMarkerAction_addMark.action"),
      markEdit: env("UCTRACKING_PATH_MARK_EDIT", "/MapMarkerAction_editMark.action"),
      markFind: env("UCTRACKING_PATH_MARK_FIND", "/MapMarkerAction_findMark.action"),
      markDelete: env("UCTRACKING_PATH_MARK_DELETE", "/MapMarkerAction_deleteMark.action"),
      companyMerge: env("UCTRACKING_PATH_COMPANY_MERGE", "/StandardApiAction_mergeCompany.action"),
      companyFind: env("UCTRACKING_PATH_COMPANY_FIND", "/StandardApiAction_findCompany.action"),
      companyDelete: env("UCTRACKING_PATH_COMPANY_DELETE", "/StandardApiAction_deleteCompany.action"),
      roleMerge: env("UCTRACKING_PATH_ROLE_MERGE", "/StandardApiAction_mergeUserRole.action"),
      findVehicleDriverByDevice: env(
        "UCTRACKING_PATH_FIND_VEHICLE_DRIVER_BY_DEVICE",
        "/StandardApiAction_findVehicleInfoByDeviceId.action",
      ),
      findDriverChangedByDevice: env(
        "UCTRACKING_PATH_FIND_DRIVER_CHANGED_BY_DEVICE",
        "/StandardApiAction_findDriverInfoByDeviceId.action",
      ),
      findDriverByLicense: env("UCTRACKING_PATH_FIND_DRIVER_BY_LICENSE", "/StandardApiAction_findVehicleInfoByDeviceJn.action"),
      queryPunchCard: env("UCTRACKING_PATH_QUERY_PUNCH_CARD", "/StandardApiAction_queryPunchCardRecode.action"),
      queryIdentifyAlarm: env("UCTRACKING_PATH_QUERY_IDENTIFY_ALARM", "/StandardApiAction_queryIdentifyAlarm.action"),
      queryDriverList: env("UCTRACKING_PATH_QUERY_DRIVER_LIST", "/StandardApiAction_queryDriverList.action"),
      driverMerge: env("UCTRACKING_PATH_DRIVER_MERGE", "/DriverAction_mergeDriver.action"),
      driverLoad: env("UCTRACKING_PATH_DRIVER_LOAD", "/DriverAction_loadDriver.action"),
      driverDelete: env("UCTRACKING_PATH_DRIVER_DELETE", "/DriverAction_deleteDriver.action"),
      simMerge: env("UCTRACKING_PATH_SIM_MERGE", "/StandardApiAction_mergeSIMInfo.action"),
      simFind: env("UCTRACKING_PATH_SIM_FIND", "/StandardApiAction_findSIMInfo.action"),
      simDelete: env("UCTRACKING_PATH_SIM_DELETE", "/StandardApiAction_deleteSIMInfo.action"),
      simQuery: env("UCTRACKING_PATH_SIM_QUERY", "/StandardApiAction_loadSIMInfos.action"),
      simUnbind: env("UCTRACKING_PATH_SIM_UNBIND", "/StandardApiAction_unbindingSIM.action"),
    },
  };
}

export function isUctrackingConfigured(config: UctrackingClientConfig): boolean {
  if (process.env.UCTRACKING_ENABLED !== "true") return false;
  const { baseUrl, account, password } = config;
  if (!baseUrl || !account || !password) return false;
  const looksPlaceholder =
    /your-instance|example\.com|localhost:9999/i.test(baseUrl) ||
    /paste-your|^changeme$/i.test(account) ||
    /paste-your|^changeme$/i.test(password);
  return !looksPlaceholder;
}

/** Coerce unknown API list payloads into a Zod-safe array */
function extractArray(raw: unknown): unknown[] {
  const parsed = uctrackingListSchema.safeParse(raw);
  if (parsed.success) {
    const o = parsed.data;
    if (Array.isArray(o.data)) return o.data;
    if (Array.isArray(o.items)) return o.items;
    if (Array.isArray(o.result)) return o.result;
    // common payload keys seen in fleet platforms
    if (Array.isArray((o as { vehicleList?: unknown }).vehicleList)) return (o as { vehicleList: unknown[] }).vehicleList;
    if (Array.isArray((o as { vehicles?: unknown }).vehicles)) return (o as { vehicles: unknown[] }).vehicles;
  }
  if (Array.isArray(raw)) return raw;
  if (raw && typeof raw === "object") {
    const r = raw as Record<string, unknown>;
    if (Array.isArray(r.vehicleList)) return r.vehicleList as unknown[];
    if (Array.isArray(r.vehicles)) return r.vehicles as unknown[];
    if (Array.isArray(r.rows)) return r.rows as unknown[];
    if (Array.isArray(r.list)) return r.list as unknown[];
    if (Array.isArray(r.infos)) return r.infos as unknown[];
    if (Array.isArray(r.status)) return r.status as unknown[];
    if (Array.isArray(r.files)) return r.files as unknown[];
    // As a last resort, pick the largest array value.
    let best: unknown[] | null = null;
    for (const v of Object.values(r)) {
      if (Array.isArray(v)) {
        if (!best || v.length > best.length) best = v;
      }
    }
    if (best) return best;
  }
  return [];
}

type CachedSession = { jsession: string; obtainedAtMs: number };
let cachedSession: CachedSession | null = null;

export class UctrackingClient {
  constructor(private readonly cfg: UctrackingClientConfig) {}

  private url(path: string, query?: Record<string, string | number | undefined>) {
    const p = `${this.cfg.baseUrl}${this.cfg.apiPrefix}${path}`;
    if (!query || !Object.keys(query).length) return p;
    const qs = new URLSearchParams();
    for (const [k, v] of Object.entries(query)) {
      if (v === undefined) continue;
      qs.set(k, String(v));
    }
    return `${p}?${qs.toString()}`;
  }

  private headers(): HeadersInit {
    return { Accept: "application/json" };
  }

  private sessionLooksFresh(s: CachedSession): boolean {
    // Doc doesn't state TTL; 20 minutes is a safe default for auto refresh.
    return Date.now() - s.obtainedAtMs < 20 * 60 * 1000;
  }

  async login(): Promise<string> {
    // Use POST so account/password aren't put in the URL (prevents accidental log leaks).
    const form = new URLSearchParams();
    form.set("account", this.cfg.account);
    form.set("password", this.cfg.password);
    const res = await fetch(this.url(this.cfg.paths.login), {
      method: "POST",
      headers: { ...this.headers(), "Content-Type": "application/x-www-form-urlencoded" },
      body: form.toString(),
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) throw new UctrackingClientError(`uctracking login ${res.status}`, res.status, text.slice(0, 500));
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new UctrackingClientError("Invalid JSON from uctracking login", res.status, text.slice(0, 200));
    }
    const parsed = jsessionResponseSchema.parse(json);
    const jsession = parsed.jsession ?? parsed.JSESSION;
    if (!jsession) throw new UctrackingClientError("Login succeeded but jsession missing", 200, text.slice(0, 500));
    cachedSession = { jsession, obtainedAtMs: Date.now() };
    return jsession;
  }

  private async getSession(): Promise<string> {
    if (cachedSession && this.sessionLooksFresh(cachedSession)) return cachedSession.jsession;
    return await this.login();
  }

  /**
   * Build a URL to the uctracking hosted player page.
   * Based on docs: /808gps/open/player/video.html?lang=en&devIdno=...&jsession=...
   */
  async buildPlayerUrl(opts: { devIdno?: string; vehicleNo?: string; channel?: number; stream?: number; lang?: string }) {
    const jsession = await this.getSession();
    const u = new URL(`${this.cfg.baseUrl}${this.cfg.playerBasePath}/video.html`);
    u.searchParams.set("lang", opts.lang ?? "en");
    if (opts.devIdno) u.searchParams.set("devIdno", opts.devIdno);
    if (opts.vehicleNo) u.searchParams.set("vehicleNo", opts.vehicleNo);
    if (opts.channel != null) u.searchParams.set("channel", String(opts.channel));
    if (opts.stream != null) u.searchParams.set("stream", String(opts.stream));
    u.searchParams.set("jsession", jsession);
    return u.toString();
  }

  /**
   * Build an HLS live URL. Docs show a separate streaming origin, often :6604/hls/...m3u8?jsession=...
   * We cannot reliably guess the path without the API returning it, so we return a best-effort URL
   * that matches the doc pattern: /hls/<requestType>_<deviceNumber>_<channel>_<bitstream>.m3u8?jsession=...
   */
  async buildHlsUrl(opts: { devIdno: string; channel: number; bitstream?: number; requestType?: number }) {
    const jsession = await this.getSession();
    const base = new URL(this.cfg.baseUrl);
    base.port = String(this.cfg.hlsPort);
    const requestType = opts.requestType ?? 1;
    const bitstream = opts.bitstream ?? 1;
    const path = `/hls/${requestType}_${opts.devIdno}_${opts.channel}_${bitstream}.m3u8`;
    const u = new URL(`${base.toString().replace(/\/$/, "")}${path}`);
    u.searchParams.set("jsession", jsession);
    return u.toString();
  }

  private async requestRaw(
    path: string,
    query?: Record<string, string | number | undefined>,
  ): Promise<unknown> {
    const jsession = await this.getSession();
    const ms = Number(process.env.UCTRACKING_FETCH_TIMEOUT_MS ?? "60000");
    const signal = Number.isFinite(ms) && ms > 0 ? AbortSignal.timeout(ms) : undefined;
    const res = await fetch(this.url(path, { jsession, ...(query ?? {}) }), {
      headers: this.headers(),
      cache: "no-store",
      signal,
    });
    const raw = await res.json().catch(() => null);
    return raw;
  }

  /**
   * File-related video business helpers
   * These mostly return raw vendor payloads; we normalize later once we confirm shapes.
   */
  async startRealtimeVideo(opts: { devIdno: string; chn: string; sec: number; label?: string }) {
    return await this.getJson(this.cfg.paths.videoRealtime, {
      DevIDNO: opts.devIdno,
      Chn: opts.chn,
      Sec: opts.sec,
      Label: opts.label,
    });
  }

  async queryVideo(opts: {
    devIdno: string;
    loc: number;
    chn: number;
    year: string | number;
    mon: string | number;
    day: string | number;
    recType?: number;
    fileAttr?: number;
    beg: number;
    end: number;
    arm1?: number;
    arm2?: number;
    res?: number;
    stream?: number;
    store?: number;
  }) {
    return await this.getJson(this.cfg.paths.videoQuery, {
      DevIDNO: opts.devIdno,
      LOC: opts.loc,
      CHN: opts.chn,
      YEAR: opts.year,
      MON: opts.mon,
      DAY: opts.day,
      RECTYPE: opts.recType,
      FILEATTR: opts.fileAttr,
      BEG: opts.beg,
      END: opts.end,
      ARM1: opts.arm1,
      ARM2: opts.arm2,
      RES: opts.res,
      STREAM: opts.stream,
      STORE: opts.store,
    });
  }

  async queryVideoCrossDay(opts: Parameters<UctrackingClient["queryVideo"]>[0]) {
    return await this.getJson(this.cfg.paths.videoQueryCrossDay, {
      DevIDNO: opts.devIdno,
      LOC: opts.loc,
      CHN: opts.chn,
      YEAR: opts.year,
      MON: opts.mon,
      DAY: opts.day,
      RECTYPE: opts.recType,
      FILEATTR: opts.fileAttr,
      BEG: opts.beg,
      END: opts.end,
      ARM1: opts.arm1,
      ARM2: opts.arm2,
      RES: opts.res,
      STREAM: opts.stream,
      STORE: opts.store,
    });
  }

  async addDownloadTask(opts: Record<string, string | number | undefined>) {
    return await this.getJson(this.cfg.paths.videoDownloadAdd, opts);
  }

  async listDownloadTasks(opts: { devIdno?: string; begintime?: string; endtime?: string; currentPage?: number; pageRecords?: number }) {
    return await this.getJson(this.cfg.paths.videoDownloadTaskList, {
      devIdno: opts.devIdno,
      begintime: opts.begintime,
      endtime: opts.endtime,
      currentPage: opts.currentPage,
      pageRecords: opts.pageRecords,
    });
  }

  async deleteDownloadTask(opts: { devIdno: string; taskTag: string }) {
    return await this.getJson(this.cfg.paths.videoDownloadTaskDelete, {
      devIdno: opts.devIdno,
      taskTag: opts.taskTag,
    });
  }

  async controlDownload(opts: { seq: number | string; devIdno: string; taskType: number | string; jsession?: string }) {
    // jsession is auto-injected by getJson, but vendor params include it; we avoid passing explicitly.
    return await this.getJson(this.cfg.paths.videoDownloadControl, {
      seq: opts.seq,
      devIdno: opts.devIdno,
      taskType: opts.taskType,
    });
  }

  async capturePicture(opts: { devIdno: string; chn: string; type: number; resolution?: number }) {
    return await this.getJson(this.cfg.paths.videoCapturePicture, {
      devIdno: opts.devIdno,
      chn: opts.chn,
      type: opts.type,
      resolution: opts.resolution,
    });
  }

  async getSnapPhotos(opts: { type: number; fpLength: number; fpOffset?: number; mType: number; fPath: string; saveName?: string }) {
    const u = new URL(this.cfg.snapPhotosBaseUrl);
    u.searchParams.set("type", String(opts.type));
    u.searchParams.set("FPLENGTH", String(opts.fpLength));
    if (opts.fpOffset != null) u.searchParams.set("FPOFFSET", String(opts.fpOffset));
    u.searchParams.set("MTYPE", String(opts.mType));
    u.searchParams.set("FPATH", opts.fPath);
    if (opts.saveName) u.searchParams.set("SAVENAME", opts.saveName);
    const res = await fetch(u.toString(), { headers: this.headers(), cache: "no-store" });
    const text = await res.text();
    if (!res.ok) throw new UctrackingClientError(`uctracking snap photos ${res.status}`, res.status, text.slice(0, 500));
    try {
      return text ? JSON.parse(text) : null;
    } catch {
      return { raw: text };
    }
  }

  async ftpUpload(opts: Record<string, string | number | undefined>) {
    return await this.getJson(this.cfg.paths.ftpUpload, opts);
  }

  async ftpStatus(opts: { devIdno: string; seq: number | string }) {
    return await this.getJson(this.cfg.paths.ftpStatus, {
      devIdno: opts.devIdno,
      seq: opts.seq,
    });
  }

  async ftpTaskList(opts: { devIdno: string; begintime: string; endtime: string; currentPage?: number; pageRecords?: number; status?: string }) {
    return await this.getJson(this.cfg.paths.ftpTaskList, {
      devIdno: opts.devIdno,
      begintime: opts.begintime,
      endtime: opts.endtime,
      currentPage: opts.currentPage,
      pageRecords: opts.pageRecords,
      status: opts.status,
    });
  }

  // Device management
  async getDeviceInfo(opts: { devIdno: string }) {
    return await this.getJson(this.cfg.paths.deviceInfo, { devIdno: opts.devIdno });
  }

  async addDevice(opts: Record<string, string | number | undefined>) {
    return await this.getJson(this.cfg.paths.deviceAdd, opts);
  }

  async editDevice(opts: Record<string, string | number | undefined>) {
    return await this.getJson(this.cfg.paths.deviceEdit, opts);
  }

  async addVehicle(opts: Record<string, string | number | undefined>) {
    return await this.getJson(this.cfg.paths.vehicleAdd, opts);
  }

  async deleteDevice(opts: { devIdno: string }) {
    return await this.getJson(this.cfg.paths.deviceDelete, { devIdno: opts.devIdno });
  }

  async deleteVehicle(opts: { vehIdno: string; delDevice?: number }) {
    return await this.getJson(this.cfg.paths.vehicleDelete, { vehIdno: opts.vehIdno, delDevice: opts.delDevice });
  }

  async installVehicle(opts: { vehIdno: string; devIdno: string; devType?: number }) {
    return await this.getJson(this.cfg.paths.installVehicle, { vehIdno: opts.vehIdno, devIdno: opts.devIdno, devType: opts.devType });
  }

  async uninstallDevice(opts: { vehIdno: string; devIdno: string }) {
    return await this.getJson(this.cfg.paths.uninstallDevice, { vehIdno: opts.vehIdno, devIdno: opts.devIdno });
  }

  async listFrom(path: string, query?: Record<string, string | number | undefined>): Promise<unknown[]> {
    const raw = await this.requestRaw(path, query);
    return extractArray(raw);
  }

  async getJson(path: string, query?: Record<string, string | number | undefined>): Promise<unknown> {
    return await this.requestRaw(path, query);
  }

  async fetchJson<T>(
    path: string,
    schema: z.ZodType<T>,
    init?: RequestInit,
    query?: Record<string, string | number | undefined>,
  ): Promise<T> {
    const res = await fetch(this.url(path, query), {
      ...init,
      headers: { ...this.headers(), ...(init?.headers as object) },
      cache: "no-store",
    });
    const text = await res.text();
    if (!res.ok) {
      throw new UctrackingClientError(
        `uctracking ${res.status}: ${path}`,
        res.status,
        text.slice(0, 500),
      );
    }
    let json: unknown;
    try {
      json = text ? JSON.parse(text) : null;
    } catch {
      throw new UctrackingClientError("Invalid JSON from uctracking", res.status, text.slice(0, 200));
    }
    return schema.parse(json);
  }

  async listVehicles(): Promise<unknown[]> {
    return await this.listFrom(this.cfg.paths.vehicles);
  }

  async listPositions(): Promise<unknown[]> {
    return await this.listFrom(this.cfg.paths.positions);
  }

  async listAlarms(): Promise<unknown[]> {
    return await this.listFrom(this.cfg.paths.alarms);
  }

  async listTrips(): Promise<unknown[]> {
    return await this.listFrom(this.cfg.paths.trips);
  }

  /** When you map their payloads, replace these parsers with your field mapping */
  async getNormalizedVehicles(): Promise<z.infer<typeof vehicleSchema>[]> {
    const rows = await this.listVehicles();
    return rows.map((row, i) =>
      vehicleSchema.parse({
        id: String((row as { id?: string }).id ?? i),
        plate: String((row as { plate?: string; name?: string }).plate ?? (row as { name?: string }).name ?? `VEH-${i}`),
        driverName: (row as { driverName?: string }).driverName ?? null,
        status: (row as { status?: string }).status ?? "active",
        speedKmh: (row as { speed?: number }).speed ?? null,
        locationLabel: (row as { address?: string }).address ?? null,
        fuelPercent: (row as { fuel?: number }).fuel ?? null,
        driverScore: (row as { score?: number }).score ?? null,
        alarmSummary: (row as { alarm?: string }).alarm ?? null,
      }),
    );
  }
}

/** Re-export schema validators for API routes that need one-shot parsing */
export const uctrackingParsers = {
  vehicle: vehicleSchema,
  position: positionSchema,
  alarm: alarmSchema,
  trip: tripSchema,
  tripRequest: tripRequestSchema,
  fuelEvent: fuelEventSchema,
  fuelRow: fuelVehicleRowSchema,
  obd: obdReadingSchema,
  driver: driverSchema,
  dashboardKpi: dashboardKpiSchema,
  fleetFooter: fleetFooterSchema,
};
