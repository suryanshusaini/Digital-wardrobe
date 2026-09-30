// auth.ts — NextAuth v5 (Auth.js) root configuration
// Supports both Google OAuth and email/password (Credentials) authentication
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

export const { handlers, auth, signIn, signOut } = NextAuth({
  secret:
    process.env.AUTH_SECRET ||
    process.env.NEXTAUTH_SECRET ||
    "digital-wardrobe-secret-key-3d-app",

  providers: [
    // ── Google OAuth ────────────────────────────────────────────────────────
    GoogleProvider({
      clientId:
        process.env.GOOGLE_CLIENT_ID || process.env.AUTH_GOOGLE_ID || "",
      clientSecret:
        process.env.GOOGLE_CLIENT_SECRET ||
        process.env.AUTH_GOOGLE_SECRET ||
        "",
    }),

    // ── Email / Password ────────────────────────────────────────────────────
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email as string | undefined;
        const password = credentials?.password as string | undefined;

        if (!email || !password) return null;

        try {
          await connectDB();

          // Explicitly select password — it's hidden by default (select: false)
          const user = await User.findOne({
            email: email.toLowerCase().trim(),
          }).select("+password");

          if (!user || !user.password) return null;

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) return null;

          // Return the user object that NextAuth will encode into the JWT
          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            image: user.image ?? null,
          };
        } catch (err) {
          console.error("CredentialsProvider authorize error:", err);
          return null;
        }
      },
    }),
  ],

  pages: {
    signIn: "/login",
    error: "/login",
  },

  callbacks: {
    // Persist name/image from credentials into the JWT (Google passes them automatically)
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.name = user.name;
        token.picture = user.image ?? token.picture;
      }
      return token;
    },

    session({ session, token }) {
      if (session.user) {
        if (token?.sub) session.user.id = token.sub;
        if (token?.id) session.user.id = token.id as string;
        if (token?.name) session.user.name = token.name;
        if (token?.picture) session.user.image = token.picture as string;
      }
      return session;
    },
  },
});
