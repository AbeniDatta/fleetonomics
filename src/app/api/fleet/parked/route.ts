import { NextResponse } from "next/server";
import { getParkedPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehicleNo = searchParams.get("vehicleNo") ?? undefined;
  const beginTime = searchParams.get("beginTime") ?? new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const endTime = searchParams.get("endTime") ?? new Date().toISOString();
  const parkTime = searchParams.get("parkTime");

  const payload = await getParkedPayload({
    vehicleNo,
    beginTime,
    endTime,
    parkTime: parkTime != null ? Number(parkTime) : undefined,
    toMap: 2,
  });
  return NextResponse.json(payload);
}
