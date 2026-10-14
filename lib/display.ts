// STEP marks morpheme boundaries with "/" and "\" (e.g. "הָ/אָרֶץ\׃", "the/ earth"); readers don't need them.
export const cleanSurface = (s: string) => s.replace(/[/\\]/g, "");
export const cleanTranslit = (s: string) => s.replace(/\//g, "");
export const cleanGloss = (s: string) => s.replace(/\/\s*/g, " ").replace(/\s+/g, " ").trim();
