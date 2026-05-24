import { NextResponse } from "next/server";
import { getCameraLiveFeedPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  const channelRaw = searchParams.get("channel");

  if (!devIdno || channelRaw == null) {
    return NextResponse.json({ source: "error", error: "devIdno and channel are required" }, { status: 400 });
  }

  const channel = Number(channelRaw);
  if (!Number.isFinite(channel)) {
    return NextResponse.json({ source: "error", error: "invalid channel" }, { status: 400 });
  }

  const payload = await getCameraLiveFeedPayload({ devIdno, channel });
  if (payload.source === "error" || ("error" in payload && payload.error)) {
    return NextResponse.json(payload, { status: 502 });
  }
  return NextResponse.json(payload);
}
