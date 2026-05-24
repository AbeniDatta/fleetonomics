import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserKey } from "@/lib/auth/session-user";
import { isDatabaseConfigured } from "@/lib/db";
import { appendGeofenceEvents, listGeofenceEventsForUser } from "@/lib/geofence-events/store";

export async function GET(req: Request) {
  const userId = await getSessionUserKey();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const hours = Number(searchParams.get("hours") ?? "24");
  const windowHours = Number.isFinite(hours) && hours > 0 ? Math.min(168, hours) : 24;
  const sinceMs = Date.now() - windowHours * 60 * 60 * 1000;

  const events = await listGeofenceEventsForUser(userId, sinceMs);
  const source = isDatabaseConfigured() ? ("database" as const) : ("app" as const);
  return NextResponse.json({ source, hours: windowHours, events });
}

const postSchema = z.object({
  events: z
    .array(
      z.object({
        fenceId: z.string().min(1),
        fenceName: z.string().min(1).max(200),
        vehicleId: z.string().min(1),
        plate: z.string().min(1).max(40),
        kind: z.enum(["exit", "cross"]),
        message: z.string().min(1).max(500),
        at: z.string().optional(),
        lat: z.number(),
        lng: z.number(),
      }),
    )
    .min(1)
    .max(200),
});

export async function POST(req: Request) {
  const userId = await getSessionUserKey();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = postSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }

  const res = await appendGeofenceEvents(userId, parsed.data.events);
  return NextResponse.json({ ok: true, saved: res.saved.length });
}

