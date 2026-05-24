import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { z } from "zod";
import { deleteGeofence, updateGeofence } from "@/lib/geofences/store";

const ringSchema = z.array(z.tuple([z.number(), z.number()])).min(3);

const patchSchema = z.object({
  name: z.string().max(200).optional(),
  ring: ringSchema.optional(),
  enabled: z.boolean().optional(),
});

async function getUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (id && id.length > 0) return id;
  const email = session?.user?.email;
  if (email) return `email:${email}`;
  return null;
}

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  let json: unknown;
  try {
    json = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }
  const parsed = patchSchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid body", details: parsed.error.flatten() }, { status: 400 });
  }
  const res = await updateGeofence(userId, id, parsed.data);
  if ("error" in res) {
    const status = res.error === "not_found" ? 404 : 400;
    return NextResponse.json({ error: res.error }, { status });
  }
  return NextResponse.json({ geofence: res });
}

export async function DELETE(_req: Request, ctx: Ctx) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await ctx.params;
  const ok = await deleteGeofence(userId, id);
  if (!ok) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.json({ ok: true });
}
