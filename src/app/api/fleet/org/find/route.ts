import { NextResponse } from "next/server";
import { companyFindPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const params: Record<string, string> = {};
  searchParams.forEach((v, k) => {
    params[k] = v;
  });
  return NextResponse.json(await companyFindPayload(params));
}

