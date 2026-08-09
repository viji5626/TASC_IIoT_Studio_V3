import { AppState, Panel, TagRegistryEntry, TagType, TagSourceType } from '../types';

export interface TagOccurrence {
  panelId: string;
  panelName: string;
  dashboardId: string;
  dashboardName: string;
  field: 'jsonPath' | 'publishPattern';
  tagType: TagType;
  parsingDefinition: string;
}

export interface TagSummary {
  totalTags: number;
  totalReadTags: number;
  totalWriteTags: number;
  totalDetectedTags: number;
  totalImportedTags: number;
  tags: TagRegistryEntry[];
}

/**
 * Scans the entire appState (all panels across dashboards) and detects Read & Write Tags.
 * Combines auto-detected tags with custom/imported tags from appState.customTags.
 */
export function scanAppTags(appState: AppState): TagSummary {
  if (!appState) {
    return {
      totalTags: 0,
      totalReadTags: 0,
      totalWriteTags: 0,
      totalDetectedTags: 0,
      totalImportedTags: 0,
      tags: []
    };
  }

  const rawOccurrences: TagOccurrence[] = [];

  // Build a fast dashboard map for dashboard names
  const dashMap = new Map<string, string>();
  (appState.dashboards || []).forEach(d => {
    dashMap.set(d.dashboardId, d.dashboardName || 'Dashboard');
  });

  // 1. Scan panels for Read Tags (jsonPath) and Write Tags (publishPattern)
  (appState.panels || []).forEach(panel => {
    const dashName = dashMap.get(panel.dashboardId) || 'Dashboard';

    // Read Tag: jsonPath
    if (panel.jsonPath && panel.jsonPath.trim()) {
      const pathStr = panel.jsonPath.trim();
      rawOccurrences.push({
        panelId: panel.panelId,
        panelName: panel.panelName || 'Widget',
        dashboardId: panel.dashboardId,
        dashboardName: dashName,
        field: 'jsonPath',
        tagType: 'read',
        parsingDefinition: pathStr
      });
    }

    // Write Tag: publishPattern
    if (panel.publishPattern && panel.publishPattern.trim()) {
      const patternStr = panel.publishPattern.trim();
      rawOccurrences.push({
        panelId: panel.panelId,
        panelName: panel.panelName || 'Widget',
        dashboardId: panel.dashboardId,
        dashboardName: dashName,
        field: 'publishPattern',
        tagType: 'write',
        parsingDefinition: patternStr
      });
    }
  });

  // Map to group detected occurrences by composite key: `${tagType}:${parsingDefinition}`
  const detectedGroupMap = new Map<string, {
    tagType: TagType;
    parsingDefinition: string;
    linkedWidgets: TagRegistryEntry['linkedWidgets'];
  }>();

  rawOccurrences.forEach(occ => {
    const key = `${occ.tagType}:${occ.parsingDefinition}`;
    if (!detectedGroupMap.has(key)) {
      detectedGroupMap.set(key, {
        tagType: occ.tagType,
        parsingDefinition: occ.parsingDefinition,
        linkedWidgets: []
      });
    }

    const group = detectedGroupMap.get(key)!;
    // Avoid duplicate widget entries for same field
    const exists = group.linkedWidgets.some(
      w => w.panelId === occ.panelId && w.field === occ.field
    );
    if (!exists) {
      group.linkedWidgets.push({
        panelId: occ.panelId,
        panelName: occ.panelName,
        dashboardName: occ.dashboardName,
        field: occ.field
      });
    }
  });

  // 2. Process custom / imported tags in appState.customTags
  const customTagsList = appState.customTags || [];
  const processedKeys = new Set<string>();
  const finalTagsList: TagRegistryEntry[] = [];

  // Add custom tags and compute their live usage
  customTagsList.forEach(ct => {
    const key = `${ct.tagType}:${ct.parsingDefinition.trim()}`;
    processedKeys.add(key);

    const liveDetected = detectedGroupMap.get(key);
    const linkedWidgets = liveDetected ? liveDetected.linkedWidgets : [];
    const uniqueDashboards = new Set(linkedWidgets.map(w => w.dashboardName)).size;

    finalTagsList.push({
      ...ct,
      usageCount: linkedWidgets.length,
      widgetsCount: linkedWidgets.length,
      dashboardsCount: uniqueDashboards,
      linkedWidgets
    });
  });

  // 3. Add detected tags that are NOT in customTagsList
  detectedGroupMap.forEach((group, key) => {
    if (!processedKeys.has(key)) {
      const uniqueDashboards = new Set(group.linkedWidgets.map(w => w.dashboardName)).size;
      // Derive a friendly tag name from parsing definition
      let derivedName = group.parsingDefinition;
      if (derivedName.length > 30) {
        derivedName = derivedName.substring(0, 27) + '...';
      }

      finalTagsList.push({
        tagId: `tag_auto_${key.replace(/[^a-zA-Z0-9]/g, '_')}`,
        tagName: derivedName,
        tagType: group.tagType,
        sourceType: 'detected',
        parsingDefinition: group.parsingDefinition,
        description: `Auto-detected from widget configurations (${group.linkedWidgets.length} widget reference${group.linkedWidgets.length !== 1 ? 's' : ''})`,
        usageCount: group.linkedWidgets.length,
        widgetsCount: group.linkedWidgets.length,
        dashboardsCount: uniqueDashboards,
        linkedWidgets: group.linkedWidgets
      });
    }
  });

  // Summary counts
  const totalReadTags = finalTagsList.filter(t => t.tagType === 'read').length;
  const totalWriteTags = finalTagsList.filter(t => t.tagType === 'write').length;
  const totalDetectedTags = finalTagsList.filter(t => t.sourceType === 'detected').length;
  const totalImportedTags = finalTagsList.filter(t => t.sourceType === 'imported' || t.sourceType === 'manual').length;

  return {
    totalTags: finalTagsList.length,
    totalReadTags,
    totalWriteTags,
    totalDetectedTags,
    totalImportedTags,
    tags: finalTagsList
  };
}

