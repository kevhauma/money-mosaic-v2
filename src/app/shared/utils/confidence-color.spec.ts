import { confidenceToColor } from './confidence-color';

describe('confidenceToColor', () => {
  it('maps 0 confidence to pure red (hue 0)', () => {
    expect(confidenceToColor(0)).toBe('hsl(0, 65%, 38%)');
  });

  it('maps 1 confidence to pure green (hue 120)', () => {
    expect(confidenceToColor(1)).toBe('hsl(120, 65%, 38%)');
  });

  it('maps a midpoint confidence to the midpoint hue', () => {
    expect(confidenceToColor(0.5)).toBe('hsl(60, 65%, 38%)');
  });

  it('clamps out-of-range confidence values', () => {
    expect(confidenceToColor(-1)).toBe('hsl(0, 65%, 38%)');
    expect(confidenceToColor(2)).toBe('hsl(120, 65%, 38%)');
  });
});
