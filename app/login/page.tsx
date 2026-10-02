// app/login/page.tsx
"use client";

import { Suspense, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import Logo from "@/components/brand/Logo";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/brand";

function getErrorMessage(errorCode: string | null): string | null {
  if (!errorCode) return null;
  switch (errorCode) {
    case "CredentialsSignin":
      return "Invalid email or password. Please try again.";
    case "OAuthSignin":
    case "OAuthCallback":
      return "Could not sign in with Google. Please try again.";
    case "OAuthAccountNotLinked":
      return "To confirm your identity, sign in with the account you originally used.";
    case "AccessDenied":
      return "Access was denied. Please check your credentials or try another account.";
    case "Configuration":
      return "A temporary server configuration issue occurred. Please try again shortly.";
    default:
      return "Unable to sign in. Please verify your credentials and try again.";
  }
}

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const errorParam = searchParams.get("error");
  const queryError = getErrorMessage(errorParam);
  const displayError = submitError || queryError;
  const isSignupSuccess = searchParams.get("signup") === "success";

  async function handleCredentialsLogin(e: React.FormEvent) {
    e.preventDefault();
    setSubmitError(null);
    setLoading(true);

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setSubmitError("Invalid email or password. Please try again.");
    } else {
      const callbackUrl = searchParams.get("callbackUrl") || "/";
      router.push(callbackUrl);
    }
  }

  async function handleGoogleLogin() {
    setGoogleLoading(true);
    const callbackUrl = searchParams.get("callbackUrl") || "/";
    await signIn("google", { callbackUrl });
  }

  return (
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
          {BRAND_TAGLINE}
        </p>
      </div>

      {/* Success notification */}
      {isSignupSuccess && (
        <div className="mb-4 flex items-center gap-2 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-400">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          <span>Account created successfully. Please sign in below.</span>
        </div>
      )}

      {/* Email / password form */}
      <form onSubmit={handleCredentialsLogin} className="space-y-4">
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
            autoComplete="current-password"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="••••••••"
            className="w-full rounded-full border border-border bg-stone-50 dark:bg-stone-900/60 px-4 py-2.5 text-xs text-foreground placeholder:text-subtle outline-none transition focus:border-accent focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          />
        </div>

        {/* Inline error */}
        {displayError && (
          <div className="flex items-center gap-2 rounded-2xl bg-red-500/10 border border-red-500/20 px-4 py-2.5 text-xs font-medium text-red-600 dark:text-red-400">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{displayError}</span>
          </div>
        )}

        <button
          type="submit"
          disabled={loading}
          className="w-full flex items-center justify-center gap-2 rounded-full bg-accent text-accent-foreground hover:bg-accent-hover px-4 py-3 text-xs font-medium transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
        >
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin text-accent-foreground" />
              Signing in…
            </>
          ) : (
            "Sign in"
          )}
        </button>
      </form>

      {/* Divider */}
      <div className="my-5 flex items-center gap-3">
        <div className="h-px flex-1 bg-border" />
        <span className="text-[11px] text-muted uppercase tracking-wider">or</span>
        <div className="h-px flex-1 bg-border" />
      </div>

      {/* Google OAuth */}
      <button
        type="button"
        onClick={handleGoogleLogin}
        disabled={googleLoading}
        className="w-full flex items-center justify-center gap-3 rounded-full bg-stone-900 text-white dark:bg-stone-100 dark:text-stone-900 px-4 py-3 text-xs font-medium hover:opacity-90 transition-all duration-150 active:scale-[0.98] disabled:opacity-60 disabled:cursor-not-allowed shadow-xs cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
      >
        {googleLoading ? (
          <Loader2 className="w-4 h-4 animate-spin" />
        ) : (
          <svg className="w-4 h-4" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
        )}
        Continue with Google
      </button>

      {/* Signup link */}
      <p className="mt-6 text-center text-xs text-muted">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-foreground underline-offset-2 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] rounded-sm"
        >
          Sign up
        </Link>
      </p>
    </div>
  );
}

export default function LoginPage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-background text-foreground p-6 transition-colors duration-200">
      <Suspense
        fallback={
          <div className="w-full max-w-md rounded-3xl bg-surface p-8 shadow-sm border border-border text-center">
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-stone-300 border-t-accent mx-auto" />
          </div>
        }
      >
        <LoginForm />
      </Suspense>
    </main>
  );
}
