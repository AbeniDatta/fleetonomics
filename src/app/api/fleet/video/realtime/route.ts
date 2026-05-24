import { NextResponse } from "next/server";
import { startRealtimeVideoPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  const chn = searchParams.get("chn");
  const secRaw = searchParams.get("sec");
  const label = searchParams.get("label") ?? undefined;

  if (!devIdno || !chn || !secRaw) {
    return NextResponse.json({ error: "devIdno, chn, sec are required" }, { status: 400 });
  }

  const sec = Number(secRaw);
  const payload = await startRealtimeVideoPayload({ devIdno, chn, sec: Number.isFinite(sec) ? sec : 60, label });
  return NextResponse.json(payload);
}

