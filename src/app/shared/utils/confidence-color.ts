/**
 * Interpolates a `0..1` confidence value to a red (0) → green (1) HSL colour, clamping
 * out-of-range input. Saturation/lightness are fixed low enough that white text stays
 * legible across the whole hue range (TICKET-ML-16).
 */
export function confidenceToColor(confidence: number): string {
  const clamped = Math.min(1, Math.max(0, confidence));
  const hue = clamped * 120;
  return `hsl(${hue}, 65%, 38%)`;
}
