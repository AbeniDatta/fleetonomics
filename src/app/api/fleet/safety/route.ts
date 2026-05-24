import { NextResponse } from "next/server";

export async function GET() {
  return NextResponse.json({
    source: "mock",
    data: {
    stats: { highRisk: 3, mediumRisk: 11, lowRisk: 820, dmsActive: 774 },
    feed: [
      { id: "1", plate: "NL-0561", message: "Fatigue detected — eyes closing", severity: "critical", source: "DMS", ago: "14m" },
      { id: "2", plate: "NL-0847", message: "Overspeed 98 km/h in 60 zone", severity: "high", source: "GPS", ago: "2m" },
      { id: "3", plate: "NL-0847", message: "Hard brake event — 0.8g", severity: "medium", source: "OBD", ago: "6m" },
    ],
    ranking: [
      { plate: "NL-0561", driver: "B. Danjuma", band: "HIGH", score: 58 },
      { plate: "NL-1203", driver: "A. Eze", band: "HIGH", score: 72 },
      { plate: "NL-0847", driver: "I. Nwosu", band: "HIGH", score: 88 },
    ],
    adas: [
      { label: "Forward collision", count: 14 },
      { label: "Lane departure", count: 22 },
      { label: "Tailgating", count: 9 },
      { label: "Pedestrian", count: 3 },
    ],
    cameraLog: [
      { time: "14:22", plate: "NL-0561", driver: "B. Danjuma", event: "Drowsiness — eye closure", source: "DMS", severity: "Critical" },
      { time: "14:06", plate: "NL-0847", driver: "I. Nwosu", event: "Phone use", source: "DMS", severity: "High" },
    ],
    },
  });
}
