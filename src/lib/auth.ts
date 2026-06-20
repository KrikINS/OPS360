import type { NextAuthOptions, Session, User } from "next-auth";
import type { JWT } from "next-auth/jwt";
import CredentialsProvider from "next-auth/providers/credentials";
import { db } from "@/db/client";
import { users, user_branch_access, profiles, login_attempts } from "@/db/schema";
import { and, eq, gte } from "drizzle-orm";
import bcrypt from "bcrypt";

const RATE_LIMIT_WINDOW_MINUTES = 15;
const RATE_LIMIT_MAX_ATTEMPTS = 5;

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

        const windowStart = new Date(Date.now() - RATE_LIMIT_WINDOW_MINUTES * 60 * 1000)
        const recentFailures = await db.select({ id: login_attempts.id })
          .from(login_attempts)
          .where(and(
            eq(login_attempts.email, credentials.email),
            eq(login_attempts.success, false),
            gte(login_attempts.attempted_at, windowStart)
          ))

        if (recentFailures.length >= RATE_LIMIT_MAX_ATTEMPTS) {
          return null // same generic failure as wrong password — don't leak lockout state
        }

        const userResult = await db.select().from(users).where(eq(users.email, credentials.email));
        const user = userResult[0];

        if (!user || !user.password_hash) {
          await db.insert(login_attempts).values({
            email: credentials.email,
            success: false,
          })
          return null;
        }

        const isValid = await bcrypt.compare(credentials.password, user.password_hash);
        
        await db.insert(login_attempts).values({
          email: credentials.email,
          success: isValid,
        })

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

        const profileResult = await db
          .select({ forcePasswordChange: profiles.force_password_change })
          .from(profiles)
          .where(eq(profiles.id, user.id))
          .limit(1);

        const forcePasswordChange = profileResult[0]?.forcePasswordChange ?? false;

        return {
          id: String(user.id),
          email: user.email,
          role: user.role,
          name: (user as unknown as Record<string, string>).full_name ?? null,
          branchId: primaryBranchId,
          forcePasswordChange,
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
        token.forcePasswordChange = user.forcePasswordChange ?? false;
      }
      return token;
    },
    async session({ session, token }: { session: Session; token: JWT }) {
      if (session.user) {
        session.user.id = String(token.id);
        session.user.role = token.role;
        session.user.branchId = token.branchId ?? null;
        session.user.forcePasswordChange = token.forcePasswordChange as boolean;
      }
      return session;
    }
  }
};
