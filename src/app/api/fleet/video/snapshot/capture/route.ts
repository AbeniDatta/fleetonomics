import { NextResponse } from "next/server";
import { capturePicturePayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  const chn = searchParams.get("chn");
  const typeRaw = searchParams.get("type");
  const resolutionRaw = searchParams.get("resolution");

  if (!devIdno || !chn || !typeRaw) {
    return NextResponse.json({ error: "devIdno, chn, type are required" }, { status: 400 });
  }

  const type = Number(typeRaw);
  const resolution = resolutionRaw != null ? Number(resolutionRaw) : undefined;

  const payload = await capturePicturePayload({
    devIdno,
    chn,
    type: Number.isFinite(type) ? type : 1,
    resolution: resolution != null && Number.isFinite(resolution) ? resolution : undefined,
  });
  return NextResponse.json(payload);
}

