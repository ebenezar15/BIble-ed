import Anthropic from "@anthropic-ai/sdk";
import { buildUserMessage, SYSTEM_PROMPT } from "@/lib/ask/prompt";
import { retrieve } from "@/lib/ask/retrieve";
import { isOwner } from "@/lib/owner";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const MODEL = "claude-opus-5-5";

function line(obj: unknown): Uint8Array {
  return new TextEncoder().encode(`${JSON.stringify(obj)}\n`);
}

/** Streams newline-delimited JSON: {type:"sources"} then {type:"text"} deltas, then {type:"done"} or {type:"error"}. */
export async function POST(req: Request) {
  if (!(await isOwner())) return Response.json({ error: "Sign in to ask." }, { status: 401 });
  const { question } = (await req.json().catch(() => ({}))) as { question?: string };
  const q = (question ?? "").trim().slice(0, 2000);
  if (!q) return Response.json({ error: "Type a question first." }, { status: 400 });

  const sources = await retrieve(q);
  let modelStream: { abort(): void } | null = null;
  let closed = false;
  const stream = new ReadableStream<Uint8Array>({
    cancel() {
      // The reader left (closed the page): stop generating so nothing is billed for an unread answer.
      closed = true;
      modelStream?.abort();
    },
    async start(controller) {
      const send = (obj: unknown) => {
        if (!closed) controller.enqueue(line(obj));
      };
      const finish = () => {
        if (!closed) {
          closed = true;
          controller.close();
        }
      };
      send({ type: "sources", sources });
      if (!sources.length) {
        send({ type: "text", text: "That isn't in the library yet. Nothing in the word studies, articles, Bible text or Church Fathers matched your question. Try different words, or a Hebrew or Greek term." });
        send({ type: "done" });
        finish();
        return;
      }
      if (!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_AUTH_TOKEN) {
        send({ type: "error", message: "Ask needs an Anthropic API key. Add ANTHROPIC_API_KEY to your .env (or your host's environment variables) and restart. The sources above were found without it." });
        finish();
        return;
      }
      try {
        const client = new Anthropic();
        const response = client.beta.messages.stream({
          model: MODEL,
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: [{ type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } }],
          messages: [{ role: "user", content: buildUserMessage(q, sources) }],
        });
        modelStream = response;
        for await (const event of response) {
          if (event.type === "content_block_delta" && event.delta.type === "text_delta") {
            send({ type: "text", text: event.delta.text });
          }
        }
        const final = await response.finalMessage();
        if (final.stop_reason === "refusal") {
          send({ type: "error", message: "The model declined to answer this question. Try rephrasing it." });
        } else {
          if (final.stop_reason === "max_tokens") {
            send({ type: "error", message: "The answer was cut off because it ran too long. Ask a narrower question." });
          }
          send({ type: "done", model: final.model, stopReason: final.stop_reason });
        }
      } catch (err) {
        if (closed) return;
        let message = "Something went wrong while answering. Try again in a moment.";
        if (err instanceof Anthropic.AuthenticationError) message = "The Anthropic API key was not accepted. Check ANTHROPIC_API_KEY.";
        else if (err instanceof Anthropic.RateLimitError) message = "The model is busy right now (rate limit). Try again in a minute.";
        else if (err instanceof Anthropic.APIError) message = `The model service returned an error (${err.status}). Try again shortly.`;
        send({ type: "error", message });
      }
      finish();
    },
  });
  return new Response(stream, { headers: { "content-type": "application/x-ndjson; charset=utf-8", "cache-control": "no-store" } });
}
