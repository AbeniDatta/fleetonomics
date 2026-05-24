import { NextResponse } from "next/server";
import { controlVideoDownloadPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const seq = searchParams.get("seq");
  const devIdno = searchParams.get("devIdno");
  const taskType = searchParams.get("taskType");
  if (!seq || !devIdno || !taskType) {
    return NextResponse.json({ error: "seq, devIdno, taskType are required" }, { status: 400 });
  }
  const payload = await controlVideoDownloadPayload({ seq, devIdno, taskType });
  return NextResponse.json(payload);
}

