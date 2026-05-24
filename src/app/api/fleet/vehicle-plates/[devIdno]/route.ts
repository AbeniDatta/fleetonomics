import { NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { setPlateOverride } from "@/lib/vehicle-plates/store";

const patchSchema = z.object({
  plateNumber: z.string().max(64).nullable(),
});

type Ctx = { params: Promise<{ devIdno: string }> };

async function getUserId(): Promise<string | null> {
  const session = await auth();
  const id = session?.user?.id;
  if (id && id.length > 0) return id;
  const email = session?.user?.email;
  if (email) return `email:${email}`;
  return null;
}

export async function PATCH(req: Request, ctx: Ctx) {
  const userId = await getUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { devIdno } = await ctx.params;
  const decoded = decodeURIComponent(devIdno).trim();
  if (!decoded) return NextResponse.json({ error: "invalid_key" }, { status: 400 });

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

  const res = await setPlateOverride(decoded, parsed.data.plateNumber, userId);
  if ("error" in res) {
    return NextResponse.json({ error: res.error }, { status: 400 });
  }

  return NextResponse.json(res);
}
