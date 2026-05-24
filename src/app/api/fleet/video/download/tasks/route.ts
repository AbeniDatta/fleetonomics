import { NextResponse } from "next/server";
import { listVideoDownloadTasksPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const payload = await listVideoDownloadTasksPayload({
    devIdno: searchParams.get("devIdno") ?? undefined,
    begintime: searchParams.get("begintime") ?? undefined,
    endtime: searchParams.get("endtime") ?? undefined,
    currentPage: searchParams.get("currentPage") != null ? Number(searchParams.get("currentPage")) : undefined,
    pageRecords: searchParams.get("pageRecords") != null ? Number(searchParams.get("pageRecords")) : undefined,
  });
  return NextResponse.json(payload);
}

