import { z } from "zod";

/** Normalized vehicle status inside our app */
export const vehicleStatusSchema = z.enum([
  "active",
  "idle",
  "offline",
  "alert",
  "parked",
  "moving",
  "breach",
]);

export type VehicleStatus = z.infer<typeof vehicleStatusSchema>;

export const geoPointSchema = z.object({
  lat: z.number(),
  lng: z.number(),
});

const statusCoerce = z
  .union([z.string(), z.number()])
  .optional()
  .transform((raw) => {
    // Some uctracking payloads use numeric status codes.
    const numeric: Record<number, VehicleStatus> = {
      0: "offline",
      1: "active",
      2: "idle",
      3: "moving",
      4: "alert",
      5: "breach",
      6: "parked",
    };
    if (typeof raw === "number") return numeric[raw] ?? "active";
    const s = (raw ?? "active").toLowerCase().replace(/\s+/g, "_");
    const aliases: Record<string, VehicleStatus> = {
      online: "active",
      running: "moving",
      breach: "breach",
      geofence: "breach",
      alert: "alert",
      idle: "idle",
      idling: "idle",
      offline: "offline",
      parked: "parked",
      moving: "moving",
      active: "active",
    };
    return aliases[s] ?? (vehicleStatusSchema.safeParse(s).success ? (s as VehicleStatus) : "active");
  });

export const vehicleSchema = z.object({
  id: z.string(),
  plate: z.string(),
  /** Device id from uctracking (e.g. Get User Vehicle / Get DevIdno); required for live HLS and many video APIs. */
  devIdno: z.string().nullable().optional(),
  driverId: z.string().nullable().optional(),
  driverName: z.string().nullable().optional(),
  type: z.string().optional(),
  status: statusCoerce,
  speedKmh: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  locationLabel: z.string().nullable().optional(),
  position: geoPointSchema.nullable().optional(),
  fuelPercent: z.number().min(0).max(100).nullable().optional(),
  driverScore: z.number().min(0).max(100).nullable().optional(),
  alarmSummary: z.string().nullable().optional(),
  zoneId: z.string().nullable().optional(),
  lastSeenAt: z.string().datetime().nullable().optional(),
});

export type Vehicle = z.infer<typeof vehicleSchema>;

export const positionSchema = z.object({
  vehicleId: z.string(),
  plate: z.string().optional(),
  lat: z.number(),
  lng: z.number(),
  speedKmh: z.number().nullable().optional(),
  heading: z.number().nullable().optional(),
  recordedAt: z.string().datetime(),
  status: vehicleStatusSchema.optional(),
});

export type Position = z.infer<typeof positionSchema>;

export const alarmSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  plate: z.string().optional(),
  type: z.string(),
  message: z.string(),
  severity: z.enum(["critical", "high", "medium", "low", "info"]),
  source: z.enum(["DMS", "GPS", "OBD", "ADAS", "FUEL", "TPMS", "OTHER"]),
  raisedAt: z.string().datetime(),
  acknowledged: z.boolean().optional(),
});

export type Alarm = z.infer<typeof alarmSchema>;

export const tripSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  plate: z.string(),
  driverName: z.string().nullable().optional(),
  origin: z.string(),
  destination: z.string(),
  status: z.enum(["active", "completed", "scheduled", "cancelled"]),
  startedAt: z.string().datetime().nullable().optional(),
  eta: z.string().nullable().optional(),
  progressPercent: z.number().min(0).max(100).nullable().optional(),
  distanceKm: z.number().nullable().optional(),
  costNgn: z.number().nullable().optional(),
});

export type Trip = z.infer<typeof tripSchema>;

export const tripRequestSchema = z.object({
  id: z.string(),
  requesterName: z.string(),
  route: z.string(),
  datetime: z.string(),
  vehicleType: z.string(),
  priority: z.enum(["Normal", "Urgent", "Executive"]),
  status: z.enum(["pending", "approved", "rejected"]).optional(),
});

export type TripRequest = z.infer<typeof tripRequestSchema>;

export const fuelEventSchema = z.object({
  id: z.string(),
  vehicleId: z.string(),
  plate: z.string(),
  kind: z.enum(["refuel", "theft", "low", "drain", "other"]),
  description: z.string(),
  detail: z.string().nullable().optional(),
  at: z.string().datetime(),
});

export type FuelEvent = z.infer<typeof fuelEventSchema>;

