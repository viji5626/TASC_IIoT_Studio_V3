import { AppState, DriverTag, DriverProtocol, DriverTagDataType, DriverAccessType, ModbusRegisterType } from '../types';

// ─── CRUD ───────────────────────────────────────────────────────────────────

export function getDriverTagById(appState: AppState, tagId: string): DriverTag | undefined {
  return (appState.driverTags || []).find(t => t.tagId === tagId);
}

export function registerDriverTag(appState: AppState, tag: DriverTag): DriverTag[] {
  const existing = appState.driverTags || [];
  return [...existing, tag];
}

export function updateDriverTag(appState: AppState, tagId: string, updates: Partial<DriverTag>): DriverTag[] {
  return (appState.driverTags || []).map(t =>
    t.tagId === tagId ? { ...t, ...updates, updatedAt: new Date().toISOString() } : t
  );
}

export function deleteDriverTag(appState: AppState, tagId: string): DriverTag[] {
  return (appState.driverTags || []).filter(t => t.tagId !== tagId);
}

// ─── VALIDATION ─────────────────────────────────────────────────────────────

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

export function validateDriverTag(tag: Partial<DriverTag>): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!tag.tagName?.trim()) errors.push('Tag name is required.');
  if (!tag.connectionId) errors.push('A driver connection must be assigned.');
  if (!tag.dataType) errors.push('Data type is required.');
  if (!tag.pollRate || tag.pollRate < 100) errors.push('Poll rate must be at least 100ms.');

  // Modbus-specific
  if (tag.protocol === 'modbus_tcp' || tag.protocol === 'modbus_rtu') {
    if (tag.address === undefined || tag.address < 0 || tag.address > 65535) {
      errors.push('Modbus address must be between 0 and 65535.');
    }
    if (!tag.registerType) errors.push('Modbus register type is required.');
    if ((tag.registerType === 'coil' || tag.registerType === 'discrete_input') && tag.dataType !== 'boolean') {
      warnings.push('Coil/Discrete Input registers are typically boolean data type.');
    }
  }

  // OPC UA / DA
  if (tag.protocol === 'opcua' && !tag.nodeId) {
    errors.push('OPC UA NodeId is required.');
  }
  if (tag.protocol === 'opcda' && !tag.itemId) {
    errors.push('OPC DA Item ID is required.');
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── CSV EXPORT ─────────────────────────────────────────────────────────────

export function exportDriverTagsCsv(tags: DriverTag[]): string {
  const headers = [
    'tagId', 'tagName', 'protocol', 'connectionId', 'accessType', 'dataType',
    'pollRate', 'address', 'registerType', 'nodeId', 'browsePath',
    'unit', 'description', 'category', 'enabled'
  ];

  const rows = tags.map(t => [
    t.tagId,
    t.tagName,
    t.protocol,
    t.connectionId,
    t.accessType,
    t.dataType,
    t.pollRate,
    t.address ?? '',
    t.registerType ?? '',
    t.nodeId ?? '',
    t.browsePath ?? '',
    t.unit ?? '',
    t.description ?? '',
    t.category ?? '',
    t.enabled ? 'true' : 'false'
  ].map(v => `"${String(v).replace(/"/g, '""')}"`).join(','));

  return [headers.join(','), ...rows].join('\n');
}

// ─── CSV IMPORT ─────────────────────────────────────────────────────────────

export interface ImportResult {
  imported: DriverTag[];
  errors: { row: number; message: string }[];
}

export function parseDriverTagsCsv(csv: string): ImportResult {
  const lines = csv.trim().split('\n');
  if (lines.length < 2) return { imported: [], errors: [{ row: 0, message: 'CSV is empty or missing header row.' }] };

  const headers = lines[0].split(',').map(h => h.replace(/^"|"$/g, '').trim());
  const imported: DriverTag[] = [];
  const errors: { row: number; message: string }[] = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(',').map(v => v.replace(/^"|"$/g, '').trim());
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => { row[h] = values[idx] ?? ''; });

    if (!row.tagName) {
      errors.push({ row: i + 1, message: 'Missing tagName.' });
      continue;
    }

    const tag: DriverTag = {
      tagId: row.tagId || `tag_${Date.now()}_${i}`,
      tagName: row.tagName,
      protocol: (row.protocol as DriverProtocol) || 'modbus_tcp',
      sourceType: 'imported',
      connectionId: row.connectionId || '',
      dataType: (row.dataType as DriverTagDataType) || 'float',
      accessType: (row.accessType as DriverAccessType) || 'read',
      pollRate: parseInt(row.pollRate) || 100,
      address: row.address ? parseInt(row.address) : undefined,
      registerType: (row.registerType as ModbusRegisterType) || undefined,
      nodeId: row.nodeId || undefined,
      browsePath: row.browsePath || undefined,
      unit: row.unit || undefined,
      description: row.description || undefined,
      category: row.category || undefined,
      enabled: row.enabled !== 'false',
      createdAt: new Date().toISOString()
    };

    imported.push(tag);
  }

  return { imported, errors };
}

// ─── JSON EXPORT/IMPORT ─────────────────────────────────────────────────────

export function exportDriverTagsJson(tags: DriverTag[]): string {
  return JSON.stringify(tags, null, 2);
}

export function parseDriverTagsJson(json: string): ImportResult {
  try {
    const parsed = JSON.parse(json);
    if (!Array.isArray(parsed)) {
      return { imported: [], errors: [{ row: 0, message: 'JSON must be an array of driver tags.' }] };
    }
    const imported = parsed.map((t: any, i: number) => ({
      ...t,
      tagId: t.tagId || `tag_${Date.now()}_${i}`,
      sourceType: 'imported' as const,
      createdAt: t.createdAt || new Date().toISOString()
    })) as DriverTag[];
    return { imported, errors: [] };
  } catch {
    return { imported: [], errors: [{ row: 0, message: 'Invalid JSON format.' }] };
  }
}
