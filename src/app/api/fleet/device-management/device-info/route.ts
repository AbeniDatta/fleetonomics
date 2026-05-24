import { NextResponse } from "next/server";
import { getDeviceInfoPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  if (!devIdno) return NextResponse.json({ error: "devIdno is required" }, { status: 400 });
  const payload = await getDeviceInfoPayload({ devIdno });
  return NextResponse.json(payload);
}

