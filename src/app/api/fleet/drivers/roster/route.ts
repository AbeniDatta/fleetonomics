import { NextResponse } from "next/server";
import { queryDriverListPayload } from "@/lib/api/fleet-handlers";
import { extractDriverListTotal, normalizeDriverListPayload } from "@/lib/uctracking/normalize-driver-list";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    params[k] = v;
  });

  const payload = await queryDriverListPayload(params);
  const drivers = payload.data != null ? normalizeDriverListPayload(payload.data) : [];
  const total = extractDriverListTotal(payload.data) ?? drivers.length;

  return NextResponse.json({
    source: payload.source,
    drivers,
    total,
    raw: payload.data,
  });
}
