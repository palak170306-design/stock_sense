"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { Alert, AuthCard, Field, SubmitButton, postJson } from "../ui";

/**
 * Two-step reset on one page:
 *   1. "request" — enter email; server generates an OTP (logged to the server
 *      console for now).
 *   2. "reset"   — enter the OTP and a new password.
 * Then "done" links back to login.
 */
type Step = "request" | "reset" | "done";

export default function ForgotPasswordPage() {
  const [step, setStep] = useState<Step>("request");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  async function run(action: () => Promise<void>) {
    setError(null);
    setPending(true);
    try {
      await action();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setPending(false);
    }
  }

  function requestCode(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const value = String(new FormData(e.currentTarget).get("email") ?? "");
    return run(async () => {
      const res = await postJson<{ message: string }>("/api/auth/forgot-password", { email: value });
      setEmail(value);
      setInfo(res.message);
      setStep("reset");
    });
  }

  function resetPassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = new FormData(e.currentTarget);
    if (form.get("newPassword") !== form.get("confirm")) {
      setError("Passwords do not match");
      return;
    }
    return run(async () => {
      const res = await postJson<{ message: string }>("/api/auth/reset-password", {
        email,
        otp: form.get("otp"),
        newPassword: form.get("newPassword"),
      });
      setInfo(res.message);
      setStep("done");
    });
  }

  return (
    <AuthCard
      title="Reset password"
      subtitle={
        step === "request"
          ? "We'll send a 6-digit code to your email."
          : step === "reset"
            ? `Enter the code sent to ${email}.`
            : undefined
      }
    >
      <div className="space-y-4">
        {error && <Alert kind="error">{error}</Alert>}
        {info && <Alert kind="success">{info}</Alert>}

        {step === "request" && (
          <form onSubmit={requestCode} className="space-y-4">
            <Field label="Email" name="email" type="email" autoComplete="email" required />
            <SubmitButton pending={pending}>Send code</SubmitButton>
          </form>
        )}

        {step === "reset" && (
          <form onSubmit={resetPassword} className="space-y-4">
            <Field
              label="6-digit code"
              name="otp"
              inputMode="numeric"
              autoComplete="one-time-code"
              pattern="\d{6}"
              maxLength={6}
              required
            />
            <Field label="New password" name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
            <Field label="Confirm new password" name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
            <SubmitButton pending={pending}>Set new password</SubmitButton>
            <button
              type="button"
              onClick={() => { setStep("request"); setInfo(null); setError(null); }}
              className="w-full text-sm text-zinc-600 underline-offset-4 hover:underline dark:text-zinc-400"
            >
              Use a different email / resend code
            </button>
          </form>
        )}

        <p className="text-center text-sm">
          <Link href="/login" className="font-medium underline-offset-4 hover:underline">
            {step === "done" ? "Go to login" : "Back to login"}
          </Link>
        </p>
      </div>
    </AuthCard>
  );
}
