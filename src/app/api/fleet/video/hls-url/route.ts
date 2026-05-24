import { NextResponse } from "next/server";
import { getVideoHlsUrlPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  const channelRaw = searchParams.get("channel");
  const bitstreamRaw = searchParams.get("bitstream");
  const requestTypeRaw = searchParams.get("requestType");

  if (!devIdno || !channelRaw) {
    return NextResponse.json({ source: "error" as const, error: "devIdno and channel are required" }, { status: 400 });
  }

  const channel = Number(channelRaw);
  const bitstream = bitstreamRaw != null ? Number(bitstreamRaw) : undefined;
  const requestType = requestTypeRaw != null ? Number(requestTypeRaw) : undefined;

  const payload = await getVideoHlsUrlPayload({
    devIdno,
    channel: Number.isFinite(channel) ? channel : 0,
    bitstream: bitstream != null && Number.isFinite(bitstream) ? bitstream : undefined,
    requestType: requestType != null && Number.isFinite(requestType) ? requestType : undefined,
  });
  return NextResponse.json(payload);
}

