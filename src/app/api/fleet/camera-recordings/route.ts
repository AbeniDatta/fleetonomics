import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { channelForRole, type CameraRole } from "@/lib/uctracking/camera-channels";
import { listCameraRecordings } from "@/lib/camera-recordings/store";
import { syncCameraRecordingsForRole } from "@/lib/api/fleet-handlers";

const SYNC_INTERVAL_MS = 15 * 60 * 1000;
let lastSyncByRole: Partial<Record<CameraRole, number>> = {};

function parseRole(v: string | null): CameraRole | null {
  if (v === "DMS" || v === "ADAS") return v;
  return null;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = parseRole(searchParams.get("role"));
  if (!role) return NextResponse.json({ error: "role must be DMS or ADAS" }, { status: 400 });

  const plate = searchParams.get("plate") ?? undefined;
  const devIdno = searchParams.get("devIdno") ?? undefined;
  const hours = Number(searchParams.get("hours") ?? "168");
  const windowHours = Number.isFinite(hours) && hours > 0 ? Math.min(720, hours) : 168;
  const sinceMs = Date.now() - windowHours * 60 * 60 * 1000;
  const sync = searchParams.get("sync") === "true";

  const last = lastSyncByRole[role] ?? 0;
  if (sync || Date.now() - last > SYNC_INTERVAL_MS) {
    try {
      await syncCameraRecordingsForRole(role, { daysBack: 3 });
      lastSyncByRole[role] = Date.now();
    } catch (e) {
      console.error("[camera-recordings] sync failed", e);
    }
  }

  const { source, recordings } = await listCameraRecordings({
    role,
    plate,
    devIdno,
    sinceMs,
    limit: 200,
  });

  return NextResponse.json({
    source,
    role,
    channel: channelForRole(role),
    hours: windowHours,
    recordings,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = new URL(req.url);
  const role = parseRole(searchParams.get("role"));
  if (!role) return NextResponse.json({ error: "role must be DMS or ADAS" }, { status: 400 });

  const result = await syncCameraRecordingsForRole(role, { daysBack: 7 });
  lastSyncByRole[role] = Date.now();
  return NextResponse.json({ ok: true, ...result });
}
