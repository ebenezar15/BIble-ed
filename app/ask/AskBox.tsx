"use client";

import Anthropic from "@anthropic-ai/sdk";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { buildUserMessage, SYSTEM_PROMPT, type Source } from "@/lib/ask/prompt";
import { retrieve } from "@/lib/ask/retrieve";
import { data } from "@/lib/data/browser";

const MODEL = "claude-opus-5-5";
const KEY = "logos.anthropicKey";

function readKey(): string {
  try {
    return window.localStorage.getItem(KEY) ?? "";
  } catch {
    return "";
  }
}

/** Ask runs in the browser with the reader's own Anthropic API key, kept only in this browser. */
function KeySettings({ apiKey, onChange }: { apiKey: string; onChange: (k: string) => void }) {
  const [editing, setEditing] = useState(false);
  if (apiKey && !editing) {
    return (
      <p className="mb-4 text-sm text-muted">
        Using your Anthropic API key saved in this browser.{" "}
        <button type="button" className="underline" onClick={() => setEditing(true)}>Change</button>{" "}
        <button
          type="button"
          className="underline"
          onClick={() => {
            try {
              window.localStorage.removeItem(KEY);
            } catch {}
            onChange("");
          }}
        >
          Forget it
        </button>
      </p>
    );
  }
  return (
    <form
      className="mb-6 rounded-xl border border-border bg-surface-2 p-4 text-sm"
      onSubmit={(e) => {
        e.preventDefault();
        const k = String(new FormData(e.currentTarget).get("key") ?? "").trim();
        if (!k) return;
        try {
          window.localStorage.setItem(KEY, k);
        } catch {}
        onChange(k);
        setEditing(false);
      }}
    >
      <p className="max-w-prose">
        Ask uses Claude through your own Anthropic API key (from console.anthropic.com). The key is saved only in this
        browser and sent only to Anthropic. Anyone with access to this browser could use it, so don't save it on a shared
        computer. Everything else in the app works without a key.
      </p>
      <div className="mt-3 flex flex-wrap gap-2">
        <input name="key" type="password" autoComplete="off" placeholder="sk-ant-…" aria-label="Anthropic API key"
          className="min-w-0 flex-1 rounded border border-border bg-surface px-2 py-1" />
        <button className="rounded-full bg-accent px-4 py-1 font-semibold text-bg">Save key</button>
      </div>
    </form>
  );
}

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

  const [apiKey, setApiKey] = useState("");
  useEffect(() => setApiKey(readKey()), []);

  async function ask(question: string) {
    const q = question.trim().slice(0, 2000);
    if (!q || busy) return;
    ctrl.current?.abort();
    const controller = new AbortController();
    ctrl.current = controller;
    setBusy(true);
    setText("");
    setError(null);
    setSources([]);
    try {
      const found = await retrieve(data, q);
      if (controller.signal.aborted) return;
      setSources(found);
      if (!found.length) {
        setText("That isn't in the library yet. Nothing in the word studies, articles, Bible text or Church Fathers matched your question. Try different words, or a Hebrew or Greek term.");
        return;
      }
      if (!apiKey) {
        setError("Add your Anthropic API key above to get an answer. The sources below were found without it.");
        return;
      }
      const client = new Anthropic({ apiKey, dangerouslyAllowBrowser: true });
      const stream = client.beta.messages.stream(
        {
          model: MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: buildUserMessage(q, found) }],
        },
        { signal: controller.signal },
      );
      for await (const event of stream) {
        if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
          const t = event.delta.text;
          setText((prev) => prev + t);
        }
      }
      const final = await stream.finalMessage();
      if (final.stop_reason === "refusal") setError("The model declined to answer this question. Try rephrasing it.");
      else if (final.stop_reason === "max_tokens") setError("The answer was cut off because it ran too long. Ask a narrower question.");
    } catch (err) {
      if (controller.signal.aborted || err instanceof Anthropic.APIUserAbortError) return;
      let message = "Something went wrong while answering. Try again in a moment.";
      if (err instanceof Anthropic.AuthenticationError) message = "Anthropic did not accept the API key. Check it and save it again.";
      else if (err instanceof Anthropic.RateLimitError) message = "The model is busy right now (rate limit). Try again in a minute.";
      else if (err instanceof Anthropic.APIError && err.status) message = `The model service returned an error (${err.status}). Try again shortly.`;
      else if (err instanceof Anthropic.APIConnectionError) message = "Could not reach Anthropic. Check your connection.";
      else if (err instanceof Error && !(err instanceof Anthropic.APIError)) message = err.message;
      setError(message);
    } finally {
      if (ctrl.current === controller) setBusy(false);
    }
  }

  useEffect(() => () => ctrl.current?.abort(), []);

  return (
    <div>
      <KeySettings apiKey={apiKey} onChange={setApiKey} />
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
