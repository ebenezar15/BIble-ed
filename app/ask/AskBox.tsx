"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import type { Source } from "@/lib/ask/prompt";

const EXAMPLES = [
  "What does hesed tell us about God?",
  "How did the early church understand the ransom Jesus paid?",
  "What did adoption mean in Roman law, and why does Paul use it?",
  "Is the mercy seat (hilastērion) about appeasing God?",
];

/** Render the answer: plain paragraphs, with [n] turned into links to the numbered sources. */
function Answer({ text, sources }: { text: string; sources: Source[] }) {
  return (
    <div className="space-y-3 leading-relaxed">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i}>
          {para.split(/(\[\d+\])/g).map((part, j) => {
            const m = part.match(/^\[(\d+)\]$/);
            const s = m && sources.find((x) => x.n === Number(m[1]));
            return s ? (
              <a key={j} href={`#source-${s.n}`} className="align-super text-xs text-accent no-underline" title={s.title}>
                [{s.n}]
              </a>
            ) : (
              <span key={j}>{part}</span>
            );
          })}
        </p>
      ))}
    </div>
  );
}

export function AskBox() {
  const [q, setQ] = useState("");
  const [sources, setSources] = useState<Source[]>([]);
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const ctrl = useRef<AbortController | null>(null);

  async function ask(question: string) {
    if (!question.trim() || busy) return;
    ctrl.current?.abort();
    ctrl.current = new AbortController();
    setBusy(true);
    setText("");
    setError(null);
    setSources([]);
    try {
      const res = await fetch("/api/ask", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ question }),
        signal: ctrl.current.signal,
      });
      if (res.redirected || !(res.headers.get("content-type") ?? "").includes("json")) {
        throw new Error("Your sign-in has expired. Reload the page and sign in again.");
      }
      if (!res.ok || !res.body) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error ?? "The question could not be sent.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let buf = "";
      let finished = false;
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split("\n");
        buf = lines.pop() ?? "";
        for (const l of lines) {
          if (!l.trim()) continue;
          const ev = JSON.parse(l);
          if (ev.type === "sources") setSources(ev.sources);
          else if (ev.type === "text") setText((t) => t + ev.text);
          else if (ev.type === "error") (setError(ev.message), (finished = true));
          else if (ev.type === "done") finished = true;
        }
      }
      if (!finished) setError("The answer stopped before it finished. Try asking again.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(q);
        }}
        className="flex flex-col gap-2 sm:flex-row"
      >
        <textarea
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              ask(q);
            }
          }}
          rows={2}
          aria-label="Your question"
          placeholder="Ask about a word, a verse, a doctrine or its history"
          className="min-h-14 flex-1 rounded-xl border border-border bg-surface p-3"
        />
        <button disabled={busy} className="rounded-xl bg-accent px-5 py-3 font-semibold text-bg disabled:opacity-60">
          {busy ? "Reading the library…" : "Ask"}
        </button>
      </form>
      {!text && !busy && !sources.length && (
        <ul className="mt-4 flex flex-wrap gap-2">
          {EXAMPLES.map((ex) => (
            <li key={ex}>
              <button type="button" onClick={() => (setQ(ex), ask(ex))} className="rounded-full border border-border px-3 py-1 text-sm hover:border-accent">
                {ex}
              </button>
            </li>
          ))}
        </ul>
      )}
      {(text || error) && (
        <section className="mt-8 rounded-2xl border border-border bg-surface p-5" aria-live="polite">
          {text && <Answer text={text} sources={sources} />}
          {error && <p role="alert" className="mt-3 text-hebrew">{error}</p>}
          <p className="mt-4 text-xs text-muted">
            Answered only from the sources below. AI-generated: check the sources before relying on it.
          </p>
        </section>
      )}
      {sources.length > 0 && (
        <section className="mt-8">
          <h2 className="mb-3 text-lg font-semibold">Sources from the library</h2>
          <ol className="space-y-3">
            {sources.map((s) => (
              <li key={s.n} id={`source-${s.n}`} className="grid grid-cols-[2rem_1fr] gap-2 text-sm">
                <span className="font-semibold text-accent">[{s.n}]</span>
                <span>
                  <Link href={s.href} className="font-semibold underline decoration-dotted">{s.title}</Link>
                  <span className="ml-2 text-xs text-muted">{s.kind}</span>
                  <span className="mt-1 line-clamp-3 block text-muted">{s.text}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>
      )}
    </div>
  );
}
