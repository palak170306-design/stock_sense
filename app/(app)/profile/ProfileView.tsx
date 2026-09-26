"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { useToast } from "@/components/feedback";
import { useCurrentUser } from "@/components/UserProvider";
import { Alert, Badge, Button, Field, Input, PageHeader } from "@/components/ui";
import { api } from "@/lib/client/api";

/** My Profile: view account details, rename, change password. */
export function ProfileView() {
  const user = useCurrentUser();
  const router = useRouter();
  const toast = useToast();

  const [name, setName] = useState(user.name);
  const [savingName, setSavingName] = useState(false);
  const [pwError, setPwError] = useState<string | null>(null);
  const [savingPw, setSavingPw] = useState(false);

  async function saveName(e: FormEvent) {
    e.preventDefault();
    setSavingName(true);
    try {
      await api("/api/profile", { method: "PATCH", body: { name } });
      toast.success("Name updated");
      router.refresh(); // re-render the server layout so the sidebar shows the new name
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const data = new FormData(form);
    setPwError(null);
    if (data.get("newPassword") !== data.get("confirm")) {
      setPwError("New passwords do not match");
      return;
    }
    setSavingPw(true);
    try {
      const res = await api<{ message: string }>("/api/profile/password", {
        method: "POST",
        body: { currentPassword: data.get("currentPassword"), newPassword: data.get("newPassword") },
      });
      form.reset();
      toast.success(res.message);
    } catch (err) {
      setPwError((err as Error).message);
    } finally {
      setSavingPw(false);
    }
  }

  return (
    <>
      <PageHeader title="My profile" description="Your account details and sign-in settings." />

      <div className="grid max-w-3xl gap-6">
        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold tracking-tight">Account</h2>
          <dl className="mt-4 grid gap-4 text-sm sm:grid-cols-2">
            <div>
              <dt className="text-zinc-500">Email</dt>
              <dd className="mt-0.5 font-medium">{user.email}</dd>
            </div>
            <div>
              <dt className="text-zinc-500">Role</dt>
              <dd className="mt-0.5">
                <Badge>{user.role === "MANAGER" ? "Manager" : "Staff"}</Badge>{" "}
                <span className="text-zinc-500">
                  {user.role === "MANAGER" ? "can create, validate and edit everything" : "can view everything"}
                </span>
              </dd>
            </div>
          </dl>

          <form onSubmit={saveName} className="mt-5 flex flex-col gap-2 sm:flex-row sm:items-end">
            <div className="flex-1">
              <Field label="Name">
                <Input value={name} onChange={(e) => setName(e.target.value)} required maxLength={100} />
              </Field>
            </div>
            <Button type="submit" variant="primary" disabled={savingName || name.trim() === user.name || !name.trim()}>
              {savingName ? "Saving…" : "Save name"}
            </Button>
          </form>
        </section>

        <section className="rounded-lg border border-zinc-200 p-5 dark:border-zinc-800">
          <h2 className="font-semibold tracking-tight">Change password</h2>
          <p className="mt-1 text-sm text-zinc-500">You&apos;ll stay signed in here; every other session is signed out.</p>
          <form onSubmit={changePassword} className="mt-4 max-w-sm space-y-3">
            {pwError && <Alert onClose={() => setPwError(null)}>{pwError}</Alert>}
            <Field label="Current password">
              <Input name="currentPassword" type="password" autoComplete="current-password" required />
            </Field>
            <Field label="New password" hint="8–72 characters">
              <Input name="newPassword" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
            </Field>
            <Field label="Confirm new password">
              <Input name="confirm" type="password" autoComplete="new-password" minLength={8} maxLength={72} required />
            </Field>
            <Button type="submit" variant="primary" disabled={savingPw}>{savingPw ? "Updating…" : "Change password"}</Button>
          </form>
        </section>
      </div>
    </>
  );
}
