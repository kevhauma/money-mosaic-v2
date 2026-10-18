/**
 * The handful of 2D-context calls whose **return value** is used, rather than being a draw command
 * that returns nothing. The catch-all noop below would hand back `undefined` for these, and zrender
 * dereferences the result on the very next line — so the failure is a `TypeError` deep in the paint
 * loop, not a badly laid-out chart.
 *
 * Added by TICKET-EXP-02: the Sankey is the first chart here whose labels are free text rather than
 * axis ticks (`measureText`) and whose ribbons are gradient-filled (`createLinearGradient`).
 */
const CONTEXT_RETURN_VALUES: Record<string, () => unknown> = {
  measureText: () => ({ width: 0, actualBoundingBoxAscent: 0, actualBoundingBoxDescent: 0 }),
  createLinearGradient: () => ({ addColorStop: (): void => {} }),
  createRadialGradient: () => ({ addColorStop: (): void => {} }),
};

/**
 * Context types this stub deliberately refuses, answering `null` exactly as a real jsdom canvas
 * does. Only the 2D context is faked.
 *
 * Without this list the catch-all proxy below answers *every* request with an object whose every
 * property is a function — including `getContext('webgl')`, which then tells a WebGL consumer that
 * WebGL exists. TICKET-EXP-05's feasibility gate hit exactly that: a 3D renderer got as far as
 * compiling GLSL against a context that silently did nothing, and threw from inside the paint loop
 * instead of taking its own no-WebGL fallback. A stub that lies about a capability is worse than
 * one that admits it doesn't have it.
 */
const UNSUPPORTED_CONTEXT_TYPES = ['webgl', 'webgl2', 'experimental-webgl', 'webgpu'];

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
 * at the top of a spec file, outside `describe`, and never hand-roll a local version of this - one
 * spec file carrying its own copy is what broke CI on 2026-10-09. zrender asks for a 2D context
 * once and keeps it in a module-level closure (`platformApi.measureText`), so the *first* context
 * any chart in the process receives is the one every later chart measures text against. A local
 * copy whose catch-all returned `undefined` for `measureText` therefore poisoned every chart spec
 * that happened to run after it, surfacing as 19 unhandled `reading 'width' of undefined` errors in
 * an unrelated spec file (`spending-mosaic-panel.component.spec.ts`), and only in the file orders
 * where that copy got there first.
 *
 * For the same reason the context is a single module-level object installed once, rather than a
 * fresh proxy per call: whatever zrender cached stays the thing this module still controls.
 */
const noopCanvasContext = new Proxy(
  {},
  {
    get: (target: Record<string, unknown>, prop: string) => {
      if (prop in target) return target[prop];
      const returnsValue = CONTEXT_RETURN_VALUES[prop];
      return returnsValue ? () => returnsValue() : (): void => {};
    },
    set: (target: Record<string, unknown>, prop: string, value: unknown) => {
      target[prop] = value;
      return true;
    },
  },
);

class ResizeObserverStub {
  observe = (): void => {};
  unobserve = (): void => {};
  disconnect = (): void => {};
}

const stubbedGetContext = ((contextType: string) =>
  UNSUPPORTED_CONTEXT_TYPES.includes(contextType)
    ? null
    : noopCanvasContext) as unknown as typeof HTMLCanvasElement.prototype.getContext;

export const stubEchartsBrowserApis = (): void => {
  globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver;
  // Assigned by identity, not `??=`: jsdom's own `getContext` is defined, it just returns null.
  // Re-assigning the same function on a second call is a no-op, which is the point.
  if (HTMLCanvasElement.prototype.getContext !== stubbedGetContext) {
    HTMLCanvasElement.prototype.getContext = stubbedGetContext;
  }
};
