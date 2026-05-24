import { NextResponse } from "next/server";
import { z } from "zod";
import { getSessionUserKey } from "@/lib/auth/session-user";
import { createGeofence, listGeofencesForUser } from "@/lib/geofences/store";

const ringSchema = z.array(z.tuple([z.number(), z.number()])).min(3);

const postSchema = z.object({
  name: z.string().max(200).optional(),
  ring: ringSchema,
  enabled: z.boolean().optional(),
});

export async function GET() {
  const userId = await getSessionUserKey();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const geofences = await listGeofencesForUser(userId);
  return NextResponse.json({ geofences });
}

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
  const res = await createGeofence(userId, {
    name: parsed.data.name ?? "Geofence",
    ring: parsed.data.ring,
    enabled: parsed.data.enabled,
  });
  if ("error" in res) return NextResponse.json({ error: res.error }, { status: 400 });
  return NextResponse.json({ geofence: res });
}
