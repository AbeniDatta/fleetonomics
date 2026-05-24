import { NextResponse } from "next/server";
import { deleteVehiclePayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehIdno = searchParams.get("vehIdno");
  const delDeviceRaw = searchParams.get("delDevice");
  if (!vehIdno) return NextResponse.json({ error: "vehIdno is required" }, { status: 400 });
  const payload = await deleteVehiclePayload({
    vehIdno,
    delDevice: delDeviceRaw != null ? Number(delDeviceRaw) : undefined,
  });
  return NextResponse.json(payload);
}

