import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import * as z from "zod";
import {
  createGoogleUser,
  findUserByEmail,
  findUserByGoogleSub,
  findUserById,
  findUserRoleCodes,
  linkGoogleAccount,
  touchLastLogin,
} from "@/lib/users";
import { SESSION_IDLE_SECONDS } from "@/lib/session-config";
import { hit, isLimited, reset } from "@/lib/rate-limit";

/** Failed password logins allowed per window, per account and per client IP. */
const LOGIN_FAILS_PER_EMAIL = 10;
const LOGIN_FAILS_PER_IP = 30;
const LOGIN_WINDOW_SECONDS = 15 * 60;
/** How often a live session re-reads the user's status and roles from the DB. */
const SESSION_RECHECK_SECONDS = 2 * 60;

function requestIp(request: Request | undefined): string {
  const h = request?.headers;
  return h?.get("x-real-ip")?.trim() || h?.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
}

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  // Rolling idle timeout: the JWT cookie expires SESSION_IDLE_SECONDS after the
  // last time it was re-issued (every /api/auth/session hit refreshes it).
  session: { strategy: "jwt", maxAge: SESSION_IDLE_SECONDS },
  pages: { signIn: "/" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials, request) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const emailKey = `login:email:${email.toLowerCase()}`;
        const ipKey = `login:ip:${requestIp(request)}`;
        if (isLimited(emailKey, LOGIN_FAILS_PER_EMAIL) || isLimited(ipKey, LOGIN_FAILS_PER_IP)) return null;
        const fail = () => {
          hit(emailKey, LOGIN_FAILS_PER_EMAIL, LOGIN_WINDOW_SECONDS);
          hit(ipKey, LOGIN_FAILS_PER_IP, LOGIN_WINDOW_SECONDS);
          return null;
        };

        const user = await findUserByEmail(email);
        if (!user || !user.password_hash) return fail();
        if (user.status !== "ACTIVE") return fail();

        const passwordMatches = await bcrypt.compare(
          password,
          user.password_hash,
        );
        if (!passwordMatches) return fail();

        reset(emailKey);
        await touchLastLogin(user.id);

        return {
          id: String(user.id),
          email: user.email,
          name: user.name,
          image: user.avatar_url ?? undefined,
        };
      },
    }),
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
      // Always show Google's account chooser so a user who signed out can
      // switch to a different Google account instead of being silently
      // signed back in with the same one.
      authorization: { params: { prompt: "select_account" } },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider !== "google") return true;
      if (!user.email || !account.providerAccountId) return false;

      const googleSub = account.providerAccountId;
      const byGoogleSub = await findUserByGoogleSub(googleSub);
      if (byGoogleSub) {
        if (byGoogleSub.status !== "ACTIVE") return false;
        await touchLastLogin(byGoogleSub.id);
        user.id = String(byGoogleSub.id);
        return true;
      }

      const byEmail = await findUserByEmail(user.email);
      if (byEmail) {
        if (byEmail.status !== "ACTIVE") return false;
        await linkGoogleAccount(byEmail.id, googleSub);
        await touchLastLogin(byEmail.id);
        user.id = String(byEmail.id);
        return true;
      }

      const created = await createGoogleUser(
        user.email,
        user.name ?? user.email,
        googleSub,
      );
      user.id = String(created.id);
      return true;
    },
    async jwt({ token, user, trigger }) {
      if (user?.id) {
        token.sub = user.id;
        token.roles = await findUserRoleCodes(user.id);
        token.name = user.name;
        token.email = user.email;
        token.picture = user.image;
        token.checkedAt = Date.now();
      } else if (
        token.sub &&
        Date.now() - (typeof token.checkedAt === "number" ? token.checkedAt : 0) > SESSION_RECHECK_SECONDS * 1000
      ) {
        // Deactivating a user or changing their roles must reach sessions that
        // are already open, not only the next login: re-read both periodically.
        const current = await findUserById(token.sub);
        if (!current || current.status !== "ACTIVE") return null;
        token.roles = await findUserRoleCodes(token.sub);
        token.checkedAt = Date.now();
      }
      // Fired by the client calling next-auth/react's update() — re-reads the
      // profile fields from the DB so a self-service name/photo change shows
      // up immediately instead of waiting for the next full login.
      if (trigger === "update" && token.sub) {
        const fresh = await findUserById(token.sub);
        if (fresh) {
          token.name = fresh.name;
          token.email = fresh.email;
          token.picture = fresh.avatar_url;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      if (session.user) session.user.roles = Array.isArray(token.roles) ? (token.roles as string[]) : [];
      if (session.user) session.user.name = (token.name as string | null) ?? session.user.name;
      if (session.user) session.user.email = (token.email as string | null) ?? session.user.email;
      if (session.user) session.user.image = (token.picture as string | null) ?? null;
      return session;
    },
  },
});
