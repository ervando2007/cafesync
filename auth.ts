import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import * as z from "zod";
import {
  createGoogleUser,
  findUserByEmail,
  findUserByGoogleSub,
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

        return { id: String(user.id), email: user.email, name: user.name };
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
    async jwt({ token, user }) {
      if (user?.id) {
        token.sub = user.id;
        token.roles = await findUserRoleCodes(user.id);
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.sub) session.user.id = token.sub;
      if (session.user) session.user.roles = token.roles ?? [];
      return session;
    },
  },
});
