import { getPrisma, isDatabaseConfigured } from "@/lib/db";

/** Map session / legacy ids to a real `User.id` for FK-backed tables. */
export async function resolvePersistedUserId(
  sessionUserId: string,
  email?: string | null,
): Promise<string | null> {
  if (!isDatabaseConfigured()) return null;

  const prisma = getPrisma();
  const byId = await prisma.user.findUnique({ where: { id: sessionUserId }, select: { id: true } });
  if (byId) return byId.id;

  const lookupEmail = sessionUserId.startsWith("email:")
    ? sessionUserId.slice("email:".length)
    : (email?.trim() || null);

  if (lookupEmail) {
    const byEmail = await prisma.user.findUnique({ where: { email: lookupEmail }, select: { id: true } });
    if (byEmail) return byEmail.id;
  }

  if (sessionUserId === "demo-ops") {
    const demoEmail = process.env.AUTH_DEMO_EMAIL ?? "ops@nlng.local";
    const demo = await prisma.user.findUnique({ where: { email: demoEmail }, select: { id: true } });
    if (demo) return demo.id;
  }

  return null;
}
