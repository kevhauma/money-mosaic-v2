import { describe, expect, it } from 'vitest';
import path from 'node:path';

import {
  DEFAULT_PORT,
  SERVER_ROOT,
  resolveConfig,
  resolveDbFile,
  resolvePort,
  resolveStagedImportDir,
  resolveWebRoot,
} from './config.js';

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

describe('config: resolveWebRoot', () => {
  /** `dist/<project>/browser` is the `@angular/build:application` layout, one level above `server/`. */
  it('defaults to the Angular build output', () => {
    expect(resolveWebRoot({})).toBe(
      path.join(SERVER_ROOT, '..', 'dist', 'money-mosaic-vibe', 'browser'),
    );
  });

  it('honours a WEB_ROOT override, resolving a relative path against the server root', () => {
    expect(resolveWebRoot({ WEB_ROOT: 'public-build' })).toBe(
      path.join(SERVER_ROOT, 'public-build'),
    );
  });

  it('honours an absolute WEB_ROOT override unchanged', () => {
    const absolute = path.resolve(SERVER_ROOT, '..', 'somewhere', 'browser');
    expect(resolveWebRoot({ WEB_ROOT: absolute })).toBe(absolute);
  });

  it('treats a blank WEB_ROOT as unset rather than as the server root', () => {
    expect(resolveWebRoot({ WEB_ROOT: '   ' })).toBe(resolveWebRoot({}));
  });
});

describe('config: resolveStagedImportDir', () => {
  it('defaults to data/staged-imports beside the database', () => {
    expect(resolveStagedImportDir({})).toBe(path.join(SERVER_ROOT, 'data', 'staged-imports'));
  });

  it('honours a STAGED_IMPORT_DIR override, resolving a relative path against the server root', () => {
    expect(resolveStagedImportDir({ STAGED_IMPORT_DIR: 'scratch' })).toBe(
      path.join(SERVER_ROOT, 'scratch'),
    );
  });

  it('honours an absolute STAGED_IMPORT_DIR override unchanged', () => {
    const absolute = path.resolve(SERVER_ROOT, '..', 'elsewhere', 'staged');
    expect(resolveStagedImportDir({ STAGED_IMPORT_DIR: absolute })).toBe(absolute);
  });

  it('treats a blank STAGED_IMPORT_DIR as unset rather than as the server root', () => {
    expect(resolveStagedImportDir({ STAGED_IMPORT_DIR: '   ' })).toBe(resolveStagedImportDir({}));
  });
});

describe('config: resolveConfig', () => {
  it('combines the overrides and reads dev from NODE_ENV', () => {
    expect(
      resolveConfig({
        PORT: '4999',
        DB_FILE: ':memory:',
        WEB_ROOT: '/srv/app',
        STAGED_IMPORT_DIR: '/srv/staged',
        NODE_ENV: 'production',
      }),
    ).toEqual({
      port: 4999,
      dbFile: ':memory:',
      isDev: false,
      webRoot: path.resolve('/srv/app'),
      stagedImportDir: path.resolve('/srv/staged'),
    });
    expect(resolveConfig({}).isDev).toBe(true);
  });
});
