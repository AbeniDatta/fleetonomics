import { NextResponse } from "next/server";
import { getDeviceStatusGpsPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno") ?? undefined;
  const vehicleNo = searchParams.get("vehicleNo") ?? undefined;
  const geoaddress = searchParams.get("geoaddress");
  const driver = searchParams.get("driver");
  const toMap = searchParams.get("toMap");

  const payload = await getDeviceStatusGpsPayload({
    devIdno,
    vehicleNo,
    geoaddress: geoaddress != null ? Number(geoaddress) : undefined,
    driver: driver != null ? Number(driver) : undefined,
    toMap: toMap != null ? Number(toMap) : 2,
  });
  return NextResponse.json(payload);
}
