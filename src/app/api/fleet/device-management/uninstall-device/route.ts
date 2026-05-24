import { NextResponse } from "next/server";
import { uninstallDevicePayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehIdno = searchParams.get("vehIdno");
  const devIdno = searchParams.get("devIdno");
  if (!vehIdno || !devIdno) return NextResponse.json({ error: "vehIdno and devIdno are required" }, { status: 400 });
  const payload = await uninstallDevicePayload({ vehIdno, devIdno });
  return NextResponse.json(payload);
}

