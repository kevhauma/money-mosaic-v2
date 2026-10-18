import { stubEchartsBrowserApis } from './echarts-jsdom.testing';

stubEchartsBrowserApis();

const context2d = (): CanvasRenderingContext2D =>
  document.createElement('canvas').getContext('2d') as CanvasRenderingContext2D;

describe('stubEchartsBrowserApis', () => {
  // zrender dereferences `measureText(...).width` on the next line (`ensureFontMeasureInfo`), so a
  // context that merely swallows the call throws from inside the paint loop of whichever chart spec
  // runs next. That is the shape of the CI failure this guards: a local copy of the stub returned
  // `undefined` here and took an unrelated spec file down with it.
  it('reports a width for measured text instead of swallowing the call', () => {
    const measured = context2d().measureText('Groceries');

    expect(measured).toBeDefined();
    expect(typeof measured.width).toBe('number');
  });

  it('hands out the same context every time, because zrender caches the first one it gets', () => {
    const before = context2d();
    stubEchartsBrowserApis();

    expect(context2d()).toBe(before);
  });

  // A stub that lies about WebGL is worse than one that admits it has none: a 3D renderer would
  // compile GLSL against a context that silently does nothing instead of taking its own fallback.
  it('admits it has no WebGL, exactly as a real jsdom canvas does', () => {
    const canvas = document.createElement('canvas');

    expect(canvas.getContext('webgl')).toBeNull();
    expect(canvas.getContext('webgl2')).toBeNull();
    expect(canvas.getContext('2d')).not.toBeNull();
  });

  it('polyfills the ResizeObserver the echarts directive needs', () => {
    expect(() => new ResizeObserver(() => {}).disconnect()).not.toThrow();
  });
});
