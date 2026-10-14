const ALLOWED = new Set(["b", "i", "br", "sup", "sub"]);

/** Reduce STEP lexicon markup to a safe subset: b/i/br/sup/sub plus verse links. */
export function sanitizeLexicon(html: string): string {
  const refs: string[] = [];
  let out = html.replace(/<ref='([^']+)'>([\s\S]*?)<\/ref>/gi, (_m, ref: string, text: string) => {
    const first = ref.split(/[;,\s]/)[0].replace(/\.$/, "");
    refs.push(`<a href="/verse/${encodeURI(first)}">${text}</a>`);
    return `\u0000${refs.length - 1}\u0000`;
  });
  out = out.replace(/<\/?([a-z0-9]+)[^>]*>/gi, (tag, name: string) => {
    const n = name.toLowerCase();
    if (!ALLOWED.has(n)) return "";
    if (n === "br") return "<br>";
    return tag.startsWith("</") ? `</${n}>` : `<${n}>`;
  });
  out = out.replace(/__/g, "").replace(/<br>\s+/g, "<br>");
  return out.replace(/\u0000(\d+)\u0000/g, (_m, i: string) => refs[Number(i)]);
}
