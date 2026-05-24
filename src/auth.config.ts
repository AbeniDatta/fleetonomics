import type { NextAuthConfig } from "next-auth";

/** Edge-safe auth config (no Prisma/pg). Used by middleware. */
export const authConfig = {
  trustHost: true,
  session: { strategy: "jwt" },
  pages: { signIn: "/login" },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user?.roles) {
        token.roles = user.roles;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.roles = (token.roles as string[] | undefined) ?? [];
        session.user.id = (token.sub as string | undefined) ?? "";
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
