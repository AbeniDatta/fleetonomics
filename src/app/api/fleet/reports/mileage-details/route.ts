import { NextResponse } from "next/server";
import { getMileageDetailsPayload } from "@/lib/api/fleet-handlers";

const RESERVED = new Set(["vehicleNo", "beginTime", "endTime", "byOil", "currentPage", "pageRecords"]);

function vendorFromSearchParams(searchParams: URLSearchParams): Record<string, string | number | undefined> | undefined {
  const vendor: Record<string, string | number | undefined> = {};
  searchParams.forEach((value, key) => {
    if (RESERVED.has(key) || !value) return;
    if (!/^[a-zA-Z][a-zA-Z0-9_-]*$/.test(key)) return;
    const n = Number(value);
    vendor[key] = Number.isFinite(n) && /^-?\d+(\.\d+)?$/.test(value.trim()) ? n : value;
  });
  return Object.keys(vendor).length ? vendor : undefined;
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const vehicleNo = searchParams.get("vehicleNo") ?? undefined;
  const beginTime = searchParams.get("beginTime") ?? new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const endTime = searchParams.get("endTime") ?? new Date().toISOString();
  const byOil = searchParams.get("byOil");
  const currentPage = Number(searchParams.get("currentPage") ?? "1");
  const pageRecords = Number(searchParams.get("pageRecords") ?? "50");

  const vendor = vendorFromSearchParams(searchParams);

  const payload = await getMileageDetailsPayload({
    vehicleNo: vehicleNo && vehicleNo !== "__all__" ? vehicleNo : undefined,
    beginTime,
    endTime,
    byOil: byOil != null && byOil !== "" ? Number(byOil) : undefined,
    currentPage: Number.isFinite(currentPage) ? currentPage : 1,
    pageRecords: Number.isFinite(pageRecords) ? pageRecords : 50,
    vendor,
  });

  return NextResponse.json(payload);
}
