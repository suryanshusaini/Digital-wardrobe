// app/signup/page.tsx
"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { BRAND_NAME } from "@/lib/brand";

export default function SignupPage() {
  const router = useRouter();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSignup(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      // 1. Create the account via the signup API route
      const res = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // 2. Auto sign-in with the new credentials
      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });

      if (result?.error) {
        // Account created but auto-login failed — redirect to login
        router.push("/login?signup=success");
      } else {
        router.push("/");
      }
    } catch {
      setError("Network error. Please check your connection and try again.");
      setLoading(false);
    }
  }

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6 transition-colors duration-200">
      <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-sm border border-border transition-colors">
        {/* Brand header */}
        <div className="text-center mb-8">
          <div className="mx-auto mb-5 flex justify-center text-foreground">
            <Logo variant="mark" size={40} animated />
          </div>
          <h1 className="text-2xl sm:text-3xl font-serif font-light tracking-tight text-foreground">
            {BRAND_NAME}
          </h1>
          <p className="mt-1.5 text-xs sm:text-sm text-muted">
            Start building your digital wardrobe
          </p>
        </div>

        <form onSubmit={handleSignup} className="space-y-4">
          {/* Name */}
          <div>
            <label
              htmlFor="name"
              className="block text-xs font-medium text-muted mb-1.5"
            >
              Name
            </label>
            <input
              id="name"
              type="text"
              autoComplete="name"
              required
              minLength={2}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Your name"
              className="w-full rounded-full border border-border bg-stone-50 dark:bg-stone-900/60 px-4 py-2.5 text-xs text-foreground placeholder:text-subtle outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </div>

          {/* Email */}
          <div>
            <label
              htmlFor="email"
              className="block text-xs font-medium text-muted mb-1.5"
            >
              Email
            </label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              className="w-full rounded-full border border-border bg-stone-50 dark:bg-stone-900/60 px-4 py-2.5 text-xs text-foreground placeholder:text-subtle outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </div>

          {/* Password */}
          <div>
            <label
              htmlFor="password"
              className="block text-xs font-medium text-muted mb-1.5"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              autoComplete="new-password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="At least 8 characters"
              className="w-full rounded-full border border-border bg-stone-50 dark:bg-stone-900/60 px-4 py-2.5 text-xs text-foreground placeholder:text-subtle outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
            />
          </div>

          {/* Inline error */}
          {error && (
            <p className="rounded-xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400">
              {error}
            </p>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full flex items-center justify-center gap-2 rounded-full bg-accent text-accent-foreground hover:bg-accent-hover px-4 py-3 text-xs font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
                Creating account…
              </>
            ) : (
              "Create account"
            )}
          </button>
        </form>

        <p className="mt-4 text-center text-[11px] text-muted leading-relaxed">
          By signing up, you agree to our{" "}
          <Link
            href="/terms"
            className="font-medium text-foreground underline underline-offset-2 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-xs"
          >
            Terms of Service
          </Link>{" "}
          and{" "}
          <Link
            href="/privacy"
            className="font-medium text-foreground underline underline-offset-2 hover:text-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-xs"
          >
            Privacy Policy
          </Link>
          .
        </p>

        <p className="mt-4 text-center text-xs text-muted">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-sm"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
