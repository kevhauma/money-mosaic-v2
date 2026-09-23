import { Router } from 'express';

import { readSchemaVersion, type DatabaseHandle } from '../db.js';

export type HealthResponse = {
  readonly ok: true;
  readonly schemaVersion: number;
};

/**
 * `GET /api/health` — the one endpoint TICKET-SRV-01 ships. Later tickets use it as their smoke
 * check, so it answers two questions: is the process up, and which schema is it serving.
 */
export const createHealthRouter = (handle: DatabaseHandle): Router => {
  const router = Router();

  router.get('/health', (_req, res) => {
    const body: HealthResponse = { ok: true, schemaVersion: readSchemaVersion(handle) };
    res.json(body);
  });

  return router;
};
