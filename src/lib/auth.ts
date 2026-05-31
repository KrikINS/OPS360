import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db/client";
import { users, user_branch_access } from "@/db/schema";
import { and, eq } from "drizzle-orm";
import bcrypt from "bcrypt";

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET,
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: '__session',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const userResult = await db.select().from(users).where(eq(users.email, credentials.email));
        const user = userResult[0];

        if (!user || !user.password_hash) return null;

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        if (!isValid) return null;

        const branchAccess = await db
          .select({ branchId: user_branch_access.branch_id })
          .from(user_branch_access)
          .where(
            and(
              eq(user_branch_access.user_id, user.id),
              eq(user_branch_access.is_primary, true)
            )
          )
          .limit(1);

        const primaryBranchId = branchAccess[0]?.branchId ?? null;

        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          name: (user as unknown as Record<string, string>).full_name ?? null,
          branchId: primaryBranchId,
        };
      }
    })
  ],
  callbacks: {
    async jwt({ token, user }: { token: JWT; user?: User | null }) {
      if (user) {
        token.id = user.id;
        token.email = user.email;
        token.role = user.role ?? token.role;
        token.branchId = user.branchId ?? token.branchId;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role;
        session.user.branchId = token.branchId ?? null;
      }
      return session;
    }
  }
};
