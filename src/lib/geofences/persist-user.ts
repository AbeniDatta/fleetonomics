import { hash } from "bcryptjs";
import { getPrisma, isDatabaseConfigured } from "@/lib/db";

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function emailFromSessionKey(sessionUserId: string, email?: string | null): string | null {
  if (email?.trim()) return normalizeEmail(email);
  if (sessionUserId.startsWith("email:")) return normalizeEmail(sessionUserId.slice("email:".length));
  if (sessionUserId === "demo-ops") {
    const demo = process.env.AUTH_DEMO_EMAIL?.trim();
    return demo ? normalizeEmail(demo) : null;
  }
  return null;
}

/** Map session / legacy ids to a real `User.id` for FK-backed tables. */
export async function resolvePersistedUserId(
  sessionUserId: string,
  email?: string | null,
): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  const prisma = getPrisma();
  const byId = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true } });
  if (byId) return byId.id;

  const lookupEmail = emailFromSessionKey(sessionUserId, email);
  if (lookupEmail) {
    const byEmail = await prisma.user.findUnique({ where: { email: lookupEmail }, select: { id: true } });
    if (byEmail) return byEmail.id;
  }

  return null;
}

/**
 * Resolve a DB user id for geofence persistence. Creates the demo User row when missing
 * (same as `prisma db seed`) so demo / demo-ops sessions can write to PostgreSQL.
 */
export async function ensurePersistedUserId(
  sessionUserId: string,
  email?: string | null,
): Promise<string | null> {
  const existing = await resolvePersistedUserId(sessionUserId, email);
  if (existing) return existing;
  if (!isDatabaseConfigured()) return null;

  const lookupEmail = emailFromSessionKey(sessionUserId, email);
  if (!lookupEmail) return null;

  const demoEmail = normalizeEmail(process.env.AUTH_DEMO_EMAIL ?? "ops@nlng.local");
  if (lookupEmail !== demoEmail) return null;

  const demoPassword = process.env.AUTH_DEMO_PASSWORD ?? "changeme";
  const demoRoles = (process.env.AUTH_DEMO_ROLES ?? "Ops Manager,Admin")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);

  const passwordHash = await hash(demoPassword, 12);
  const prisma = getPrisma();
  const user = await prisma.user.upsert({
    where: { email: lookupEmail },
    update: { name: "Ops Manager", passwordHash, roles: demoRoles },
    create: {
      email: lookupEmail,
      name: "Ops Manager",
      passwordHash,
      roles: demoRoles,
    },
    select: { id: true },
  });
  return user.id;
}
