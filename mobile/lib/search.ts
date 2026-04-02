/**
 * Search utilities — ported from web src/lib/search.ts.
 */

const ABBREVIATION_MAP: Record<string, string> = {
  o63: ".063",
  ss: "stainless steel",
  dp: "diamond plate",
  imp: "insulated metal panel",
  eps: "expanded polystyrene",
  pir: "polyisocyanurate",
  ply: "plywood",
  osb: "oriented strand board",
  mdf: "medium density fiberboard",
  hdpe: "high density polyethylene",
  pvc: "polyvinyl chloride",
  "3/4": "0.75",
  "1/2": "0.5",
  "1/4": "0.25",
};

/** Normalize search input into tokens, expanding abbreviations */
export function normalizeSearchTokens(input: string): string[] {
  const lower = input.toLowerCase().trim();
  if (!lower) return [];

  // Split on spaces and common delimiters
  const raw = lower
    .replace(/[x×]/g, " ") // Split "4x8" → "4 8"
    .split(/\s+/)
    .filter(Boolean);

  return raw.map((token) => ABBREVIATION_MAP[token] ?? token);
}
