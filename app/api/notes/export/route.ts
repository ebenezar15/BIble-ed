import { listNotes, notesToMarkdown } from "@/lib/db/edit";
import { isOwner } from "@/lib/owner";

export async function GET(req: Request) {
  if (!(await isOwner())) return new Response("Sign in first.", { status: 401 });
  const format = new URL(req.url).searchParams.get("format") === "json" ? "json" : "md";
  const notes = await listNotes();
  const date = new Date().toISOString().slice(0, 10);
  const body = format === "json" ? JSON.stringify(notes, null, 2) : notesToMarkdown(notes);
  return new Response(body, {
    headers: {
      "content-type": format === "json" ? "application/json" : "text/markdown; charset=utf-8",
      "content-disposition": `attachment; filename="logos-notes-${date}.${format}"`,
    },
  });
}
