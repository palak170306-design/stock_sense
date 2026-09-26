"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState, type FormEvent } from "react";
import { Alert, AuthCard, Field, SubmitButton, postJson } from "../ui";

/** Only follow same-site relative paths, never `//evil.com` or absolute URLs. */
function safeNext(next: string | null): string {
  return next && next.startsWith("/") && !next.startsWith("//") ? next : "/dashboard";
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = safeNext(params.get("next"));
  const expired = params.get("expired") === "1";
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    setError(null);
    setPending(true);
    try {
      await postJson("/api/auth/login", {
        email: form.get("email"),
        password: form.get("password"),
      });
      // Cookie is now set; refresh so server components see the session.
      router.replace(next);
      router.refresh();
    } catch (err) {
      setError((err as Error).message);
      setPending(false);
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && <Alert kind="error">{error}</Alert>}
      {expired && !error && <Alert kind="success">Your session ended. Please log in again.</Alert>}
      <Field label="Email" name="email" type="email" autoComplete="email" required />
      <Field label="Password" name="password" type="password" autoComplete="current-password" required />
      <SubmitButton pending={pending}>Log in</SubmitButton>
      <div className="flex justify-between text-sm">
        <Link href="/forgot-password" className="text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400">
          Forgot password?
        </Link>
        <Link href="/signup" className="font-medium underline-offset-4 hover:underline">
          Create account
        </Link>
      </div>
    </form>
  );
}

export default function LoginPage() {
  return (
    <AuthCard title="Log in" subtitle="Welcome back.">
      {/* useSearchParams needs a Suspense boundary. */}
      <Suspense>
        <LoginForm />
      </Suspense>
    </AuthCard>
  );
}
