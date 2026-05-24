import { compare } from "bcryptjs";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "@/auth.config";

const demoEmail = process.env.AUTH_DEMO_EMAIL ?? "ops@nlng.local";
const demoPassword = process.env.AUTH_DEMO_PASSWORD ?? "changeme";

async function authorizeWithDatabase(email: string, password: string) {
  const { getPrisma } = await import("@/lib/db");
  const user = await getPrisma().user.findUnique({ where: { email: normalizeEmail(email) } });
  if (!user) return null;
  const valid = await compare(password, user.passwordHash);
  if (!valid) return null;
  return {
    id: user.id,
    name: user.name ?? user.email,
    email: user.email,
    roles: user.roles,
  };
}

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function authorizeWithDemo(email: string, password: string) {
  if (normalizeEmail(email) !== normalizeEmail(demoEmail) || password !== demoPassword) return null;
  const roles = (process.env.AUTH_DEMO_ROLES ?? "Ops Manager")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  return {
    id: "demo-ops",
    name: "Ops Manager",
    email,
    roles,
  };
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;
        if (!email || !password) return null;

        const { isDatabaseConfigured } = await import("@/lib/db");
        if (isDatabaseConfigured()) {
          try {
            const dbUser = await authorizeWithDatabase(email, password);
            if (dbUser) return dbUser;
          } catch (err) {
            console.error("[auth] database login failed", err);
          }
        }

        return authorizeWithDemo(email, password);
      },
    }),
  ],
});
