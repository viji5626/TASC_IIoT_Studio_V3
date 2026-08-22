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

  // IEC 61850 Substation
  if (tag.protocol === 'iec61850') {
    if (!tag.iecPath && !tag.logicalNode) {
      errors.push('IEC 61850 Data Attribute path or Logical Node is required (e.g. "LD0/MMXU1.A.phsA.cVal.mag.f").');
    }
  }

  // Siemens S7
  if (tag.protocol === 's7') {
    if (!tag.s7Address && !tag.s7Area) {
      errors.push('Siemens S7 memory address is required (e.g. "DB1.DBD0", "M0.0", "IW0", "Q0.0").');
    }
  }

  // Mitsubishi MELSEC
  if (tag.protocol === 'melsec') {
    if (!tag.melsecAddress && !tag.melsecDeviceCode) {
      errors.push('Mitsubishi MELSEC device register address is required (e.g. "D100", "M100", "X0", "Y0", "W100").');
    }
  }

  // EtherNet/IP (CIP / Rockwell)
  if (tag.protocol === 'ethernet_ip') {
    if (!tag.cipTagName && tag.cipClass === undefined && tag.address === undefined) {
      errors.push('EtherNet/IP tag requires a Symbolic Tag Name (e.g. "Motor_Speed", "N7:0") or direct CIP Class/Instance.');
    }
  }

  // PROFINET IO
  if (tag.protocol === 'profinet') {
    if (tag.pnSlot === undefined || tag.pnSlot < 0) {
      errors.push('PROFINET slot number is required (0 for Head module, >=1 for I/O modules).');
    }
    if (tag.pnByteOffset === undefined || tag.pnByteOffset < 0) {
      errors.push('PROFINET byte offset within slot is required.');
    }
  }

  // PROFIBUS DP
  if (tag.protocol === 'profibus') {
    if (tag.profibusNodeAddress === undefined || tag.profibusNodeAddress < 1 || tag.profibusNodeAddress > 126) {
      errors.push('PROFIBUS slave node address must be between 1 and 126.');
    }
    if (tag.pnSlot === undefined || tag.pnSlot < 1) {
      errors.push('PROFIBUS slot number is required (>=1).');
    }
    if (tag.pnByteOffset === undefined || tag.pnByteOffset < 0) {
      errors.push('PROFIBUS byte offset within slot is required.');
    }
  }

  return { valid: errors.length === 0, errors, warnings };
}

// ─── CSV EXPORT ─────────────────────────────────────────────────────────────

export function exportDriverTagsCsv(tags: DriverTag[]): string {
  const headers = [
    'tagId', 'tagName', 'protocol', 'connectionId', 'accessType', 'dataType',
    'pollRate', 'address', 'registerType', 'nodeId', 'browsePath',
    'cipTagName', 'cipClass', 'cipInstance', 'cipAttribute', 'cipByteOffset', 'cipBitOffset',
    'pnSlot', 'pnSubslot', 'pnIoDirection', 'pnByteOffset', 'pnBitOffset',
    'profibusNodeAddress',
    's7Address', 'melsecAddress', 'iecPath',
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
    t.cipTagName ?? '',
    t.cipClass ?? '',
    t.cipInstance ?? '',
    t.cipAttribute ?? '',
    t.cipByteOffset ?? '',
    t.cipBitOffset ?? '',
    t.pnSlot ?? '',
    t.pnSubslot ?? '',
    t.pnIoDirection ?? '',
    t.pnByteOffset ?? '',
    t.pnBitOffset ?? '',
    t.profibusNodeAddress ?? '',
    t.s7Address ?? '',
    t.melsecAddress ?? '',
    t.iecPath ?? '',
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
      cipTagName: row.cipTagName || undefined,
      cipClass: row.cipClass ? parseInt(row.cipClass) : undefined,
      cipInstance: row.cipInstance ? parseInt(row.cipInstance) : undefined,
      cipAttribute: row.cipAttribute ? parseInt(row.cipAttribute) : undefined,
      cipByteOffset: row.cipByteOffset ? parseInt(row.cipByteOffset) : undefined,
      cipBitOffset: row.cipBitOffset ? parseInt(row.cipBitOffset) : undefined,
      pnSlot: row.pnSlot !== '' && row.pnSlot !== undefined ? parseInt(row.pnSlot) : (row.pbSlot !== '' && row.pbSlot !== undefined ? parseInt(row.pbSlot) : undefined),
      pnSubslot: row.pnSubslot !== '' && row.pnSubslot !== undefined ? parseInt(row.pnSubslot) : undefined,
      pnIoDirection: ((row.pnIoDirection || row.pnDirection || row.pbDirection) as 'input' | 'output') || undefined,
      pnByteOffset: row.pnByteOffset !== '' && row.pnByteOffset !== undefined ? parseInt(row.pnByteOffset) : (row.pbByteOffset !== '' && row.pbByteOffset !== undefined ? parseInt(row.pbByteOffset) : undefined),
      pnBitOffset: row.pnBitOffset !== '' && row.pnBitOffset !== undefined ? parseInt(row.pnBitOffset) : (row.pbBitOffset !== '' && row.pbBitOffset !== undefined ? parseInt(row.pbBitOffset) : undefined),
      profibusNodeAddress: row.profibusNodeAddress !== '' && row.profibusNodeAddress !== undefined ? parseInt(row.profibusNodeAddress) : (row.pbNodeAddress !== '' && row.pbNodeAddress !== undefined ? parseInt(row.pbNodeAddress) : undefined),
      s7Address: row.s7Address || undefined,
      melsecAddress: row.melsecAddress || undefined,
      iecPath: row.iecPath || undefined,
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
