import { NextResponse } from "next/server";
import { installVehiclePayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehIdno = searchParams.get("vehIdno");
  const devIdno = searchParams.get("devIdno");
  const devTypeRaw = searchParams.get("devType");
  if (!vehIdno || !devIdno) return NextResponse.json({ error: "vehIdno and devIdno are required" }, { status: 400 });
  const payload = await installVehiclePayload({
    vehIdno,
    devIdno,
    devType: devTypeRaw != null ? Number(devTypeRaw) : undefined,
  });
  return NextResponse.json(payload);
}