export const fuelVehicleRowSchema = z.object({
  vehicleId: z.string(),
  plate: z.string(),
  driverName: z.string().nullable().optional(),
  levelPercent: z.number(),
  litersPer100km: z.number().nullable().optional(),
  todayCostNgn: z.number().nullable().optional(),
  fillEvents: z.number().int(),
  status: z.string(),
});

export type FuelVehicleRow = z.infer<typeof fuelVehicleRowSchema>;

export const obdReadingSchema = z.object({
  vehicleId: z.string(),
  rpm: z.number().nullable().optional(),
  engineTempC: z.number().nullable().optional(),
  batteryV: z.number().nullable().optional(),
  fuelLevelPercent: z.number().nullable().optional(),
  recordedAt: z.string().datetime(),
});

export type ObdReading = z.infer<typeof obdReadingSchema>;

export const tpmsReadingSchema = z.object({
  axle: z.string(),
  position: z.string(),
  pressureKpa: z.number(),
  tempC: z.number().nullable().optional(),
  alert: z.boolean().optional(),
});

export type TpmsReading = z.infer<typeof tpmsReadingSchema>;

export const driverSchema = z.object({
  id: z.string(),
  name: z.string(),
  vehiclePlate: z.string().nullable().optional(),
  score: z.number(),
  driveHours: z.number(),
  restHours: z.number(),
  hosStatus: z.enum(["ok", "warning", "critical"]),
});

export type Driver = z.infer<typeof driverSchema>;

export const breathLogSchema = z.object({
  driverName: z.string(),
  time: z.string(),
  bacPercent: z.string(),
  result: z.enum(["Pass", "Fail"]),
});

export type BreathLog = z.infer<typeof breathLogSchema>;

export const workOrderSchema = z.object({
  id: z.string(),
  vehiclePlate: z.string(),
  type: z.string(),
  issue: z.string(),
  priority: z.enum(["high", "medium", "low"]),
  status: z.string(),
});

export type WorkOrder = z.infer<typeof workOrderSchema>;

export const faultCodeSchema = z.object({
  vehiclePlate: z.string(),
  code: z.string(),
  description: z.string(),
  severity: z.enum(["high", "medium", "low"]),
});

export type FaultCode = z.infer<typeof faultCodeSchema>;

export const sparePartSchema = z.object({
  name: z.string(),
  quantityLabel: z.string(),
  stockStatus: z.enum(["critical", "low", "normal"]),
});

export type SparePart = z.infer<typeof sparePartSchema>;

export const complianceDocSchema = z.object({
  subjectId: z.string(),
  docType: z.string(),
  expiresOn: z.string(),
  band: z.enum(["red", "amber", "green"]),
  statusLabel: z.string(),
});

export type ComplianceDoc = z.infer<typeof complianceDocSchema>;

export const incidentSchema = z.object({
  id: z.string(),
  title: z.string(),
  openedAt: z.string(),
  status: z.string(),
});

export type Incident = z.infer<typeof incidentSchema>;

export const fineSchema = z.object({
  id: z.string(),
  vehiclePlate: z.string(),
  amountNgn: z.number(),
  issuedAt: z.string(),
  violation: z.string(),
});

export type Fine = z.infer<typeof fineSchema>;

/** Raw uctracking list wrapper — tune when you know their real envelope */
export const uctrackingListSchema = z.object({
  data: z.array(z.unknown()).optional(),
  items: z.array(z.unknown()).optional(),
  result: z.array(z.unknown()).optional(),
}).passthrough();

export const dashboardKpiSchema = z.object({
  totalVehicles: z.number(),
  active: z.number(),
  idling: z.number(),
  alarmsOpen: z.number(),
  offline: z.number(),
  kmToday: z.number(),
  // Added for dashboard KPI row
  onlineToday: z.number().optional(),
  avgKmPerDay: z.number().optional(),
  avgOnlineHoursPerDay: z.number().optional(),
});

export type DashboardKpi = z.infer<typeof dashboardKpiSchema>;

export const fleetFooterSchema = z.object({
  lastSyncSecondsAgo: z.number(),
  gpsOnline: z.number(),
  obdOnline: z.number(),
  fuelSensorOnline: z.number(),
  dmsOnline: z.number(),
  tpmsOnline: z.number(),
  version: z.string(),
});

export type FleetFooter = z.infer<typeof fleetFooterSchema>;
