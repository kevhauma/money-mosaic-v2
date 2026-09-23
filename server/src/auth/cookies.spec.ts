import { describe, expect, it } from 'vitest';

import { readCookie, SESSION_COOKIE } from './cookies.js';

describe('auth: readCookie', () => {
  it('finds the session cookie among others, whatever the spacing', () => {
    expect(readCookie(`theme=dark; ${SESSION_COOKIE}=abc123; other=1`, SESSION_COOKIE)).toBe(
      'abc123',
    );
    expect(readCookie(`${SESSION_COOKIE}=abc123`, SESSION_COOKIE)).toBe('abc123');
  });

  it('decodes a percent-encoded value', () => {
    expect(readCookie(`${SESSION_COOKIE}=a%20b`, SESSION_COOKIE)).toBe('a b');
  });

  it('answers undefined for a missing, empty or malformed cookie header', () => {
    expect(readCookie(undefined, SESSION_COOKIE)).toBeUndefined();
    expect(readCookie('', SESSION_COOKIE)).toBeUndefined();
    expect(readCookie('just-a-flag', SESSION_COOKIE)).toBeUndefined();
    expect(readCookie(`${SESSION_COOKIE}=`, SESSION_COOKIE)).toBeUndefined();
    expect(readCookie('mm_sessionish=abc', SESSION_COOKIE)).toBeUndefined();
  });

  it('answers undefined for a value it cannot percent-decode, rather than throwing', () => {
    // `decodeURIComponent('%zz')` throws URIError. Reaching the caller, that became a 500 on an
    // unauthenticated request — the only way unauthenticated input could produce one.
    expect(readCookie(`${SESSION_COOKIE}=%zz`, SESSION_COOKIE)).toBeUndefined();
    expect(readCookie(`${SESSION_COOKIE}=%E0%A4%A`, SESSION_COOKIE)).toBeUndefined();
  });
});
