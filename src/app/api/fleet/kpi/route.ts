import { NextResponse } from "next/server";
import { demoKpi } from "@/lib/uctracking/demo-data";
import { getAlarmsPayload, getVehiclesPayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  try {
    const veh = await getVehiclesPayload();
    const alarms = await getAlarmsPayload();

    const vehicles = veh.data ?? [];
    const totalVehicles = vehicles.length || demoKpi.totalVehicles;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const isOnline = (s: string | undefined) => s !== "offline";
    const onlineNow = vehicles.filter((v) => isOnline(v.status)).length;
    const idling = vehicles.filter((v) => v.status === "idle" || v.status === "parked").length;
    const offline = vehicles.filter((v) => v.status === "offline").length;

    const onlineToday = vehicles.filter((v) => {
      if (!isOnline(v.status)) return false;
      const t = v.lastSeenAt ? new Date(v.lastSeenAt) : null;
      if (!t || Number.isNaN(t.valueOf())) return true; // no timestamp but online => count it
      return t >= startOfDay;
    }).length;

    // Best-effort derived metrics (uctracking doesn't give fleet-wide km/day or online-hours/day in one call)
    const kmToday = demoKpi.kmToday;
    const avgKmPerDay = onlineToday > 0 ? kmToday / onlineToday : 0;
    const avgOnlineHoursPerDay = totalVehicles > 0 ? (24 * onlineNow) / totalVehicles : 0;

    return NextResponse.json({
      totalVehicles,
      active: onlineNow,
      idling,
      alarmsOpen: alarms.data?.length ?? demoKpi.alarmsOpen,
      offline,
      kmToday,
      onlineToday,
      avgKmPerDay,
      avgOnlineHoursPerDay,
    });
  } catch {
    return NextResponse.json(demoKpi);
  }
}
