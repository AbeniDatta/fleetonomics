import type {
  Alarm,
  BreathLog,
  ComplianceDoc,
  DashboardKpi,
  Driver,
  FaultCode,
  Fine,
  FleetFooter,
  FuelEvent,
  FuelVehicleRow,
  Incident,
  ObdReading,
  Position,
  SparePart,
  Trip,
  TripRequest,
  TpmsReading,
  Vehicle,
  WorkOrder,
} from "./schemas";

export const demoKpi: DashboardKpi = {
  totalVehicles: 1247,
  active: 834,
  idling: 89,
  alarmsOpen: 23,
  offline: 142,
  kmToday: 18420,
  onlineToday: 1032,
  avgKmPerDay: 42.8,
  avgOnlineHoursPerDay: 18.6,
};

export const demoFooter: FleetFooter = {
  lastSyncSecondsAgo: 8,
  gpsOnline: 1105,
  obdOnline: 980,
  fuelSensorOnline: 820,
  dmsOnline: 774,
  tpmsOnline: 640,
  version: "2.4.1",
};

export const demoVehicles: Vehicle[] = [
  {
    id: "v1",
    plate: "NL-0847",
    driverName: "I. Nwosu",
    type: "Truck",
    status: "moving",
    speedKmh: 98,
    locationLabel: "Bonny Rd 4",
    position: { lat: 4.45, lng: 7.18 },
    fuelPercent: 68,
    driverScore: 88,
    alarmSummary: "Overspeed",
  },
  {
    id: "v2",
    plate: "NL-1203",
    driverName: "A. Eze",
    type: "SUV",
    status: "breach",
    speedKmh: 42,
    locationLabel: "PH Gate",
    position: { lat: 4.82, lng: 7.05 },
    fuelPercent: 45,
    driverScore: 72,
    alarmSummary: "Geofence",
  },
  {
    id: "v3",
    plate: "NL-0392",
    driverName: "O. Femi",
    type: "Van",
    status: "parked",
    speedKmh: 0,
    locationLabel: "Depot A",
    position: { lat: 4.78, lng: 7.02 },
    fuelPercent: 22,
    driverScore: 91,
    alarmSummary: "Fuel drop",
  },
  {
    id: "v4",
    plate: "NL-0561",
    driverName: "B. Danjuma",
    type: "Truck",
    status: "moving",
    speedKmh: 67,
    locationLabel: "Trans-Amadi",
    position: { lat: 4.75, lng: 7.1 },
    fuelPercent: 74,
    driverScore: 58,
    alarmSummary: "Fatigue",
  },
  {
    id: "v5",
    plate: "NL-0114",
    driverName: "C. Abubakar",
    type: "Bus",
    status: "moving",
    speedKmh: 55,
    locationLabel: "Eleme Jct",
    position: { lat: 4.76, lng: 7.08 },
    fuelPercent: 83,
    driverScore: 79,
    alarmSummary: "HOS",
  },
  {
    id: "v6",
    plate: "NL-0229",
    driverName: "M. Yusuf",
    type: "Truck",
    status: "offline",
    speedKmh: null,
    locationLabel: null,
    position: null,
    fuelPercent: null,
    driverScore: 85,
    alarmSummary: "Offline",
  },
  {
    id: "v7",
    plate: "NL-0774",
    driverName: "F. Okeke",
    type: "Van",
    status: "parked",
    speedKmh: 0,
    locationLabel: "Depot B",
    position: { lat: 4.79, lng: 7.03 },
    fuelPercent: 91,
    driverScore: 94,
    alarmSummary: null,
  },
  {
    id: "v8",
    plate: "NL-0318",
    driverName: "S. Adamu",
    type: "Truck",
    status: "moving",
    speedKmh: 72,
    locationLabel: "PH Refinery",
    position: { lat: 4.8, lng: 7.04 },
    fuelPercent: 77,
    driverScore: 82,
    alarmSummary: null,
  },
];

export const demoAlarms: Alarm[] = [
  {
    id: "a1",
    vehicleId: "v1",
    plate: "NL-0847",
    type: "overspeed",
    message: "Overspeed 98 km/h",
    severity: "high",
    source: "GPS",
    raisedAt: new Date(Date.now() - 120_000).toISOString(),
  },
  {
    id: "a2",
    vehicleId: "v2",
    plate: "NL-1203",
    type: "geofence",
    message: "Geofence breach",
    severity: "high",
    source: "GPS",
    raisedAt: new Date(Date.now() - 300_000).toISOString(),
  },
  {
    id: "a3",
    vehicleId: "v3",
    plate: "NL-0392",
    type: "fuel",
    message: "Fuel drain detected",
    severity: "medium",
    source: "FUEL",
    raisedAt: new Date(Date.now() - 660_000).toISOString(),
  },
  {
    id: "a4",
    vehicleId: "v4",
    plate: "NL-0561",
    type: "fatigue",
    message: "Fatigue (DMS)",
    severity: "critical",
    source: "DMS",
    raisedAt: new Date(Date.now() - 840_000).toISOString(),
  },
];

export const demoPositions: Position[] = demoVehicles
  .filter((v) => v.position)
  .map((v) => ({
    vehicleId: v.id,
    plate: v.plate,
    lat: v.position!.lat,
    lng: v.position!.lng,
    speedKmh: v.speedKmh ?? 0,
    heading: 90,
    recordedAt: new Date().toISOString(),
    status: v.status,
  }));

