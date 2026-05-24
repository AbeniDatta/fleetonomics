import { NextResponse } from "next/server";
import { deleteVideoDownloadTaskPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  const taskTag = searchParams.get("taskTag");
  if (!devIdno || !taskTag) return NextResponse.json({ error: "devIdno and taskTag are required" }, { status: 400 });
  const payload = await deleteVideoDownloadTaskPayload({ devIdno, taskTag });
  return NextResponse.json(payload);
}

