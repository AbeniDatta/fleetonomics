import { NextResponse } from "next/server";
import { getDeviceOnlinePayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno") ?? undefined;
  const vehicleNo = searchParams.get("vehicleNo") ?? undefined;
  const status = searchParams.get("status");

  const payload = await getDeviceOnlinePayload({
    devIdno,
    vehicleNo,
    status: status != null ? Number(status) : undefined,
  });
  return NextResponse.json(payload);
}
