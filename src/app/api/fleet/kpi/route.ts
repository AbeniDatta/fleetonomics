import { NextResponse } from "next/server";
import { demoKpi } from "@/lib/uctracking/demo-data";
import { sumKmTodayFromStatusRows } from "@/lib/dashboard/metrics";
import { getAlarmsPayload, getDeviceStatusGpsPayload, getVehiclesPayload } from "@/lib/api/fleet-handlers";

export async function GET() {
  try {
    const veh = await getVehiclesPayload();
    const alarms = await getAlarmsPayload();
    const vehicles = veh.data ?? [];

    if (veh.source === "demo") {
      return NextResponse.json({
        source: "demo",
        totalVehicles: vehicles.length || demoKpi.totalVehicles,
        active: demoKpi.active,
        idling: demoKpi.idling,
        alarmsOpen: alarms.data?.length ?? demoKpi.alarmsOpen,
        offline: demoKpi.offline,
        kmToday: demoKpi.kmToday,
        onlineToday: demoKpi.onlineToday,
        avgKmPerDay: demoKpi.avgKmPerDay,
        avgOnlineHoursPerDay: demoKpi.avgOnlineHoursPerDay,
      });
    }

    const totalVehicles = vehicles.length;
    const isOnline = (s: string | undefined) => s !== "offline";
    const onlineNow = vehicles.filter((v) => isOnline(v.status)).length;
    const idling = vehicles.filter((v) => v.status === "idle" || v.status === "parked").length;
    const offline = vehicles.filter((v) => v.status === "offline").length;

    const now = new Date();
    const startOfDay = new Date(now);
    startOfDay.setHours(0, 0, 0, 0);

    const onlineToday = vehicles.filter((v) => {
      if (!isOnline(v.status)) return false;
      const t = v.lastSeenAt ? new Date(v.lastSeenAt) : null;
      if (!t || Number.isNaN(t.valueOf())) return true;
      return t >= startOfDay;
    }).length;

    let kmToday = 0;
    if (veh.source === "uctracking") {
      const status = await getDeviceStatusGpsPayload({ geoaddress: 0, toMap: 2 });
      if (status.source === "uctracking" && Array.isArray(status.data)) {
        kmToday = sumKmTodayFromStatusRows(status.data);
      }
    }

    const alarmsOpen = (alarms.data ?? []).filter((a) => a.acknowledged !== true).length;
    const avgKmPerDay = onlineToday > 0 ? Math.round((kmToday / onlineToday) * 10) / 10 : 0;
    const avgOnlineHoursPerDay = totalVehicles > 0 ? Math.round(((24 * onlineNow) / totalVehicles) * 10) / 10 : 0;

    return NextResponse.json({
      source: veh.source,
      totalVehicles,
      active: onlineNow,
      idling,
      alarmsOpen,
      offline,
      kmToday,
      onlineToday,
      avgKmPerDay,
      avgOnlineHoursPerDay,
    });
  } catch {
    return NextResponse.json({ source: "error", ...demoKpi });
  }
}
