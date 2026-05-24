import { NextResponse } from "next/server";
import { getDashboardFuelHourlyPayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  const payload = await getDashboardFuelHourlyPayload();
  return NextResponse.json(payload);
}
