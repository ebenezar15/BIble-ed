import { BLOCK_SECTIONS, BLOCK_TYPES, CONSENSUS } from "@/lib/content/enums";

export type BlockInput = {
  subject: string; // lemma:H2617A | verse:Jhn.3.16 | entry:parable/lost-son | person:irenaeus
  section: string;
  type: string;
  title?: string | null;
  by?: string | null;
  consensus?: string;
  body: string;
  reviewed?: boolean;
};

export const SUBJECT = /^(lemma|verse|person):(.+)$|^(entry):([a-z_]+\/[a-z0-9-]+)$/;

/** Returns an error message, or null when the input is valid. */
export function validateBlockInput(b: BlockInput): string | null {
  if (!SUBJECT.test(b.subject)) return "The subject must look like lemma:H2617A, verse:Jhn.3.16 or entry:parable/slug.";
  if (!(BLOCK_TYPES as readonly string[]).includes(b.type)) return `Unknown content type "${b.type}".`;
  if (!(BLOCK_SECTIONS as readonly string[]).includes(b.section)) return `Unknown section "${b.section}".`;
  if (b.consensus && !(CONSENSUS as readonly string[]).includes(b.consensus)) return `Unknown consensus "${b.consensus}".`;
  if (!b.body.trim()) return "Write something before saving.";
  return null;
}
