import { NextResponse } from "next/server";
import { ftpUploadPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const opts: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    opts[k] = v;
  });
  const payload = await ftpUploadPayload(opts);
  return NextResponse.json(payload);
}

