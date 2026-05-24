import { NextResponse } from "next/server";
import {
  getDeviceStatusGpsPayload,
  getFuelPerVehiclePayload,
  getVehiclesPayload,
} from "@/lib/api/fleet-handlers";
import { findVehicleByRouteKey } from "@/lib/vehicle-plates/keys";

type Ctx = { params: Promise<{ plate: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { plate } = await ctx.params;
  const decoded = decodeURIComponent(plate);
  const { data } = await getVehiclesPayload();
  const vehicle = findVehicleByRouteKey(data, decoded);
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  const devIdno = vehicle.devIdno?.trim() || vehicle.plate;

  const [gpsStatus, fuelRes] = await Promise.all([
    getDeviceStatusGpsPayload({
      devIdno,
      vehicleNo: vehicle.plate,
      geoaddress: 1,
      driver: 1,
      toMap: 2,
    }),
    getFuelPerVehiclePayload(),
  ]);

  const fuelRow =
    fuelRes.vehicles.find(
      (r) =>
        r.vehicleId === vehicle.id ||
        r.plate === vehicle.plate ||
        r.devIdno === devIdno ||
        (vehicle.plateNumber && r.plate === vehicle.plate),
    ) ?? null;

  return NextResponse.json({
    vehicle,
    gpsStatus,
    fuel: fuelRow,
    obd: null,
    tpms: [],
    trips: [],
  });
}
