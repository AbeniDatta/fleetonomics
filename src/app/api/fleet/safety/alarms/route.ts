import { NextResponse } from "next/server";
import { getSafetyAlarmsPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const roleParam = searchParams.get("role")?.toUpperCase();
  const role = roleParam === "ADAS" || roleParam === "DMS" ? roleParam : "all";
  const hours = Number(searchParams.get("hours") ?? "24");
  const payload = await getSafetyAlarmsPayload({
    role,
    hours: Number.isFinite(hours) && hours > 0 ? Math.min(hours, 168) : 24,
  });
  return NextResponse.json(payload);
}
