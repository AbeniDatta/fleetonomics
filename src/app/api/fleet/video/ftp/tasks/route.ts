import { NextResponse } from "next/server";
import { ftpTaskListPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  const begintime = searchParams.get("begintime");
  const endtime = searchParams.get("endtime");
  if (!devIdno || !begintime || !endtime) {
    return NextResponse.json({ error: "devIdno, begintime, endtime are required" }, { status: 400 });
  }
  const payload = await ftpTaskListPayload({
    devIdno,
    begintime,
    endtime,
    currentPage: searchParams.get("currentPage") != null ? Number(searchParams.get("currentPage")) : undefined,
    pageRecords: searchParams.get("pageRecords") != null ? Number(searchParams.get("pageRecords")) : undefined,
    status: searchParams.get("status") ?? undefined,
  });
  return NextResponse.json(payload);
}

