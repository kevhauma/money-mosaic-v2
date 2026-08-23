/**
 * Finds markup in a hand-authored content string that the app has no renderer for (TICKET-PUB-10).
 *
 * Guides, the FAQ, changelog entries and roadmap rows are all plain strings interpolated straight
 * into a template — `{{ guide.summary }}`, `{{ step.description }}` — so there is no markdown pass
 * anywhere in the app. A `*word*` written for emphasis therefore reaches the reader as two literal
 * asterisks, which is exactly what happened to one guide summary for the whole life of
 * TICKET-PUB-02. Nothing stopped the next string doing the same, so this is that "nothing".
 *
 * A *testing* helper on purpose: the content is static and hand-written, so the right time to catch
 * this is when a spec runs over the data, not at runtime on every render. Emphasis in this codebase
 * is carried by wording and by typographic quotes, both of which survive interpolation intact.
 *
 * Returns each offending fragment, so a failure names the markup rather than just the string.
 */
export function findUnrenderedMarkup(text: string): string[] {
  return MARKUP_PATTERNS.flatMap((pattern) => Array.from(text.matchAll(pattern), (m) => m[0]));
}

const MARKUP_PATTERNS: readonly RegExp[] = [
  // *emphasis*, **strong**, ***both***
  /\*{1,3}[^*\s][^*]*?\*{1,3}/g,
  // _emphasis_ and __strong__, but not snake_case or a leading/trailing underscore in an identifier
  /(?<![A-Za-z0-9_])_{1,2}[^_\s][^_]*?_{1,2}(?![A-Za-z0-9_])/g,
  // `inline code`
  /`[^`]+`/g,
  // [label](target)
  /\[[^\]]+\]\([^)]+\)/g,
  // A heading marker at the start of a line
  /^#{1,6}\s+\S/gm,
];
