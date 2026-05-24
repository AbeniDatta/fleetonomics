import { NextResponse } from "next/server";
import { queryVideoPayload } from "@/lib/api/fleet-handlers";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const devIdno = searchParams.get("devIdno");
  const crossDay = searchParams.get("crossDay") === "true";

  if (!devIdno) return NextResponse.json({ error: "devIdno is required" }, { status: 400 });

  const payload = await queryVideoPayload({
    crossDay,
    devIdno,
    loc: Number(searchParams.get("loc") ?? 1),
    chn: Number(searchParams.get("chn") ?? 0),
    year: searchParams.get("year") ?? new Date().getFullYear(),
    mon: searchParams.get("mon") ?? new Date().getMonth() + 1,
    day: searchParams.get("day") ?? new Date().getDate(),
    recType: searchParams.get("recType") != null ? Number(searchParams.get("recType")) : undefined,
    fileAttr: searchParams.get("fileAttr") != null ? Number(searchParams.get("fileAttr")) : undefined,
    beg: Number(searchParams.get("beg") ?? 0),
    end: Number(searchParams.get("end") ?? 86399),
    arm1: searchParams.get("arm1") != null ? Number(searchParams.get("arm1")) : undefined,
    arm2: searchParams.get("arm2") != null ? Number(searchParams.get("arm2")) : undefined,
    res: searchParams.get("res") != null ? Number(searchParams.get("res")) : undefined,
    stream: searchParams.get("stream") != null ? Number(searchParams.get("stream")) : undefined,
    store: searchParams.get("store") != null ? Number(searchParams.get("store")) : undefined,
  });
  return NextResponse.json(payload);
}

