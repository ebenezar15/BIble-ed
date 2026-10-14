import type { Metadata } from "next";
import { listSources } from "@/lib/db/queries";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Sources and licences" };

export default async function SourcesPage() {
  const sources = await listSources();
  return (
    <main className="mx-auto max-w-5xl px-4 py-10 pb-24">
      <h1 className="text-3xl font-semibold">Sources and licences</h1>
      <p className="mt-3 max-w-prose text-muted">
        Logos Relational only stores open-licensed or public-domain texts. Copyrighted books are referenced by title and
        page, never copied. Every dataset below is credited as its licence requires.
      </p>
      <ul className="mt-8 divide-y divide-border">
        {sources.map((s) => (
          <li key={s.id} className="grid gap-1 py-4 sm:grid-cols-[1fr_10rem]">
            <div>
              <p className="font-semibold">{s.name}</p>
              <p className="mt-1 text-sm text-muted">{s.attribution}</p>
              <a href={s.url} className="mt-1 inline-block break-all text-sm text-accent underline" rel="noreferrer">
                {s.url.replace(/^https:\/\//, "")}
              </a>
              {s.version && <span className="ml-2 text-xs text-muted">version {s.version.slice(0, 7)}</span>}
            </div>
            <p className="text-sm font-semibold sm:text-right">{s.license}</p>
          </li>
        ))}
      </ul>
      <section className="mt-10 max-w-prose text-sm text-muted">
        <h2 className="text-base font-semibold text-ink">Fonts</h2>
        <p className="mt-2">
          Avenir Next is used when your device already has it. Otherwise the interface uses Nunito Sans. Hebrew is set
          in Noto Serif Hebrew and Greek in Gentium Plus. All three are under the SIL Open Font License.
        </p>
      </section>
    </main>
  );
}
