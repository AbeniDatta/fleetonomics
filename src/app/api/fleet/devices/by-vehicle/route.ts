import { NextResponse } from "next/server";
import { getDevByVehiclePayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehicleNo = searchParams.get("vehicleNo");
  if (!vehicleNo) return NextResponse.json({ error: "vehicleNo is required" }, { status: 400 });

  const payload = await getDevByVehiclePayload({ vehicleNo });
  return NextResponse.json(payload);
}
