/**
 * Joins a base daisyUI class with conditional modifier classes and a passthrough
 * utility-class string. Modifiers that are `undefined`/`false` (i.e. the axis is
 * at its default value) are dropped.
 */
export function daisyClasses(
  base: string,
  modifiers: (string | undefined | false)[],
  extra: string,
): string {
  return [base, ...modifiers.filter((modifier): modifier is string => !!modifier), extra]
    .filter(Boolean)
    .join(' ');
}
