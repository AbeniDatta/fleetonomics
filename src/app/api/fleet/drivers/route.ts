import { NextResponse } from "next/server";
import { demoBreath, demoDrivers } from "@/lib/uctracking/demo-data";

export async function GET() {
  return NextResponse.json({
    source: "mock",
    data: {
      stats: {
        total: 1247,
        onShift: 834,
        hosViolations: 12,
        restDueSoon: 38,
      },
      roster: demoDrivers,
      breathalyzer: demoBreath,
    },
  });
}
