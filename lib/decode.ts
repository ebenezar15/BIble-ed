/** decodeURIComponent that returns null instead of throwing on malformed input (e.g. a stray "%"). */
export function safeDecode(s: string): string | null {
  try {
    return decodeURIComponent(s);
  } catch {
    return null;
  }
}
