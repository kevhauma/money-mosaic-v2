import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { vi } from 'vitest';
import { isCompactViewport } from './compact-viewport';

type Listener = (event: MediaQueryListEvent) => void;

/** A `matchMedia` stub whose `matches` a test can flip, since jsdom evaluates no media query. */
const stubMatchMedia = (initial: boolean) => {
  const listeners = new Set<Listener>();
  const removed: Listener[] = [];
  let queried = '';

  const matchMedia = vi.fn((query: string) => {
    queried = query;
    return {
      matches: initial,
      addEventListener: (_: 'change', listener: Listener) => listeners.add(listener),
      removeEventListener: (_: 'change', listener: Listener) => {
        listeners.delete(listener);
        removed.push(listener);
      },
    } as unknown as MediaQueryList;
  });

  vi.stubGlobal('matchMedia', matchMedia);

  return {
    get query(): string {
      return queried;
    },
    get listenerCount(): number {
      return listeners.size;
    },
    get removedCount(): number {
      return removed.length;
    },
    emit: (matches: boolean) =>
      listeners.forEach((listener) => listener({ matches } as MediaQueryListEvent)),
  };
};

@Component({ selector: 'app-host', template: '' })
class HostComponent {
  readonly compact = isCompactViewport();
}

describe('isCompactViewport (TICKET-TXN-12)', () => {
  afterEach(() => vi.unstubAllGlobals());

  it('seeds from the media query and asks for the phone-width one', () => {
    const media = stubMatchMedia(true);

    const fixture = TestBed.createComponent(HostComponent);

    expect(fixture.componentInstance.compact()).toBe(true);
    expect(media.query).toBe('(max-width: 767.98px)');
  });

  it('follows the query as the viewport crosses the breakpoint', () => {
    const media = stubMatchMedia(false);
    const fixture = TestBed.createComponent(HostComponent);
    expect(fixture.componentInstance.compact()).toBe(false);

    media.emit(true);
    expect(fixture.componentInstance.compact()).toBe(true);

    media.emit(false);
    expect(fixture.componentInstance.compact()).toBe(false);
  });

  it('drops its listener when the component is destroyed', () => {
    const media = stubMatchMedia(false);
    const fixture = TestBed.createComponent(HostComponent);
    expect(media.listenerCount).toBe(1);

    fixture.destroy();

    expect(media.listenerCount).toBe(0);
    expect(media.removedCount).toBe(1);
  });

  it('reports the desktop layout where matchMedia is missing, rather than throwing', () => {
    // What jsdom gives a unit test that does not stub it — and what the helper has to survive,
    // since it runs in a field initializer before any test can intervene.
    vi.stubGlobal('matchMedia', undefined);

    const fixture = TestBed.createComponent(HostComponent);

    expect(fixture.componentInstance.compact()).toBe(false);
  });
});
