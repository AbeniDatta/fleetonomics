import { NextResponse } from "next/server";
import { getTrackPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno") ?? undefined;
  const vehicleNo = searchParams.get("vehicleNo") ?? undefined;
  const beginTime = searchParams.get("beginTime") ?? new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();
  const endTime = searchParams.get("endTime") ?? new Date().toISOString();

  const payload = await getTrackPayload({ devIdno, vehicleNo, beginTime, endTime });
  return NextResponse.json(payload);
}
