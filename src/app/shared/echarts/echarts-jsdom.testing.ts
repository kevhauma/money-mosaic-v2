/**
 * The two browser APIs an echarts chart needs that jsdom doesn't have (TICKET-STAT-27 extracted
 * this once a third spec file needed the same block):
 *
 * - `ResizeObserver`, which `NgxEchartsDirective` uses to observe its host element;
 * - a canvas 2D context — jsdom defines `getContext` but always returns `null`, so any spec that
 *   flushes change detection with a chart mounted drives zrender's real paint path into a null
 *   context and the fixture throws on `clearRect` (or on dispose).
 *
 * Both are process-global prototype patches, which is exactly why they belong in one place: Vitest
 * runs `isolate: false`, so three hand-copied versions would be three chances to diverge. Call once
 * at the top of a spec file, outside `describe`.
 */
export const stubEchartsBrowserApis = (): void => {
  class ResizeObserverStub {
    observe = (): void => {};
    unobserve = (): void => {};
    disconnect = (): void => {};
  }
  globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;

  const noopCanvasContext = new Proxy(
    {},
    {
      get: (target: Record<string, unknown>, prop: string) =>
        prop in target ? target[prop] : (): void => {},
      set: (target: Record<string, unknown>, prop: string, value: unknown) => {
        target[prop] = value;
        return true;
      },
    },
  );
  // Assigned unconditionally, not `??=`: jsdom's own `getContext` is defined, it just returns null.
  HTMLCanvasElement.prototype.getContext = (() =>
    noopCanvasContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;
};
