import { PRESET_IDS, PRESETS, paletteCss } from "@/lib/theme/presets";

/** Server-rendered CSS variables for every preset and scheme. */
export function PresetStyles() {
  const rules = PRESET_IDS.flatMap((id) =>
    (["light", "dark"] as const).map(
      (mode) => `:root[data-preset="${id}"][data-scheme="${mode}"]{${paletteCss(PRESETS[id][mode])};color-scheme:${mode}}`,
    ),
  );
  // Fallbacks for the instant before the theme script runs (or with JS disabled).
  rules.unshift(
    `:root{${paletteCss(PRESETS.parchment.light)}}`,
    `@media (prefers-color-scheme: dark){:root:not([data-scheme]){${paletteCss(PRESETS.parchment.dark)}}}`,
  );
  return <style dangerouslySetInnerHTML={{ __html: rules.join("\n") }} />;
}
