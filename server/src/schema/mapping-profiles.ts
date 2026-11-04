import { index, integer, sqliteTable, text } from 'drizzle-orm/sqlite-core';

import type { MappingProfileColumns } from 'shared/entities.js';
import {
  SIGN_CONVENTIONS,
  SUPPORTED_DATE_FORMATS as DATE_FORMATS,
  SUPPORTED_ENCODINGS as ENCODINGS,
} from 'shared/seed-data.js';
import { inList, json, jsonArray, ownerId } from './columns.js';

/**
 * A saved CSV column mapping (FR-IMP-2), ported from Dexie's `mappingProfiles` store
 * (TICKET-SRV-02). `seedUserDefaults` puts the KBC and Belfius templates here for a new user, the
 * same two rows every account starts with.
 *
 * `defaultAccountId` is a plain column rather than a foreign key: a profile outliving the account
 * it was last used for is a stale preference, not a broken reference, and deleting an account
 * should not take a bank's column mapping with it.
 */
export const mappingProfiles = sqliteTable(
  'mappingProfiles',
  {
    id: integer('id').primaryKey({ autoIncrement: true }),
    userId: ownerId(),
    name: text('name').notNull(),
    bankPreset: text('bankPreset'),
    headerSignature: jsonArray<string[]>('headerSignature'),
    delimiter: text('delimiter').notNull(),
    decimalSeparator: text('decimalSeparator').notNull(),
    dateFormat: text('dateFormat', { enum: DATE_FORMATS }).notNull(),
    encoding: text('encoding', { enum: ENCODINGS }).notNull(),
    headerRows: integer('headerRows').notNull(),
    signConvention: text('signConvention', { enum: SIGN_CONVENTIONS }).notNull(),
    columns: json<MappingProfileColumns>('columns').notNull(),
    defaultAccountId: integer('defaultAccountId'),
  },
  (table) => [
    index('mappingProfiles_userId_idx').on(table.userId),
    index('mappingProfiles_userId_name_idx').on(table.userId, table.name),
    index('mappingProfiles_userId_bankPreset_idx').on(table.userId, table.bankPreset),
    index('mappingProfiles_userId_defaultAccountId_idx').on(table.userId, table.defaultAccountId),
    inList('mappingProfiles_dateFormat_check', table.dateFormat, DATE_FORMATS),
    inList('mappingProfiles_encoding_check', table.encoding, ENCODINGS),
    inList('mappingProfiles_signConvention_check', table.signConvention, SIGN_CONVENTIONS),
  ],
);

export type MappingProfileRow = typeof mappingProfiles.$inferSelect;
export type NewMappingProfileRow = typeof mappingProfiles.$inferInsert;
