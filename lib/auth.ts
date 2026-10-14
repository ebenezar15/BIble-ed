/** Single-owner protection: when SITE_PASSWORD is set, every page needs the login cookie. */
export const AUTH_COOKIE = "logos-auth";

export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`logos-relational:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
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
