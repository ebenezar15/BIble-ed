/** Single-owner protection: when SITE_PASSWORD is set, every page needs the login cookie. */
export const AUTH_COOKIE = "logos-auth";

export async function authToken(password: string): Promise<string> {
  const data = new TextEncoder().encode(`logos-relational:${password}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

const PUBLIC = [/^\/login/, /^\/_next\//, /^\/manifest\.webmanifest$/, /^\/sw\.js$/, /^\/icon/, /^\/apple-icon/, /^\/favicon/];

export function isPublicPath(path: string): boolean {
  return PUBLIC.some((p) => p.test(path));
}
