import { NextResponse } from "next/server";
import { getVideoPlayerUrlPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno") ?? undefined;
  const vehicleNo = searchParams.get("vehicleNo") ?? undefined;
  const channelRaw = searchParams.get("channel");
  const streamRaw = searchParams.get("stream");

  const channel = channelRaw != null ? Number(channelRaw) : undefined;
  const stream = streamRaw != null ? Number(streamRaw) : undefined;

  const payload = await getVideoPlayerUrlPayload({
    devIdno,
    vehicleNo,
    channel: Number.isFinite(channel as number) ? channel : undefined,
    stream: Number.isFinite(stream as number) ? stream : undefined,
  });
  return NextResponse.json(payload);
}

