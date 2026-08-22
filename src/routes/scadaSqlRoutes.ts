/**
 * Express REST API Routes for SCADA SQL Database Layer & TASCGrid
 */

import { Router, Request, Response } from 'express';
import { scadaSqlService } from '../services/sql/scadaSqlService';
import type { SqlQueryOptions } from '../types/sql';

export const scadaSqlRouter = Router();

/**
 * GET /api/scada-sql/status
 * Get connection pool health and performance metrics
 */
scadaSqlRouter.get('/status', async (_req: Request, res: Response) => {
  try {
    const status = await scadaSqlService.getStatus();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scada-sql/configure
 * Update configuration and reconnect pool
 */
scadaSqlRouter.post('/configure', async (req: Request, res: Response) => {
  try {
    const newConfig = req.body;
    const status = await scadaSqlService.configure(newConfig);
    res.json({ success: true, status });
  } catch (err: any) {
    res.status(400).json({ success: false, error: err.message });
  }
});

/**
 * POST /api/scada-sql/test-connection
 * Test connection without mutating active pool
 */
scadaSqlRouter.post('/test-connection', async (req: Request, res: Response) => {
  try {
    const testCfg = req.body;
    const result = await scadaSqlService.testConnection(testCfg);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ success: false, error: err.message });
  }
});

/**
 * GET /api/scada-sql/databases
 * Get all available databases on the SQL Server
 */
scadaSqlRouter.get('/databases', async (_req: Request, res: Response) => {
  try {
    const databases = await scadaSqlService.getDatabases();
    res.json({ databases });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/scada-sql/tables
 * List all user tables and views in target database
 */
scadaSqlRouter.get('/tables', async (req: Request, res: Response) => {
  try {
    const database = (req.query.database as string) || undefined;
    const tables = await scadaSqlService.getTables(database);
    res.json({ tables });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/scada-sql/query
 * Execute table query or custom query
 */
scadaSqlRouter.post('/query', async (req: Request, res: Response) => {
  try {
    const options: SqlQueryOptions = req.body;
    const result = await scadaSqlService.executeQuery(options);
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/scada-sql/execute
 * Execute Stored Procedure or parameterized command
 */
scadaSqlRouter.post('/execute', async (req: Request, res: Response) => {
  try {
    const { database, type, procedureName, sql, parameters } = req.body;
    const result = await scadaSqlService.executeManipulator({
      database,
      type: type || 'procedure',
      procedureName,
      sql,
      parameters,
    });
    res.json(result);
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SQL Data Sources CRUD Endpoints
// ----------------------------------------------------

scadaSqlRouter.get('/data-sources', (_req: Request, res: Response) => {
  try {
    const dataSources = scadaSqlService.getDataSources();
    res.json({ dataSources });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

scadaSqlRouter.post('/data-sources', (req: Request, res: Response) => {
  try {
    const ds = scadaSqlService.saveDataSource(req.body);
    res.json({ success: true, dataSource: ds });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

scadaSqlRouter.delete('/data-sources/:id', (req: Request, res: Response) => {
  try {
    const deleted = scadaSqlService.deleteDataSource(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// ----------------------------------------------------
// SQL Data Manipulators CRUD Endpoints
// ----------------------------------------------------

scadaSqlRouter.get('/data-manipulators', (_req: Request, res: Response) => {
  try {
    const dataManipulators = scadaSqlService.getDataManipulators();
    res.json({ dataManipulators });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

scadaSqlRouter.post('/data-manipulators', (req: Request, res: Response) => {
  try {
    const dm = scadaSqlService.saveDataManipulator(req.body);
    res.json({ success: true, dataManipulator: dm });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

scadaSqlRouter.delete('/data-manipulators/:id', (req: Request, res: Response) => {
  try {
    const deleted = scadaSqlService.deleteDataManipulator(req.params.id);
    res.json({ success: deleted });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});
