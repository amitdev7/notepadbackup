// NEW-arch icon registry — pure vector data, no React (DOM-free: safe for tests).
//
// Path data lives in ./phosphor-paths (generated, 0 0 256 256 viewBox); this
// module only resolves names. kit's icon() / the renderer call resolveIconData
// and draw the returned subpaths — unknown names fall back to ICON_FALLBACK so
// an icon never renders as nothing silently.

import { PHOSPHOR_PATHS, PHOSPHOR_VB } from "./phosphor-paths";

/** Canonical names that have real path data. */
export const ICON_NAMES: string[] = Object.keys(PHOSPHOR_PATHS).sort();

/** Name everything falls back to when resolution fails. Guaranteed in ICON_NAMES. */
export const ICON_FALLBACK = "square";

/**
 * Friendly spellings used across library defs that have no Phosphor entry of
 * their own. Every target is a canonical ICON_NAMES entry (no data duplicated).
 */
export const ICON_ALIASES: Record<string, string> = {
  logo: "sparkle",
  search: "magnifying-glass",
  mail: "envelope",
  dots: "dots-three",
  chart: "chart-bar",
  home: "house",
  grid: "squares-four",
  "chevron-down": "caret-down",
  "chevron-up": "caret-up",
  "chevron-left": "caret-left",
  "chevron-right": "caret-right",
};

/** Vector data for one icon: filled subpaths in a square viewBox. */
export interface IconData {
  d: string[];
  vb: number;
}

function normalize(name: string): string {
  return name.trim().toLowerCase().replace(/[_\s]+/g, "-").replace(/-+/g, "-");
}

/**
 * Resolve a (possibly messy / aliased) name to its canonical ICON_NAMES entry.
 * Returns null when the name is unknown — use resolveIconData for a version
 * that never comes back empty.
 */
export function resolveIconName(name: string): string | null {
  const n = normalize(name);
  if (!n) return null;
  if (PHOSPHOR_PATHS[n]) return n;
  const alias = ICON_ALIASES[n];
  if (alias && PHOSPHOR_PATHS[alias]) return alias;
  return null;
}

/**
 * Resolve a name to drawable path data for kit's icon().
 * Unknown (or empty) names return the ICON_FALLBACK glyph — never nothing.
 */
export function resolveIconData(name: string): IconData {
  const resolved = resolveIconName(name) ?? ICON_FALLBACK;
  return { d: PHOSPHOR_PATHS[resolved], vb: PHOSPHOR_VB };
}
