import Link from "next/link";

export default function Offline() {
  return (
    <main className="mx-auto max-w-prose px-4 py-20">
      <h1 className="text-2xl font-semibold">You're offline</h1>
      <p className="mt-3 text-muted">
        Pages you have already opened are saved on this device and still work. This one wasn't saved yet. Reconnect to
        load it, or go back to a page you've read.
      </p>
      <Link href="/" className="mt-6 inline-block underline">Home</Link>
    </main>
  );
}
