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

const credentialsSchema = z.object({
  email: z.email(),
  password: z.string().min(1),
});

export const { handlers, signIn, signOut, auth } = NextAuth({
  session: { strategy: "jwt" },
  pages: { signIn: "/" },
  providers: [
    Credentials({
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(rawCredentials) {
        const parsed = credentialsSchema.safeParse(rawCredentials);
        if (!parsed.success) return null;
        const { email, password } = parsed.data;

        const user = await findUserByEmail(email);
        if (!user || !user.password_hash) return null;
        if (user.status !== "ACTIVE") return null;

        const passwordMatches = await bcrypt.compare(
          password,
          user.password_hash,
        );
        if (!passwordMatches) return null;

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
      if (session.user) session.user.roles = token.roles ?? [];
      if (session.user) session.user.name = (token.name as string | null) ?? session.user.name;
      if (session.user) session.user.email = (token.email as string | null) ?? session.user.email;
      if (session.user) session.user.image = (token.picture as string | null) ?? null;
      return session;
    },
  },
});