export const demoTrips: Trip[] = [
  {
    id: "t1",
    vehicleId: "v1",
    plate: "NL-0847",
    driverName: "I. Nwosu",
    origin: "Depot A",
    destination: "PH Refinery",
    status: "active",
    eta: "14:55",
    progressPercent: 65,
  },
  {
    id: "t2",
    vehicleId: "v4",
    plate: "NL-0561",
    driverName: "B. Danjuma",
    origin: "Bonny",
    destination: "Eleme Jct",
    status: "active",
    eta: "15:20",
    progressPercent: 40,
  },
];

export const demoTripRequests: TripRequest[] = [
  {
    id: "tr1",
    requesterName: "E. Chukwu",
    route: "Trans-Amadi → Depot A",
    datetime: "Today 16:00",
    vehicleType: "SUV",
    priority: "Normal",
    status: "pending",
  },
  {
    id: "tr2",
    requesterName: "M. Hassan",
    route: "Bonny → PH Port",
    datetime: "Today 17:30",
    vehicleType: "Truck",
    priority: "Urgent",
    status: "pending",
  },
];

export const demoFuelEvents: FuelEvent[] = [
  {
    id: "f1",
    vehicleId: "v3",
    plate: "NL-0392",
    kind: "theft",
    description: "Theft suspected",
    detail: "22% → 22%",
    at: new Date().toISOString(),
  },
  {
    id: "f2",
    vehicleId: "v7",
    plate: "NL-0774",
    kind: "refuel",
    description: "Refuel +120L",
    detail: "45% → 91%",
    at: new Date().toISOString(),
  },
];

export const demoFuelRows: FuelVehicleRow[] = demoVehicles.slice(0, 5).map((v, i) => ({
  vehicleId: v.id,
  plate: v.plate,
  driverName: v.driverName ?? null,
  levelPercent: v.fuelPercent ?? 0,
  litersPer100km: 8.4 + i * 0.3,
  todayCostNgn: 12000 + i * 7000,
  fillEvents: i % 2,
  status: v.plate === "NL-0392" ? "Theft alert" : "Normal",
}));

export const demoObd: ObdReading = {
  vehicleId: "v1",
  rpm: 2100,
  engineTempC: 88,
  batteryV: 13.8,
  fuelLevelPercent: 68,
  recordedAt: new Date().toISOString(),
};

export const demoTpms: TpmsReading[] = [
  { axle: "Front", position: "L", pressureKpa: 820, tempC: 38, alert: false },
  { axle: "Front", position: "R", pressureKpa: 805, tempC: 37, alert: false },
  { axle: "Rear", position: "L1", pressureKpa: 780, tempC: 40, alert: true },
  { axle: "Rear", position: "R1", pressureKpa: 790, tempC: 39, alert: false },
];

export const demoDrivers: Driver[] = [
  { id: "d1", name: "I. Nwosu", vehiclePlate: "NL-0847", score: 88, driveHours: 3.5, restHours: 1.0, hosStatus: "critical" },
  { id: "d2", name: "A. Eze", vehiclePlate: "NL-1203", score: 72, driveHours: 2.1, restHours: 2.4, hosStatus: "warning" },
  { id: "d3", name: "O. Femi", vehiclePlate: "NL-0392", score: 91, driveHours: 0, restHours: 11, hosStatus: "ok" },
];

export const demoBreath: BreathLog[] = [
  { driverName: "I. Nwosu", time: "06:12", bacPercent: "0.00%", result: "Pass" },
  { driverName: "B. Danjuma", time: "05:48", bacPercent: "0.00%", result: "Pass" },
];

export const demoWorkOrders: WorkOrder[] = [
  { id: "WO-441", vehiclePlate: "NL-0561", type: "Scheduled", issue: "50,000km service", priority: "medium", status: "In progress" },
  { id: "WO-440", vehiclePlate: "NL-0392", type: "Unscheduled", issue: "Fuel sensor check", priority: "high", status: "Pending" },
];

export const demoFaults: FaultCode[] = [
  { vehiclePlate: "NL-1203", code: "P0301", description: "Cylinder 1 misfire", severity: "high" },
  { vehiclePlate: "NL-0847", code: "P0420", description: "Catalyst efficiency", severity: "medium" },
];

export const demoParts: SparePart[] = [
  { name: "Engine oil 5W40", quantityLabel: "142 units", stockStatus: "normal" },
  { name: "Brake pads (front)", quantityLabel: "8 units", stockStatus: "low" },
];

export const demoCompliance: ComplianceDoc[] = [
  { subjectId: "NL-0392", docType: "Road worthiness", expiresOn: "2026-05-01", band: "red", statusLabel: "Expired" },
  { subjectId: "NL-0847", docType: "Insurance policy", expiresOn: "2026-05-18", band: "red", statusLabel: "7 days" },
];

export const demoIncidents: Incident[] = [
  { id: "inc1", title: "Minor bump — NL-1203", openedAt: "2026-05-02", status: "Investigating" },
];

export const demoFines: Fine[] = [
  { id: "fn1", vehiclePlate: "NL-0847", amountNgn: 25000, issuedAt: "2026-05-01", violation: "Speeding" },
];

export function hourlyFuelSeries(): { hour: string; liters: number }[] {
  return ["12a", "2a", "4a", "6a", "8a", "10a", "12p", "2p", "4p", "6p", "8p", "10p"].map((hour, i) => ({
    hour,
    liters: 300 + Math.round(180 * Math.sin(i / 2) + i * 15),
  }));
}
