import { computeZoomWindow } from './chart-zoom-window';

describe('computeZoomWindow', () => {
  const monthKeys = ['2024-01', '2024-02', '2024-03', '2024-04', '2024-05', '2024-06'];

  it('maps a from/to within range to the matching bucket indices', () => {
    expect(computeZoomWindow(monthKeys, '2024-02-10', '2024-04-20', 'month')).toEqual({
      startValue: 1,
      endValue: 3,
    });
  });

  it('clamps a from before the series start to index 0', () => {
    expect(computeZoomWindow(monthKeys, '2020-01-01', '2024-03-15', 'month')).toEqual({
      startValue: 0,
      endValue: 2,
    });
  });

  it('clamps a to after the series end to the last index', () => {
    expect(computeZoomWindow(monthKeys, '2024-05-01', '2030-01-01', 'month')).toEqual({
      startValue: 4,
      endValue: 5,
    });
  });

  it('returns a zero window when there are no buckets', () => {
    expect(computeZoomWindow([], '2024-01-01', '2024-06-01', 'month')).toEqual({
      startValue: 0,
      endValue: 0,
    });
  });
});
