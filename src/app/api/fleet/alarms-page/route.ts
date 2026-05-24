import { NextResponse } from "next/server";
import { getAlarmPagePayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno") ?? undefined;
  const vehicleNo = searchParams.get("vehicleNo") ?? undefined;
  const beginTime = searchParams.get("beginTime") ?? new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const endTime = searchParams.get("endTime") ?? new Date().toISOString();
  const currentPage = Number(searchParams.get("currentPage") ?? "1");
  const pageRecords = Number(searchParams.get("pageRecords") ?? "20");
  const armType = searchParams.get("armType") ?? undefined;
  const handle = searchParams.get("handle");

  const payload = await getAlarmPagePayload({
    devIdno,
    vehicleNo,
    beginTime,
    endTime,
    currentPage: Number.isFinite(currentPage) ? currentPage : 1,
    pageRecords: Number.isFinite(pageRecords) ? pageRecords : 20,
    armType,
    handle: handle != null ? Number(handle) : undefined,
  });
  return NextResponse.json(payload);
}
