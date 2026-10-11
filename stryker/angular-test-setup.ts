/**
 * Initializes the Angular testing environment for the Stryker run's Vitest config
 * (`vitest.stryker.config.ts`). `ng test` gets this for free — `@angular/build:unit-test` generates
 * an equivalent `init-testbed` entry point and prepends it to `setupFiles` — but that generated
 * file lives inside the builder's own bundle, so a plain Vitest run has to bring its own.
 *
 * This mirrors the builder's zoneless variant: the `providers` array stays empty because the app
 * ships no `zone.js` polyfill and no test-providers file, which is also why Analog's own
 * `@analogjs/vite-plugin-angular/setup-vitest` is unusable here — it imports `zone.js`.
 */
import { NgModule } from '@angular/core';
import { getTestBed, ɵgetCleanupHook as getCleanupHook } from '@angular/core/testing';
import { BrowserTestingModule, platformBrowserTesting } from '@angular/platform-browser/testing';
import { afterEach, beforeEach } from 'vitest';

// Registered outside the guard below so they apply to every spec file, matching the builder.
beforeEach(getCleanupHook(false));
afterEach(getCleanupHook(true));

const ANGULAR_TESTBED_SETUP = Symbol.for('@angular/cli/testbed-setup');
const global = globalThis as typeof globalThis & Record<symbol, boolean | undefined>;

// Vitest runs this file once per spec module when `isolate` is off, and the test environment may
// only be initialized once.
if (!global[ANGULAR_TESTBED_SETUP]) {
  global[ANGULAR_TESTBED_SETUP] = true;

  @NgModule({ providers: [] })
  class TestModule {}

  getTestBed().initTestEnvironment([BrowserTestingModule, TestModule], platformBrowserTesting(), {
    errorOnUnknownElements: true,
    errorOnUnknownProperties: true,
  });
}
