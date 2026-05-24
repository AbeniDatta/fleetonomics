import { NextResponse } from "next/server";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

export async function GET() {
  if (!isDatabaseConfigured()) {
    return NextResponse.json(
      { ok: false, error: "DATABASE_URL is missing or still has placeholder values" },
      { status: 503 },
    );
  }

  try {
    await getPrisma().$queryRaw`SELECT 1`;
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[health/db]", err);
    return NextResponse.json(
      { ok: false, error: err instanceof Error ? err.message : "Database unreachable" },
      { status: 503 },
    );
  }
}
