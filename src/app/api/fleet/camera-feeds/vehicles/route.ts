import { NextResponse } from "next/server";
import { getCameraFeedVehiclesPayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  const payload = await getCameraFeedVehiclesPayload();
  return NextResponse.json(payload);
}
