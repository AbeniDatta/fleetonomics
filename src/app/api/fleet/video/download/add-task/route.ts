import { NextResponse } from "next/server";
import { addVideoDownloadTaskPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  // This endpoint has many vendor-specific params; we pass through as-is (except undefined).
  const opts: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    opts[k] = v;
  });
  const payload = await addVideoDownloadTaskPayload(opts);
  return NextResponse.json(payload);
}

