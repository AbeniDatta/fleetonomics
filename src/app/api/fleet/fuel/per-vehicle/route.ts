import { NextResponse } from "next/server";
import { getFuelPerVehiclePayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  const payload = await getFuelPerVehiclePayload();
  return NextResponse.json(payload);
}
