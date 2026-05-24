import { NextResponse } from "next/server";
import { getAlarmsPayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  const payload = await getAlarmsPayload();
  return NextResponse.json(payload);
}
