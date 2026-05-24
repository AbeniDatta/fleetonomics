import { NextResponse } from "next/server";
import { getFooterPayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  const payload = await getFooterPayload();
  return NextResponse.json(payload);
}
