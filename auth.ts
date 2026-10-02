// auth.ts — NextAuth v5 (Auth.js) root configuration
// Supports both Google OAuth and email/password (Credentials) authentication
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "@/lib/db/mongodb";
import User from "@/lib/db/models/User";

import { headers } from "next/headers";
import { authLimiter } from "@/lib/rateLimit";
import { logger } from "@/lib/logger";

export const { handlers, auth, signIn, signOut } = NextAuth({
  useSecureCookies: process.env.NODE_ENV === "production",
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

        if (!email || !password || typeof password !== "string" || password.length < 8) {
          return null;
        }

        const cleanEmail = email.toLowerCase().trim();

        // Extract client IP from request headers
        let clientIp = "127.0.0.1";
        try {
          const reqHeaders = await headers();
          const forwarded = reqHeaders.get("x-forwarded-for");
          if (forwarded) {
            clientIp = forwarded.split(",")[0].trim();
          } else {
            clientIp = reqHeaders.get("x-real-ip")?.trim() || "127.0.0.1";
          }
        } catch {
          // Fallback if invoked outside active request scope
        }

        // Rate limit credentials login: 5 attempts per minute per email AND per IP
        const [emailRl, ipRl] = await Promise.all([
          authLimiter.check(`email:${cleanEmail}`),
          authLimiter.check(`ip:${clientIp}`),
        ]);

        if (!emailRl.allowed || !ipRl.allowed) {
          return null;
        }

        try {
          await connectDB();

          // Explicitly select password — it's hidden by default (select: false)
          const user = await User.findOne({
            email: cleanEmail,
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
          logger.error("CredentialsProvider authorize error", err);
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
