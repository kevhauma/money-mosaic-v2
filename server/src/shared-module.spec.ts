import fs from 'node:fs';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

/**
 * The `shared/` workspace is the one location both the Angular app and this server may import
 * (TICKET-SRV-02), and that only works while it depends on neither. An ESLint guard says so for
 * the patterns it knows; this says it for **every** module specifier, including one nobody has
 * thought of yet.
 *
 * It lives in the server suite rather than in `shared/` because `ng test` only discovers specs
 * under `src/`, and a spec that never runs proves nothing.
 */

const sharedFile = (name: string): string =>
  fileURLToPath(new URL(`../../shared/${name}`, import.meta.url));

/** Module specifiers of every `import`/`export ... from` in the source, type-only ones included. */
const importsOf = (file: string): string[] => {
  const source = fs.readFileSync(file, 'utf8');
  return [...source.matchAll(/^\s*(?:import|export)\b[^;]*?\bfrom\s*'([^']+)'/gm)].map(
    (match) => match[1]!,
  );
};

describe('shared/: dependency freedom', () => {
  it('entities.ts imports nothing at all — no Angular, no Dexie, no Drizzle', () => {
    // The 29 entity types only ever referenced Dexie through `app-db.ts`'s `AppDb` class, never in
    // a type definition, which is what made this move possible in the first place.
    expect(importsOf(sharedFile('entities.ts'))).toEqual([]);
  });

  it('seed-data.ts reaches no further than its sibling entity types', () => {
    expect(importsOf(sharedFile('seed-data.ts'))).toEqual(['./entities.js']);
  });

  it('holds every module in the folder to the same rule, including ones added later', () => {
    // Named files above would leave a third module guarded by nothing. This reads the folder, so
    // a new file is covered the moment it lands.
    const folder = fileURLToPath(new URL('../../shared/', import.meta.url));
    const modules = fs.readdirSync(folder).filter((name) => name.endsWith('.ts'));

    expect(modules.length).toBeGreaterThanOrEqual(2);

    const offenders = modules.flatMap((name) =>
      importsOf(sharedFile(name))
        // A relative sibling inside shared/ is fine; anything else is a dependency.
        .filter((specifier) => !specifier.startsWith('./'))
        .map((specifier) => `${name} -> ${specifier}`),
    );

    expect(offenders).toEqual([]);
  });

  it('carries no dependencies of its own', () => {
    const manifest = JSON.parse(fs.readFileSync(sharedFile('package.json'), 'utf8')) as {
      dependencies?: unknown;
      devDependencies?: unknown;
    };

    expect(manifest.dependencies).toBeUndefined();
    expect(manifest.devDependencies).toBeUndefined();
  });
});
