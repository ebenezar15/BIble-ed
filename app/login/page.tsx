import type { Metadata } from "next";
import { login } from "@/app/actions";

export const metadata: Metadata = { title: "Sign in" };

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string; error?: string }> }) {
  const { next = "/", error } = await searchParams;
  return (
    <main className="mx-auto max-w-sm px-4 py-20">
      <h1 className="text-2xl font-semibold">Sign in</h1>
      <p className="mt-2 text-muted">This library is private. Enter the password set in SITE_PASSWORD.</p>
      <form action={login} className="mt-6 space-y-3">
        <input type="hidden" name="next" value={next} />
        <input type="password" name="password" required autoFocus aria-label="Password"
          className="w-full rounded-lg border border-border bg-surface px-4 py-2" />
        {error && <p role="alert" className="text-sm text-hebrew">That password is not right. Try again.</p>}
        <button className="w-full rounded-lg bg-accent px-4 py-2 font-semibold text-bg">Sign in</button>
      </form>
    </main>
  );
}
