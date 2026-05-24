import { NextResponse } from "next/server";
import { getSnapPhotosPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const typeRaw = searchParams.get("type");
  const fpLengthRaw = searchParams.get("fpLength");
  const fpOffsetRaw = searchParams.get("fpOffset");
  const mTypeRaw = searchParams.get("mType");
  const fPath = searchParams.get("fPath");
  const saveName = searchParams.get("saveName") ?? undefined;

  if (!typeRaw || !fpLengthRaw || !mTypeRaw || !fPath) {
    return NextResponse.json({ error: "type, fpLength, mType, fPath are required" }, { status: 400 });
  }

  const payload = await getSnapPhotosPayload({
    type: Number(typeRaw),
    fpLength: Number(fpLengthRaw),
    fpOffset: fpOffsetRaw != null ? Number(fpOffsetRaw) : undefined,
    mType: Number(mTypeRaw),
    fPath,
    saveName,
  });
  return NextResponse.json(payload);
}

