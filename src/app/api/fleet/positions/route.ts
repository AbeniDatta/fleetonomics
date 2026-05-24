import { NextResponse } from "next/server";
import { getPositionsPayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  const payload = await getPositionsPayload();
  // `FleetMapInner` expects an array of positions
  return NextResponse.json(payload.data);
}
