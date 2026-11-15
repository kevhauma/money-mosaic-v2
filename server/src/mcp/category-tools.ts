import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { and, count, eq } from 'drizzle-orm';
import { z } from 'zod';

import { PARTNER_CONTRIBUTION_CATEGORY_NAME } from 'shared/seed-data.js';

import type { DbOrTx, DrizzleDb } from '../db.js';
import { toEntity } from '../http/entity-response.js';
import { categoryDeleteBlockers, deleteCategory } from '../operations/category-delete.js';
import { categories, type CategoryRow } from '../schema/categories.js';
import { transactions } from '../schema/transactions.js';
import { ISO_DATE, toolResult } from './tool-result.js';

/** The defaults the rule-share import gives a category it has to create (`rules.store.ts`). */
const DEFAULT_COLOR = '#9CA3AF';
const DEFAULT_ICON = 'tag';

const name = z.string().trim().min(1);
const isoDate = z.string().regex(ISO_DATE);

const categoryFields = {
  name,
  kind: z.enum(['expense', 'income', 'neutral']),
  group: z.string().trim().min(1).nullable().optional().describe('null clears it.'),
  color: z.string().min(1).optional().describe(`CSS colour, default ${DEFAULT_COLOR}.`),
  icon: z.string().min(1).optional().describe(`Icon name, default "${DEFAULT_ICON}".`),
  activeFrom: isoDate
    .nullable()
    .optional()
    .describe('First date the category applies (YYYY-MM-DD); null clears it.'),
  activeUntil: isoDate
    .nullable()
    .optional()
    .describe('Last date the category applies (YYYY-MM-DD); null clears it.'),
};

const updateInput = {
  id: z.number().int(),
  ...categoryFields,
  name: name.optional(),
  kind: categoryFields.kind.optional(),
  archived: z.boolean().optional().describe('true archives: hidden from pickers, history kept.'),
};

/** Co-owner tagging finds this category by name, so it is the one the app cannot lose (see the form). */
const isPartnerContribution = (category: CategoryRow): boolean =>
  category.isSystem && category.name === PARTNER_CONTRIBUTION_CATEGORY_NAME;

const ownedCategory = (tx: DbOrTx, userId: number, id: number): CategoryRow => {
  const row = tx
    .select()
    .from(categories)
    .where(and(eq(categories.userId, userId), eq(categories.id, id)))
    .get();
  if (row === undefined) throw new Error('Unknown category id');
  return row;
};

/** Refuses a name another of the user's categories already has, ignoring case. */
const assertUniqueName = (tx: DbOrTx, userId: number, candidate: string, exceptId?: number) => {
  const clash = tx
    .select({ id: categories.id, name: categories.name })
    .from(categories)
    .where(eq(categories.userId, userId))
    .all()
    .find((row) => row.id !== exceptId && row.name.toLowerCase() === candidate.toLowerCase());
  if (clash !== undefined)
    throw new Error(`name: a category called "${clash.name}" already exists`);
};

const assertWindow = (activeFrom: string | null, activeUntil: string | null) => {
  if (activeFrom !== null && activeUntil !== null && activeFrom > activeUntil)
    throw new Error('activeUntil: must be on or after activeFrom');
};

type CreateInput = z.infer<z.ZodObject<typeof categoryFields>>;
type UpdateInput = z.infer<z.ZodObject<typeof updateInput>>;

const createCategory = (db: DrizzleDb, userId: number, input: CreateInput) =>
  db.transaction((tx) => {
    assertUniqueName(tx, userId, input.name);
    assertWindow(input.activeFrom ?? null, input.activeUntil ?? null);
    const row = tx
      .insert(categories)
      .values({
        userId,
        name: input.name,
        kind: input.kind,
        group: input.group ?? null,
        color: input.color ?? DEFAULT_COLOR,
        icon: input.icon ?? DEFAULT_ICON,
        activeFrom: input.activeFrom ?? null,
        activeUntil: input.activeUntil ?? null,
        archived: false,
        isSystem: false,
      })
      .returning()
      .get();
    return toEntity(row);
  });

const updateCategory = (db: DrizzleDb, userId: number, { id, ...changes }: UpdateInput) =>
  db.transaction((tx) => {
    const previous = ownedCategory(tx, userId, id);
    if (changes.name !== undefined && changes.name !== previous.name) {
      if (isPartnerContribution(previous))
        throw new Error(
          `name: "${PARTNER_CONTRIBUTION_CATEGORY_NAME}" cannot be renamed — co-owner tagging finds it by name`,
        );
      assertUniqueName(tx, userId, changes.name, id);
    }
    const next = { ...previous, ...changes };
    assertWindow(next.activeFrom, next.activeUntil);
    const current =
      Object.keys(changes).length === 0
        ? previous
        : tx
            .update(categories)
            .set(changes)
            .where(and(eq(categories.userId, userId), eq(categories.id, id)))
            .returning()
            .get()!;
    return { previous: toEntity(previous), current: toEntity(current) };
  });

const deleteCategoryTool = (db: DrizzleDb, userId: number, id: number, confirm: boolean) =>
  db.transaction((tx) => {
    const category = ownedCategory(tx, userId, id);
    if (isPartnerContribution(category))
      throw new Error(
        `"${PARTNER_CONTRIBUTION_CATEGORY_NAME}" cannot be deleted — co-owner tagging depends on it`,
      );

    if (!confirm) {
      const blockers = categoryDeleteBlockers(tx, userId, id);
      const affected =
        tx
          .select({ value: count() })
          .from(transactions)
          .where(and(eq(transactions.userId, userId), eq(transactions.categoryId, id)))
          .get()?.value ?? 0;
      return {
        category: toEntity(category),
        transactionsLosingCategory: affected,
        blockedBy: blockers,
        canDelete: blockers.loans.length === 0 && blockers.rules.length === 0,
      };
    }

    deleteCategory(tx, userId, id);
    return { deleted: toEntity(category) };
  });

/** Category editing tools (TICKET-MCP-04). Create and update apply at once; delete previews first. */
export const registerCategoryTools = (server: McpServer, db: DrizzleDb, userId: number): void => {
  server.registerTool(
    'create_category',
    {
      description:
        'Create a category. The name must differ (ignoring case) from every existing category, archived ones included. Applies immediately.',
      inputSchema: categoryFields,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) => toolResult(createCategory(db, userId, input)),
  );

  server.registerTool(
    'update_category',
    {
      description:
        'Change any fields of a category, including archived (true hides it from pickers but keeps its history). Applies immediately and returns the previous values, so the change can be undone with another update. The "Partner contribution" category cannot be renamed.',
      inputSchema: updateInput,
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    (input) => toolResult(updateCategory(db, userId, input)),
  );

  server.registerTool(
    'delete_category',
    {
      description:
        'Delete a category. Without confirm: true it only reports how many transactions would lose the category and which loans or rules block the delete. A category a loan tracks or a rule assigns cannot be deleted: point those at another category first. Its transactions become uncategorised (and rules may categorise them again). "Partner contribution" cannot be deleted.',
      inputSchema: { id: z.number().int(), confirm: z.boolean().optional() },
      annotations: { readOnlyHint: false, destructiveHint: true },
    },
    ({ id, confirm }) => toolResult(deleteCategoryTool(db, userId, id, confirm === true)),
  );
};
