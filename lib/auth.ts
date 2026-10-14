/** Single-owner protection: when SITE_PASSWORD is set, every page needs the login cookie. */
export const AUTH_COOKIE = "logos-auth";

/**
 * Cookie value proving the password was entered: HMAC-SHA256 of the password, keyed with SITE_SECRET when set
 * (recommended, so a copied cookie cannot be brute-forced offline).
 */
export async function authToken(password: string, secret?: string): Promise<string> {
  const enc = new TextEncoder();
  const key = await crypto.subtle.importKey(
    "raw", enc.encode(`logos-relational:${secret ?? ""}`), { name: "HMAC", hash: "SHA-256" }, false, ["sign"],
  );
  const sig = await crypto.subtle.sign("HMAC", key, enc.encode(password));
  return [...new Uint8Array(sig)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Constant-time string comparison. */
export function safeEqual(a: string | undefined, b: string): boolean {
  if (a === undefined || a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

const PUBLIC = [/^\/login/, /^\/_next\//, /^\/manifest\.webmanifest$/, /^\/sw\.js$/, /^\/offline$/, /^\/icon/, /^\/apple-icon/, /^\/favicon/];

export function isPublicPath(path: string): boolean {
  return PUBLIC.some((p) => p.test(path));
}

/** Where to go after signing in: only paths on this site (blocks //host and /\host tricks). */
export function safeNext(next: string): string {
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return "/";
  try {
    const u = new URL(next, "http://local.invalid");
    return u.origin === "http://local.invalid" ? u.pathname + u.search + u.hash : "/";
  } catch {
    return "/";
  }
}
