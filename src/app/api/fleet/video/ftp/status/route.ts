import { NextResponse } from "next/server";
import { ftpStatusPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  const seq = searchParams.get("seq");
  if (!devIdno || !seq) return NextResponse.json({ error: "devIdno and seq are required" }, { status: 400 });
  const payload = await ftpStatusPayload({ devIdno, seq });
  return NextResponse.json(payload);
}

