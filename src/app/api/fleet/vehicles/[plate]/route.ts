import { NextResponse } from "next/server";
import { getVehiclesPayload } from "@/lib/api/fleet-handlers";
import { getDeviceStatusGpsPayload } from "@/lib/api/fleet-handlers";

type Ctx = { params: Promise<{ plate: string }> };

export async function GET(_req: Request, ctx: Ctx) {
  const { plate } = await ctx.params;
  const decoded = decodeURIComponent(plate);
  const { data } = await getVehiclesPayload();
  const vehicle = data.find((v) => v.plate.toLowerCase() === decoded.toLowerCase());
  if (!vehicle) {
    return NextResponse.json({ error: "Vehicle not found" }, { status: 404 });
  }

  // Best-effort: enrich with the "Device Status(GPS)" endpoint if it returns data for this vehicle.
  // This is real uctracking data; OBD/TPMS are not available from the screenshots provided so far.
  const gpsStatus = await getDeviceStatusGpsPayload({ vehicleNo: vehicle.plate, geoaddress: 1, driver: 1, toMap: 2 });

  return NextResponse.json({
    vehicle,
    gpsStatus,
    obd: null,
    tpms: [],
    trips: [],
  });
}
