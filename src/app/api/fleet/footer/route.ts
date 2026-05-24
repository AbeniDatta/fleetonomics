import { NextResponse } from "next/server";
import { demoFooter } from "@/lib/uctracking/demo-data";

export async function GET() {
  return NextResponse.json({ source: "mock", data: demoFooter });
}