/**
 * Filtered tag suggestions for autocomplete inputs in widget configuration
 */
export function getTagSuggestions(
  appState: AppState,
  tagType: TagType
): TagRegistryEntry[] {
  const summary = scanAppTags(appState);
  return summary.tags.filter(t => t.tagType === tagType);
}

/**
 * Registers or updates a tag in appState.customTags
 */
export function registerCustomTag(
  appState: AppState,
  tag: Omit<Partial<TagRegistryEntry>, 'usageCount' | 'widgetsCount' | 'dashboardsCount' | 'linkedWidgets'> & {
    parsingDefinition: string;
    tagType: TagType;
  }
): AppState {
  const existingCustom = appState.customTags || [];
  const cleanDef = tag.parsingDefinition.trim();

  // Check if already exists in customTags
  const index = existingCustom.findIndex(
    t => t.tagType === tag.tagType && t.parsingDefinition.trim() === cleanDef
  );

  let updatedCustom: TagRegistryEntry[];
  const now = new Date().toISOString();

  if (index >= 0) {
    updatedCustom = [...existingCustom];
    updatedCustom[index] = {
      ...updatedCustom[index],
      tagName: tag.tagName || updatedCustom[index].tagName,
      description: tag.description ?? updatedCustom[index].description,
      category: tag.category ?? updatedCustom[index].category,
      updatedAt: now
    };
  } else {
    const newEntry: TagRegistryEntry = {
      tagId: tag.tagId || `tag_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      tagName: tag.tagName || cleanDef,
      tagType: tag.tagType,
      sourceType: tag.sourceType || 'manual',
      parsingDefinition: cleanDef,
      description: tag.description || '',
      category: tag.category || 'General',
      usageCount: 0,
      widgetsCount: 0,
      dashboardsCount: 0,
      linkedWidgets: [],
      createdAt: now,
      updatedAt: now
    };
    updatedCustom = [...existingCustom, newEntry];
  }

  return {
    ...appState,
    customTags: updatedCustom
  };
}

/**
 * Bulk updates tags in appState
 */
export function bulkUpdateTags(
  appState: AppState,
  tagIds: string[],
  updates: {
    category?: string;
    description?: string;
    findStr?: string;
    replaceStr?: string;
  }
): AppState {
  const existingCustom = appState.customTags || [];
  const tagIdSet = new Set(tagIds);

  let updatedPanels = [...appState.panels];
  let updatedCustom = existingCustom.map(tag => {
    if (!tagIdSet.has(tag.tagId)) return tag;

    let newDef = tag.parsingDefinition;
    if (updates.findStr && updates.replaceStr !== undefined && updates.findStr.length > 0) {
      newDef = newDef.replaceAll(updates.findStr, updates.replaceStr);
    }

    return {
      ...tag,
      category: updates.category !== undefined && updates.category.trim() !== '' ? updates.category : tag.category,
      description: updates.description !== undefined && updates.description.trim() !== '' ? updates.description : tag.description,
      parsingDefinition: newDef,
      updatedAt: new Date().toISOString()
    };
  });

  // If find/replace was requested, update widgets using those definitions too!
  if (updates.findStr && updates.replaceStr !== undefined && updates.findStr.length > 0) {
    const summary = scanAppTags(appState);
    const targetTags = summary.tags.filter(t => tagIdSet.has(t.tagId));

    targetTags.forEach(t => {
      const oldDef = t.parsingDefinition;
      const newDef = oldDef.replaceAll(updates.findStr!, updates.replaceStr!);

      updatedPanels = updatedPanels.map(p => {
        let pJsonPath = p.jsonPath;
        let pPublishPattern = p.publishPattern;

        if (t.tagType === 'read' && p.jsonPath === oldDef) {
          pJsonPath = newDef;
        }
        if (t.tagType === 'write' && p.publishPattern === oldDef) {
          pPublishPattern = newDef;
        }

        return {
          ...p,
          jsonPath: pJsonPath,
          publishPattern: pPublishPattern
        };
      });
    });
  }

  return {
    ...appState,
    panels: updatedPanels,
    customTags: updatedCustom
  };
}

/**
 * Converts tags to CSV format string
 */
export function exportTagsToCsv(tags: TagRegistryEntry[]): string {
  const headers = ['tagName', 'tagType', 'sourceType', 'parsingDefinition', 'usageCount', 'linkedWidgets', 'description', 'category'];
  const rows = tags.map(t => {
    const widgetsStr = (t.linkedWidgets || []).map(w => `${w.panelName} (${w.dashboardName})`).join('; ');
    return [
      `"${(t.tagName || '').replace(/"/g, '""')}"`,
      `"${t.tagType}"`,
      `"${t.sourceType}"`,
      `"${(t.parsingDefinition || '').replace(/"/g, '""')}"`,
      t.usageCount || 0,
      `"${widgetsStr.replace(/"/g, '""')}"`,
      `"${(t.description || '').replace(/"/g, '""')}"`,
      `"${(t.category || 'General').replace(/"/g, '""')}"`
    ].join(',');
  });

  return [headers.join(','), ...rows].join('\n');
}

