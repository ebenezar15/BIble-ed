/** Split a tagged morphology code into the codes our morphology table knows. */
export function morphParts(code: string): string[] {
  if (!code) return [];
  if (!/^[HA][A-Z]/.test(code) || !code.includes("/")) return [code];
  const lang = code[0];
  return code
    .split("/")
    .filter(Boolean)
    .map((part, i) => (i === 0 ? part : lang + part));
}
