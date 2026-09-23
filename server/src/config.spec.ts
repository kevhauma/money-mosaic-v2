import { describe, expect, it } from 'vitest';
import path from 'node:path';

import { DEFAULT_PORT, SERVER_ROOT, resolveConfig, resolveDbFile, resolvePort } from './config.js';

describe('config: resolvePort', () => {
  it('falls back to 4300 when PORT is unset', () => {
    expect(resolvePort({})).toBe(DEFAULT_PORT);
    expect(resolvePort({ PORT: '   ' })).toBe(DEFAULT_PORT);
  });

  it('honours a PORT override', () => {
    expect(resolvePort({ PORT: '5123' })).toBe(5123);
  });

  it('rejects a PORT that is not a usable port number', () => {
    expect(() => resolvePort({ PORT: 'nope' })).toThrow(/PORT must be an integer/);
    expect(() => resolvePort({ PORT: '0' })).toThrow(/PORT must be an integer/);
    expect(() => resolvePort({ PORT: '70000' })).toThrow(/PORT must be an integer/);
  });
});

describe('config: resolveDbFile', () => {
  it('defaults to server/data/money-mosaic.sqlite', () => {
    expect(resolveDbFile({})).toBe(path.join(SERVER_ROOT, 'data', 'money-mosaic.sqlite'));
  });

  it('honours a DB_FILE override, resolving a relative path against the server root', () => {
    expect(resolveDbFile({ DB_FILE: 'data/other.sqlite' })).toBe(
      path.join(SERVER_ROOT, 'data', 'other.sqlite'),
    );
  });

  it('honours an absolute DB_FILE override unchanged', () => {
    const absolute = path.resolve(SERVER_ROOT, '..', 'elsewhere.sqlite');
    expect(resolveDbFile({ DB_FILE: absolute })).toBe(absolute);
  });

  it('passes :memory: through so tests never touch a file', () => {
    expect(resolveDbFile({ DB_FILE: ':memory:' })).toBe(':memory:');
  });
});

describe('config: resolveConfig', () => {
  it('combines both overrides and reads dev from NODE_ENV', () => {
    expect(resolveConfig({ PORT: '4999', DB_FILE: ':memory:', NODE_ENV: 'production' })).toEqual({
      port: 4999,
      dbFile: ':memory:',
      isDev: false,
    });
    expect(resolveConfig({}).isDev).toBe(true);
  });
});
