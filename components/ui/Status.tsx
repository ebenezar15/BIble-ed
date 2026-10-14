import Link from "next/link";

export function Loading({ label = "Loading…" }: { label?: string }) {
  return (
    <main className="mx-auto max-w-5xl px-4 py-16" aria-busy="true">
      <p className="animate-pulse text-muted motion-reduce:animate-none">{label}</p>
    </main>
  );
}

export function Problem({ title, children }: { title: string; children?: React.ReactNode }) {
  return (
    <main className="mx-auto max-w-prose px-4 py-16">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <div className="mt-3 text-muted">{children}</div>
      <p className="mt-6">
        <Link href="/" className="underline">Home</Link>
      </p>
    </main>
  );
}
