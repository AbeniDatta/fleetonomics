import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";
import { demoFaults, demoParts, demoWorkOrders } from "@/lib/uctracking/demo-data";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json({
      source: "mock",
      data: {
        stats: { dueThisWeek: 24, overdue: 8, inWorkshop: 12, spendMtdNgn: 18_400_000 },
        workOrders: demoWorkOrders,
        faults: demoFaults,
        parts: demoParts,
      },
    });
  }

  try {
    const workOrders = await getPrisma().workOrder.findMany({
      orderBy: { createdAt: "desc" },
      take: 50,
    });

    const inWorkshop = workOrders.filter((w) => w.status.toLowerCase().includes("progress")).length;
    const overdue = workOrders.filter((w) => w.priority === "high" && w.status !== "Complete").length;

    return NextResponse.json({
      source: "database",
      data: {
        stats: {
          dueThisWeek: workOrders.length,
          overdue,
          inWorkshop,
          spendMtdNgn: 18_400_000,
        },
        workOrders: workOrders.map((w) => ({
          id: w.id,
          vehiclePlate: w.vehiclePlate,
          type: w.type,
          issue: w.issue,
          priority: w.priority,
          status: w.status,
        })),
        faults: demoFaults,
        parts: demoParts,
      },
    });
  } catch (err) {
    console.error("[maintenance] database error", err);
    return NextResponse.json({
      source: "mock",
      data: {
        stats: { dueThisWeek: 24, overdue: 8, inWorkshop: 12, spendMtdNgn: 18_400_000 },
        workOrders: demoWorkOrders,
        faults: demoFaults,
        parts: demoParts,
      },
    });
  }
}
