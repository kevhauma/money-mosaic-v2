import {
  clearLocalMigrationChoice,
  readLocalMigrationChoice,
  writeLocalMigrationChoice,
} from './migration-choice';

describe('migration-choice (what this browser remembers, per account)', () => {
  beforeEach(() => {
    localStorage.removeItem('mm-local-migration:7');
    localStorage.removeItem('mm-local-migration:8');
  });

  it('has no answer for an account that has never been asked', () => {
    expect(readLocalMigrationChoice(7)).toBeNull();
  });

  /** The acceptance criterion in as many words: "never ask again" has to survive a reload. */
  it('remembers "never" in storage, so a reload still knows', () => {
    writeLocalMigrationChoice(7, 'never');

    expect(localStorage.getItem('mm-local-migration:7')).toBe('never');
    expect(readLocalMigrationChoice(7)).toBe('never');
  });

  it('keys the answer by account, so one account is not answered for by another', () => {
    writeLocalMigrationChoice(7, 'done');

    expect(readLocalMigrationChoice(8)).toBeNull();
  });

  it('forgets it on request, which is how the Data section offers the move again', () => {
    writeLocalMigrationChoice(7, 'never');
    clearLocalMigrationChoice(7);

    expect(readLocalMigrationChoice(7)).toBeNull();
  });

  it('ignores a value that is not one of the two choices', () => {
    localStorage.setItem('mm-local-migration:7', 'later');

    expect(readLocalMigrationChoice(7)).toBeNull();
  });
});
