import { auth } from "@/auth";

/** Session-scoped key for geofence file store and API handlers (prefer email when present). */
export async function getSessionUserKey(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.trim();
  if (email) return `email:${email.toLowerCase()}`;
  const id = session?.user?.id?.trim();
  if (id) return id;
  return null;
}

export async function getSessionUserEmail(): Promise<string | null> {
  const session = await auth();
  const email = session?.user?.email?.trim();
  return email ? email.toLowerCase() : null;
}
