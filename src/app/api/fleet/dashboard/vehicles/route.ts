import { NextResponse } from "next/server";
import { getDashboardVehicleTablePayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  const payload = await getDashboardVehicleTablePayload();
  return NextResponse.json(payload);
}