/**
 * Parses CSV text into TagRegistryEntry records
 */
export function parseTagsCsv(csvText: string): {
  validRows: Omit<TagRegistryEntry, 'usageCount' | 'widgetsCount' | 'dashboardsCount' | 'linkedWidgets'>[];
  errors: string[];
} {
  const lines = csvText.split(/\r?\n/).filter(line => line.trim().length > 0);
  if (lines.length < 2) {
    return { validRows: [], errors: ['CSV file is empty or missing data rows.'] };
  }

  const parseCsvLine = (text: string): string[] => {
    const result: string[] = [];
    let cur = '';
    let inQuotes = false;
    for (let i = 0; i < text.length; i++) {
      const c = text[i];
      if (c === '"') {
        if (inQuotes && text[i + 1] === '"') {
          cur += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (c === ',' && !inQuotes) {
        result.push(cur);
        cur = '';
      } else {
        cur += c;
      }
    }
    result.push(cur);
    return result;
  };

  const headers = parseCsvLine(lines[0]).map(h => h.trim().toLowerCase());
  const nameIdx = headers.indexOf('tagname');
  const typeIdx = headers.indexOf('tagtype');
  const defIdx = headers.indexOf('parsingdefinition');
  const descIdx = headers.indexOf('description');
  const catIdx = headers.indexOf('category');

  if (defIdx === -1) {
    return { validRows: [], errors: ['CSV must contain a "parsingDefinition" or "parsingDefinition" column header.'] };
  }

  const validRows: Omit<TagRegistryEntry, 'usageCount' | 'widgetsCount' | 'dashboardsCount' | 'linkedWidgets'>[] = [];
  const errors: string[] = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const parsingDefinition = (cols[defIdx] || '').trim();

    if (!parsingDefinition) {
      errors.push(`Row ${i + 1}: Skipped - missing parsingDefinition.`);
      continue;
    }

    const tagName = nameIdx !== -1 && cols[nameIdx]?.trim() ? cols[nameIdx].trim() : parsingDefinition;
    let tagType: TagType = 'read';
    if (typeIdx !== -1 && cols[typeIdx]?.trim().toLowerCase() === 'write') {
      tagType = 'write';
    }

    const description = descIdx !== -1 ? cols[descIdx]?.trim() : '';
    const category = catIdx !== -1 ? cols[catIdx]?.trim() || 'Imported' : 'Imported';

    validRows.push({
      tagId: `tag_imp_${Date.now()}_${i}_${Math.random().toString(36).substr(2, 4)}`,
      tagName,
      tagType,
      sourceType: 'imported',
      parsingDefinition,
      description,
      category,
      createdAt: new Date().toISOString()
    });
  }

  return { validRows, errors };
}
