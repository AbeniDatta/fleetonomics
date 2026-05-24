import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { demoTripRequests, demoTrips } from "@/lib/uctracking/demo-data";

function formatTripDatetime(date: Date): string {
  const today = new Date();
  const isToday =
    date.getFullYear() === today.getFullYear() &&
    date.getMonth() === today.getMonth() &&
    date.getDate() === today.getDate();
  const time = date.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit", hour12: false });
  return isToday ? `Today ${time}` : date.toLocaleString("en-GB");
}

export async function GET() {
  const active = demoTrips;
  const stats = {
    activeCount: active.length,
    completedToday: 1892,
    pendingApproval: 0,
    kmToday: 18420,
  };

  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      source: "mock",
      data: {
        active,
        requests: demoTripRequests,
        stats: { ...stats, pendingApproval: 34 },
      },
    });
  }

  try {
    const bookings = await getPrisma().tripBooking.findMany({
      orderBy: { scheduledAt: "asc" },
      take: 50,
    });

    const pendingApproval = bookings.filter((b) => b.status === "pending").length;

    return NextResponse.json({
      source: "database",
      data: {
        active,
        requests: bookings.map((b) => ({
          id: b.id,
          requesterName: b.requester,
          route: b.route,
          datetime: formatTripDatetime(b.scheduledAt),
          vehicleType: b.vehicleType,
          priority: b.priority,
        })),
        stats: { ...stats, pendingApproval },
      },
    });
  } catch (err) {
    console.error("[trips] database error", err);
    return NextResponse.json({
      source: "mock",
      data: {
        active,
        requests: demoTripRequests,
        stats: { ...stats, pendingApproval: 34 },
      },
    });
  }
}
