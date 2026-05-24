import { NextResponse } from "next/server";
import { getVehiclesPayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  const payload = await getVehiclesPayload();
  return NextResponse.json(payload);
}
