import { AppState, ActiveAlarm, DriverTag } from '../types';
import { ToolDefinition } from './aiProviders/types';
import { queryHistoricalRange } from './trendHistorianEngine';
import { getAlarmHistory } from './alarmHistorianEngine';
import { scanAppTopics } from './topicManager';
import { getFddState, evaluateAllFddRules, saveFddWorkOrder } from './fddEngine';
import { runFddRootCauseAnalysis, queryFddNaturalLanguage } from './fddAiDiagnostics';
import {
  savePlantKnowledgeNote,
  saveLearnedAlias,
  getAllPlantKnowledgeNotes,
  getAllLearnedAliases,
  getPrecomputedChunk
} from './aiMemoryStore';
import { validateTagAlias } from './aiAliasValidator';

export interface AiToolsContext {
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
  appState: AppState;
  activeAlarms: ActiveAlarm[];
}

let currentContext: AiToolsContext | null = null;

export function setAiToolsContext(ctx: AiToolsContext): void {
  currentContext = ctx;
}

export function getAiToolsContext(): AiToolsContext | null {
  return currentContext;
}

/**
 * Generates an instant high-density live telemetry and architecture snapshot
 * to inject directly into the system prompt for instant zero-latency reasoning.
 */
export function getLiveContextSnapshot(): string {
  if (!currentContext) return 'Project state is loading.';
  const { appState, activeAlarms, latestValues } = currentContext;

  const drivers = appState.driverConnections || [];
  const driverTags = appState.driverTags || [];
  const dashboards = appState.dashboards || [];
  const panels = appState.panels || [];
  const connections = appState.connections || [];

  const connectedDrivers = drivers.filter(d => d.connected);
  const goodTagsCount = driverTags.filter(t => {
    const val = latestValues[t.tagId] || latestValues[t.tagName];
    return val && val.val !== undefined && val.quality !== 'bad';
  }).length;
  const badTagsCount = driverTags.length - goodTagsCount;

  const driverSummary = drivers.map(d => 
    `- Driver "${d.connectionName}" [ID: ${d.connectionId}]: Protocol=${d.protocol}, Status=${d.connected ? 'CONNECTED' : 'DISCONNECTED'}`
  ).join('\n');

  const fddState = getFddState();
  const fddSummary = fddState.activeFaults.length > 0
    ? `${fddState.activeFaults.length} Active Faults (${fddState.kpis.criticalCount} Critical, Waste Rate: $${fddState.kpis.totalCostPerHour}/hr, ${fddState.kpis.totalEnergyWasteKw} kW excess)`
    : 'All equipment operating normally (Zero active faults)';

  return `
[LIVE PROJECT SNAPSHOT - CURRENT RUNTIME STATE]
- Dashboards (${dashboards.length}): ${dashboards.map(db => `"${db.dashboardName}" (${db.dashboardId})`).join(', ') || 'None'}
- Total UI Panels/Widgets: ${panels.length}
- MQTT Brokers (${connections.length}): ${connections.map(c => `${c.connectionName} (${c.brokerAddress}:${c.port}) [${c.connected ? 'ONLINE' : 'OFFLINE'}]`).join(', ') || 'None'}
- Industrial Communication Drivers (${drivers.length} total, ${connectedDrivers.length} connected):
${driverSummary || '  No drivers configured'}
- Driver Tags (${driverTags.length} registered): ${goodTagsCount} Good Quality, ${badTagsCount} Bad/Offline
- Active Real-Time Alarms (${activeAlarms.length}): ${activeAlarms.map(a => `[${a.zone}] ${a.panelName}: ${a.message} (val=${a.value})`).join(', ') || 'No active alarms (Normal)'}
- FDD & Predictive Health: ${fddSummary} (Plant Avg Health: ${fddState.kpis.avgHealthIndex}%, Open Work Orders: ${fddState.kpis.openWorkOrdersCount})
- User Role / Mode: ${appState.userRole || 'admin'} (${appState.productEdition || 'engineering'})
`.trim();
}

export const AI_TOOL_DEFINITIONS: ToolDefinition[] = [
  {
    name: 'fdd_get_active_faults',
    description: 'Get all active Fault Detection and Diagnostics (FDD) equipment faults with severity, duration, and financial waste rate ($/hr).',
    parameters: {
      type: 'object',
      properties: {
        severityFilter: {
          type: 'string',
          description: 'Optional filter by severity: CRITICAL, HIGH, MEDIUM, LOW, or ALL'
        }
      }
    }
  },
  {
    name: 'fdd_diagnose_fault',
    description: 'Run deep AI Root Cause Analysis (RCA) on an active equipment fault, analyzing pre-fault telemetry and providing probable causes and SOP recommendations.',
    parameters: {
      type: 'object',
      properties: {
        faultIdOrAssetName: {
          type: 'string',
          description: 'The fault ID (e.g. fault_xxx) or equipment asset name (e.g. Chiller, AHU, Compressor, Fan).'
        }
      },
      required: ['faultIdOrAssetName']
    }
  },
  {
    name: 'fdd_get_maintenance_schedule',
    description: 'Query scheduled, in-progress, and completed maintenance work orders with priority and SOP checklists.',
    parameters: {
      type: 'object',
      properties: {
        statusFilter: {
          type: 'string',
          description: 'Optional status filter: SCHEDULED, IN_PROGRESS, COMPLETED, CANCELLED, or ALL'
        }
      }
    }
  },
  {
    name: 'fdd_create_work_order',
    description: 'Create a new scheduled predictive maintenance work order for equipment with priority, due date, SOP checklist, and spare parts.',
    parameters: {
      type: 'object',
      properties: {
        assetName: {
          type: 'string',
          description: 'Name of the equipment asset (e.g. Chiller Unit #1, AHU-02, Main Exhaust Fan #4).'
        },
        title: {
          type: 'string',
          description: 'Title of the maintenance task (e.g. Condenser Tube Bundle Cleaning, Bearing Re-Greasing).'
        },
        priority: {
          type: 'string',
          description: 'Priority: CRITICAL, HIGH, MEDIUM, ROUTINE'
        },
        dueDaysFromNow: {
          type: 'number',
          description: 'Due date offset in days from today (e.g. 3 for 3 days from now).'
        },
        assignedTechnician: {
          type: 'string',
          description: 'Assigned maintenance engineer or technician.'
        }
      },
      required: ['assetName', 'title']
    }
  },
  {
    name: 'fdd_query_insights',
    description: 'Execute a natural language query against the FDD & Predictive Maintenance module.',
    parameters: {
      type: 'object',
      properties: {
        query: {
          type: 'string',
          description: 'Natural language question (e.g. "What faults are active?", "Which asset is wasting the most energy?", "Show chiller health").'
        }
      },
      required: ['query']
    }
  },
  {
    name: 'get_driver_tags_detail',
    description: 'Get deep real-time details of all industrial driver tags (Modbus registers, OPC UA nodes, data types, live values, quality, health, and parent driver mappings).',
    parameters: {
      type: 'object',
      properties: {
        connectionId: {
          type: 'string',
          description: 'Optional filter by driver connection ID (e.g. drv_xxx).'
        },
        protocol: {
          type: 'string',
          description: 'Optional filter by protocol: opcua, modbus_tcp, modbus_rtu, rs485, usb_serial, etc.'
        },
        qualityFilter: {
          type: 'string',
          description: 'Optional quality filter: good, bad, all'
        }
      }
    }
  },
  {
    name: 'get_driver_diagnostics',
    description: 'Get real-time diagnostic health metrics for all industrial communication drivers (connection status, host/port, error counters, retry counts, latency).',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_tag_manager_detail',
    description: 'Get deep summary of MQTT Topic Manager & Tag Registry, including all topics, publisher/subscriber panel links, unmapped topics, and syntax warnings.',
    parameters: {
      type: 'object',
      properties: {
        filterTopic: {
          type: 'string',
          description: 'Optional keyword to search topics.'
        }
      }
    }
  },
  {
    name: 'get_live_tag_value',
    description: 'Get the latest real-time telemetry value, timestamp, and quality of a specific panel, topic, or driver tag (by ID or Tag Name).',
    parameters: {
      type: 'object',
      properties: {
        panelIdOrTopic: {
          type: 'string',
          description: 'The panel ID (e.g. panel_xxx), MQTT topic (e.g. factory/temp), driver tag ID (tag_xxx), or Tag Name.'
        }
      },
      required: ['panelIdOrTopic']
    }
  },
  {
    name: 'list_panels',
    description: 'List all panels/widgets configured across the application or within a specific dashboard with data sources and topics.',
    parameters: {
      type: 'object',
      properties: {
        dashboardId: {
          type: 'string',
          description: 'Optional dashboard ID to filter panels by. If omitted, returns panels from all dashboards.'
        }
      }
    }
  },
  {
    name: 'query_historian',
    description: 'Query time-series historical telemetry data points for a pen/topic within an ISO timestamp range (capped at 500 points).',
    parameters: {
      type: 'object',
      properties: {
        penTopic: {
          type: 'string',
          description: 'The MQTT topic or pen topic to query historian for.'
        },
        startIso: {
          type: 'string',
          description: 'Start of the time window in ISO format (e.g. 2026-08-15T10:00:00Z). Defaults to 1 hour ago if omitted.'
        },
        endIso: {
          type: 'string',
          description: 'End of the time window in ISO format. Defaults to now if omitted.'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of points to retrieve (capped at 500).'
        }
      },
      required: ['penTopic']
    }
  },
  {
    name: 'get_active_alarms',
    description: 'Get all currently active real-time industrial alarms (HIGH, MID, LOW, TRIP, FAULT) with current values and thresholds.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_alarm_history',
    description: 'Query the persistent alarm historian log for past alarm trigger, acknowledgment, and resolution events.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional filter by category: ALL, TRIP_FAULT, HIGH, MID, LOW, ACTIVE, RESOLVED'
        },
        limit: {
          type: 'number',
          description: 'Maximum number of historical records to return (defaults to 20).'
        },
        dashboardId: {
          type: 'string',
          description: 'Optional dashboard ID filter.'
        }
      }
    }
  },
  {
    name: 'get_dashboard_summary',
    description: 'Get high-level summary of all dashboards, connections, total panels, and operational state in the project.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'get_system_settings_and_info',
    description: 'Get app configuration, user role, product edition, runtime PIN security settings, themes, and client info.',
    parameters: {
      type: 'object',
      properties: {}
    }
  },
  {
    name: 'generate_industrial_image',
    description: 'Generate an industrial schematic, P&ID piping diagram, SCADA blueprint, wiring layout, or facility visual illustration from a prompt.',
    parameters: {
      type: 'object',
      properties: {
        prompt: {
          type: 'string',
          description: 'Detailed prompt describing the industrial schematic, diagram, gauge, pump station, or equipment.'
        },
        style: {
          type: 'string',
          description: 'Visual style: schematic, blueprint, 3d_render, realistic_photo, vector_icon'
        },
        aspectRatio: {
          type: 'string',
          description: 'Aspect ratio: 16:9, 4:3, 1:1'
        }
      },
      required: ['prompt']
    }
  },
  {
    name: 'suggest_report_additions',
    description: 'Before generating a report, assess the user request and propose 3 intelligent additions the user may not have considered. Returns structured suggestions for the user to select from. Always call this FIRST when a user asks to generate a report, before calling generate_report.',
    parameters: {
      type: 'object',
      properties: {
        requestId: {
          type: 'string',
          description: 'A unique ID string for this report request (e.g. uuid or timestamp string).'
        },
        title: {
          type: 'string',
          description: 'Brief descriptive title for the report (e.g. "Chiller 1 Weekly Energy Report").'
        },
        fromMs: {
          type: 'number',
          description: 'Report start time as Unix millisecond timestamp.'
        },
        toMs: {
          type: 'number',
          description: 'Report end time as Unix millisecond timestamp.'
        },
        requestedTags: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of historian pen IDs or tag names the user requested.'
        },
        resolution: {
          type: 'string',
          description: 'Aggregation resolution: raw, 1min, 1hour, 1day.'
        },
        includeAlarms: {
          type: 'boolean',
          description: 'Whether to include alarm events in the report.'
        },
        includeFdd: {
          type: 'boolean',
          description: 'Whether to include FDD fault analysis in the report.'
        },
        suggestions: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'number' },
              title: { type: 'string' },
              description: { type: 'string' },
              addsTags: { type: 'array', items: { type: 'string' } },
              addsSection: { type: 'string' }
            }
          },
          description: 'Array of exactly 3 suggestion objects (id: 1, 2, 3) that would enhance this report.'
        }
      },
      required: ['requestId', 'title', 'fromMs', 'toMs', 'requestedTags', 'resolution', 'suggestions']
    }
  },
  {
    name: 'generate_report',
    description: 'Generate a rich industrial report from historian data with AI narrative, charts, statistics, and alarm log. Call this after the user has reviewed and selected from the suggestions returned by suggest_report_additions. Returns a status object; the report HTML is generated client-side and a download link is shown in the chat.',
    parameters: {
      type: 'object',
      properties: {
        requestId: {
          type: 'string',
          description: 'The same requestId from the suggest_report_additions call.'
        },
        title: {
          type: 'string',
          description: 'Final report title.'
        },
        fromMs: { type: 'number', description: 'Start time Unix ms.' },
        toMs: { type: 'number', description: 'End time Unix ms.' },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Final list of historian pen IDs or tag names to include (after merging selected suggestions).'
        },
        resolution: { type: 'string', description: 'raw | 1min | 1hour | 1day' },
        includeAlarms: { type: 'boolean' },
        includeFdd: { type: 'boolean' },
        selectedSuggestionIds: {
          type: 'array',
          items: { type: 'number' },
          description: 'IDs of suggestions the user selected (e.g. [1, 3]).'
        },
        aiSummary: {
          type: 'string',
          description: 'AI-authored executive summary paragraph for the report (2-4 sentences).'
        },
        aiResults: {
          type: 'string',
          description: 'AI-authored results and recommendations section for the report (3-6 bullet points or paragraph).'
        }
      },
      required: ['requestId', 'title', 'fromMs', 'toMs', 'tags', 'resolution', 'aiSummary', 'aiResults']
    }
  },
  {
    name: 'remember_plant_knowledge',
    description: 'Save permanent plant operational knowledge, equipment setpoint rules, standard operating procedures (SOP), or technician notes into local on-premise AI memory.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Category: energy | hvac | electrical | safety | production | general'
        },
        topic: {
          type: 'string',
          description: 'Short descriptive title or equipment name (e.g. "Chiller-1 Operating Temperature", "Shift 1 Schedule").'
        },
        note: {
          type: 'string',
          description: 'The detailed knowledge or rule text to permanently remember.'
        },
        tagsLinked: {
          type: 'array',
          items: { type: 'string' },
          description: 'Optional list of related tag IDs or names.'
        }
      },
      required: ['category', 'topic', 'note']
    }
  },
  {
    name: 'learn_tag_alias',
    description: 'Map a colloquial operator nickname or plant vernacular term to a specific physical PLC/SCADA tag ID.',
    parameters: {
      type: 'object',
      properties: {
        alias: {
          type: 'string',
          description: 'The colloquial nickname used by operators (e.g. "Main Incomer", "Inlet Pressure", "Line 1 Speed").'
        },
        tagId: {
          type: 'string',
          description: 'The physical tag ID or historian pen ID (e.g. "htag_123", "modbus_holding_40001").'
        },
        tagName: {
          type: 'string',
          description: 'Readable physical tag name.'
        },
        notes: {
          type: 'string',
          description: 'Optional engineering notes regarding this alias mapping.'
        }
      },
      required: ['alias', 'tagId', 'tagName']
    }
  },
  {
    name: 'query_learned_knowledge',
    description: 'Search learned plant SOP notes, operating rules, and tag aliases from local AI memory.',
    parameters: {
      type: 'object',
      properties: {
        category: {
          type: 'string',
          description: 'Optional category filter: energy | hvac | electrical | safety | production | general'
        },
        searchQuery: {
          type: 'string',
          description: 'Optional keyword to search across topics, notes, and aliases.'
        }
      }
    }
  },
  {
    name: 'get_precomputed_telemetry_chunk',
    description: 'Retrieve pre-aggregated statistical summaries (Min, Max, Avg, Delta) in sub-10ms from local precomputed chunk storage.',
    parameters: {
      type: 'object',
      properties: {
        tagId: {
          type: 'string',
          description: 'The tag ID to look up.'
        },
        date: {
          type: 'string',
          description: 'Optional ISO date string (YYYY-MM-DD).'
        }
      },
      required: ['tagId']
    }
  }
];

export async function executeAiTool(name: string, args: Record<string, unknown>): Promise<string> {
  const ctx = currentContext;
  if (!ctx) {
    return JSON.stringify({ error: 'AI tools context is not initialized.' });
  }

  try {
    switch (name) {
      case 'fdd_get_active_faults': {
        const severityFilter = args.severityFilter ? String(args.severityFilter).toUpperCase() : 'ALL';
        const fddState = getFddState();
        const active = fddState.activeFaults.filter(f => severityFilter === 'ALL' || f.severity === severityFilter);

        if (active.length === 0) {
          return JSON.stringify({
            status: 'NORMAL',
            message: 'No active FDD faults detected in the system.',
            activeFaultCount: 0,
            plantHealthIndex: fddState.kpis.avgHealthIndex,
            wasteRatePerHour: 0
          });
        }

        return JSON.stringify({
          status: 'FAULTS_ACTIVE',
          activeFaultCount: active.length,
          totalFinancialWastePerHour: `$${fddState.kpis.totalCostPerHour}/hr`,
          totalEnergyWasteKw: `${fddState.kpis.totalEnergyWasteKw} kW`,
          plantHealthIndex: `${fddState.kpis.avgHealthIndex}%`,
          activeFaults: active.map(f => ({
            faultId: f.faultId,
            asset: f.assetName,
            severity: f.severity,
            rule: f.ruleName,
            durationMinutes: Math.floor(f.durationSeconds / 60),
            financialWasteRate: `$${f.costPerHour}/hr`,
            triggerValues: f.triggerValues
          }))
        });
      }

      case 'fdd_diagnose_fault': {
        const target = String(args.faultIdOrAssetName || '').toLowerCase();
        const fddState = getFddState();
        const fault = fddState.activeFaults.find(f => 
          f.faultId.toLowerCase() === target ||
          f.assetName.toLowerCase().includes(target) ||
          f.category.toLowerCase().includes(target)
        ) || fddState.activeFaults[0];

        if (!fault) {
          return JSON.stringify({
            message: `No active fault found matching "${target}". All assets in optimal state.`
          });
        }

        const rca = await runFddRootCauseAnalysis(fault);
        return JSON.stringify({
          faultId: fault.faultId,
          assetName: fault.assetName,
          severity: fault.severity,
          ruleTriggered: fault.ruleName,
          durationMinutes: Math.floor(fault.durationSeconds / 60),
          financialWasteRate: `$${fault.costPerHour}/hr`,
          rootCauseAnalysis: {
            probableCauses: rca.probableCauses,
            immediateCorrectiveActions: rca.immediateActions,
            preventiveRecommendations: rca.preventiveRecommendations,
            estimatedCostAvoidance: `$${rca.estimatedCostAvoidance}`
          }
        });
      }

      case 'fdd_get_maintenance_schedule': {
        const statusFilter = args.statusFilter ? String(args.statusFilter).toUpperCase() : 'ALL';
        const fddState = getFddState();
        const orders = fddState.workOrders.filter(w => statusFilter === 'ALL' || w.status === statusFilter);

        return JSON.stringify({
          totalOrders: orders.length,
          workOrders: orders.map(o => ({
            orderId: o.orderId,
            asset: o.assetName,
            title: o.title,
            priority: o.priority,
            status: o.status,
            dueDate: o.dueIso.split('T')[0],
            assignedTo: o.assignedTechnician,
            checklistItems: o.checklist.length,
            completedItems: o.checklist.filter(c => c.completed).length
          }))
        });
      }

      case 'fdd_create_work_order': {
        const assetName = String(args.assetName);
        const title = String(args.title);
        const priority = (args.priority ? String(args.priority).toUpperCase() : 'HIGH') as any;
        const dueDays = typeof args.dueDaysFromNow === 'number' ? args.dueDaysFromNow : 3;
        const assignedTechnician = args.assignedTechnician ? String(args.assignedTechnician) : 'Senior Maintenance Engineer';

        const nowMs = Date.now();
        const dueMs = nowMs + dueDays * 24 * 60 * 60 * 1000;
        const newOrder = {
          orderId: `wo_${nowMs}`,
          assetId: `asset_${assetName.toLowerCase().replace(/\s+/g, '_')}`,
          assetName,
          title,
          description: `AI-Generated Predictive Work Order based on Condition-Based Monitoring (CBM) degradation trajectory.`,
          priority,
          status: 'SCHEDULED' as const,
          createdIso: new Date(nowMs).toISOString(),
          dueIso: new Date(dueMs).toISOString(),
          assignedTechnician,
          estimatedDowntimeMinutes: 45,
          checklist: [
            { id: 'chk_1', label: 'Lockout/Tagout (LOTO) and safety isolation', completed: false },
            { id: 'chk_2', label: 'Visual inspection of mechanical seals and bearings', completed: false },
            { id: 'chk_3', label: 'Perform corrective maintenance per SOP', completed: false },
            { id: 'chk_4', label: 'Verify post-service baseline vibration and thermal readings', completed: false }
          ],
          spareParts: [
            { partNumber: 'SP-99201', name: 'Synthetic Polyurea Grease Cartridge', quantity: 1 }
          ]
        };

        saveFddWorkOrder(newOrder);

        return JSON.stringify({
          success: true,
          message: `Work Order "${title}" successfully scheduled for ${assetName} (Due: ${newOrder.dueIso.split('T')[0]}).`,
          workOrder: newOrder
        });
      }

      case 'fdd_query_insights': {
        const queryText = String(args.query || '');
        const fddState = getFddState();
        const answer = queryFddNaturalLanguage(queryText, fddState);
        return JSON.stringify({
          query: queryText,
          markdownAnswer: answer
        });
      }

      case 'get_driver_tags_detail': {
        const connIdFilter = args.connectionId ? String(args.connectionId) : null;
        const protocolFilter = args.protocol ? String(args.protocol) : null;
        const qualityFilter = args.qualityFilter ? String(args.qualityFilter).toLowerCase() : 'all';

        const driverTags = ctx.appState.driverTags || [];
        const driverConns = ctx.appState.driverConnections || [];
        const connMap = new Map(driverConns.map(c => [c.connectionId, c]));

        const results = driverTags
          .filter(t => !connIdFilter || t.connectionId === connIdFilter)
          .filter(t => !protocolFilter || t.protocol === protocolFilter)
          .map(tag => {
            const conn = connMap.get(tag.connectionId);
            const liveReading = ctx.latestValues[tag.tagId] || ctx.latestValues[tag.tagName];
            const isStale = liveReading?.timestampMs ? ((Date.now() - liveReading.timestampMs) / 1000 > 10) : false;
            const isBad = liveReading?.quality === 'bad' || isStale;
            const quality = isBad ? 'bad' : (liveReading?.val !== undefined ? 'good' : 'unknown');

            // Format address
            let addressDisplay = '-';
            if (tag.nodeId) addressDisplay = `NodeId: ${tag.nodeId}`;
            else if (tag.itemId) addressDisplay = `ItemId: ${tag.itemId}`;
            else if (tag.address !== undefined) {
              const reg = tag.registerType ? tag.registerType.replace('_', ' ') : 'Register';
              addressDisplay = `${reg} ${tag.address}${tag.bitOffset !== undefined ? `.${tag.bitOffset}` : ''}`;
            }

            return {
              tagId: tag.tagId,
              tagName: tag.tagName,
              protocol: tag.protocol,
              driverName: conn?.connectionName || 'Unknown Driver',
              address: addressDisplay,
              dataType: tag.dataType,
              liveValue: liveReading?.val !== undefined ? liveReading.val : 'No Data',
              quality,
              lastUpdated: liveReading?.time || 'Never'
            };
          })
          .filter(t => {
            if (qualityFilter === 'good') return t.quality === 'good';
            if (qualityFilter === 'bad') return t.quality === 'bad' || t.quality === 'unknown';
            return true;
          });

        if (results.length === 0) {
          return `No driver tags found matching the criteria (Total registered: ${driverTags.length}).`;
        }

        const tableRows = results.map(t => {
          const valDisplay = typeof t.liveValue === 'number' ? (Number.isInteger(t.liveValue) ? t.liveValue : Number(t.liveValue.toFixed(4))) : t.liveValue;
          const qualityBadge = t.quality === 'good' ? '✅ Good' : (t.quality === 'bad' ? '❌ Bad' : '⚠️ No Data');
          return `| **${t.tagName}** | **${valDisplay}** | ${t.driverName} (${t.protocol}) | ${t.address} | ${qualityBadge} | ${t.lastUpdated} |`;
        }).join('\n');

        return `Found **${results.length}** driver tags:

| Tag Name | Live Value | Driver | Address | Quality | Last Updated |
|:---|:---|:---|:---|:---|:---|
${tableRows}`;
      }

      case 'get_driver_diagnostics': {
        const drivers = ctx.appState.driverConnections || [];
        const driverTags = ctx.appState.driverTags || [];

        if (drivers.length === 0) {
          return 'No industrial communication drivers configured in this project.';
        }

        const rows = drivers.map(d => {
          const tagsForDriver = driverTags.filter(t => t.connectionId === d.connectionId);
          const goodCount = tagsForDriver.filter(t => {
            const v = ctx.latestValues[t.tagId] || ctx.latestValues[t.tagName];
            return v && v.val !== undefined && v.quality !== 'bad';
          }).length;
          const statusBadge = d.connected ? '✅ Connected' : '❌ Disconnected';
          const endpoint = d.endpointUrl || (d.host ? `${d.host}:${d.port || 502}` : d.portPath || 'N/A');

          return `| **${d.connectionName}** | ${d.protocol} | ${statusBadge} | \`${endpoint}\` | ${tagsForDriver.length} (${goodCount} Good, ${tagsForDriver.length - goodCount} Bad) |`;
        }).join('\n');

        return `### Driver Diagnostics (${drivers.filter(d => d.connected).length}/${drivers.length} Connected):

| Driver Name | Protocol | Status | Host / Endpoint | Tags (Good / Bad) |
|:---|:---|:---|:---|:---|
${rows}`;
      }

      case 'get_tag_manager_detail': {
        const filterStr = args.filterTopic ? String(args.filterTopic).toLowerCase() : '';
        const scan = scanAppTopics(ctx.appState);

        const filtered = scan.topics
          .filter(t => !filterStr || t.topic.toLowerCase().includes(filterStr))
          .map(t => {
            const usage = t.direction === 'both' ? 'Pub & Sub' : (t.direction === 'publish' ? 'Publish' : 'Subscribe');
            return `| \`${t.topic}\` | ${usage} | ${t.widgetsCount} widgets (${t.dashboardsCount} dashboards) |`;
          });

        if (filtered.length === 0) {
          return `No MQTT topics found matching "${filterStr}". Total unique topics: ${scan.totalUniqueTopics}.`;
        }

        return `### 🏷️ MQTT Topic Registry (${scan.totalUniqueTopics} Unique Topics, ${scan.totalTopicReferences} References):

| MQTT Topic Pattern | Direction | Usage Summary |
|:---|:---|:---|
${filtered.slice(0, 30).join('\n')}`;
      }

      case 'get_live_tag_value': {
        const key = String(args.panelIdOrTopic || '').trim();
        if (!key) {
          return JSON.stringify({ error: 'Missing panelIdOrTopic argument' });
        }

        // Check latestValues directly (by panelId, topic, or tagId)
        let val = ctx.latestValues[key];

        // If not found, search in panels
        if (!val) {
          const panel = ctx.appState.panels.find(p => p.panelId === key || p.topic === key || p.panelName.toLowerCase() === key.toLowerCase());
          if (panel) {
            val = ctx.latestValues[panel.panelId] || ctx.latestValues[panel.topic];
          }
        }

        // If not found, search in driverTags
        if (!val) {
          const driverTag = ctx.appState.driverTags?.find(t => t.tagId === key || t.tagName.toLowerCase() === key.toLowerCase());
          if (driverTag) {
            val = ctx.latestValues[driverTag.tagId] || ctx.latestValues[driverTag.tagName];
          }
        }

        if (!val) {
          return `No active telemetry reading found for "${key}". The topic or driver tag may not have received data yet.`;
        }

        const qualityEmoji = val.quality === 'bad' ? '❌ Bad Quality' : '✅ Good Quality';
        return `**Live Telemetry for "${key}":**
- **Live Value:** \`${val.val}\`
- **Signal Quality:** ${qualityEmoji}
- **Last Updated:** ${val.time || 'N/A'}`;
      }

      case 'list_panels': {
        const dashboardIdFilter = args.dashboardId ? String(args.dashboardId) : null;
        const panels = ctx.appState.panels.filter(p => !dashboardIdFilter || p.dashboardId === dashboardIdFilter);

        if (panels.length === 0) {
          return 'No widgets or panels found.';
        }

        const rows = panels.map(p => {
          const valObj = ctx.latestValues[p.panelId] || ctx.latestValues[p.topic];
          const valStr = valObj?.val !== undefined ? `${valObj.val} ${p.unit || ''}` : '-';
          return `| **${p.panelName}** | ${p.type} | ${valStr} | \`${p.topic || p.driverTagId || '-'}\` |`;
        }).join('\n');

        return `### Panels / Widgets (${panels.length} Total):

| Panel Name | Widget Type | Live Value | Source / Topic |
|:---|:---|:---|:---|
${rows}`;
      }

      case 'query_historian': {
        const penTopic = String(args.penTopic || '').trim();
        if (!penTopic) {
          return JSON.stringify({ error: 'Missing penTopic argument' });
        }

        const now = Date.now();
        const startMs = args.startIso ? new Date(String(args.startIso)).getTime() : now - (60 * 60 * 1000);
        const endMs = args.endIso ? new Date(String(args.endIso)).getTime() : now;
        const limit = typeof args.limit === 'number' ? Math.min(args.limit, 500) : 100;

        const points = await queryHistoricalRange(penTopic, startMs, endMs, limit);
        return JSON.stringify({
          penTopic,
          startMs,
          endMs,
          returnedPoints: points.length,
          points: points.map(p => ({ time: new Date(p.t).toISOString(), value: p.v }))
        });
      }

      case 'get_active_alarms': {
        if (ctx.activeAlarms.length === 0) {
          return '✅ **No Active Alarms.** All process parameters and thresholds are operating normally.';
        }

        const alarmRows = ctx.activeAlarms.map(a => 
          `| **${a.panelName}** | **[${a.zone}]** | \`${a.value} ${a.unit || ''}\` (Threshold: ${a.threshold}) | ${a.message} | ${a.timestamp} |`
        ).join('\n');

        return `### 🚨 Active Alarms (${ctx.activeAlarms.length} Active):

| Equipment / Panel | Zone | Value / Limit | Alarm Message | Triggered Time |
|:---|:---|:---|:---|:---|
${alarmRows}`;
      }

      case 'get_alarm_history': {
        const category = args.category ? String(args.category) : undefined;
        const limit = typeof args.limit === 'number' ? args.limit : 20;
        const dashboardId = args.dashboardId ? String(args.dashboardId) : undefined;

        const history = getAlarmHistory(dashboardId, category as any).slice(0, limit);
        if (history.length === 0) {
          return 'No alarm history records found in log.';
        }

        const rows = history.map(h => {
          const statusText = (h.status as string).includes('RESOLVED') ? '✅ Resolved' : '🚨 Active';
          const timeStr = h.triggerTime ? new Date(h.triggerTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'N/A';
          return `| **${h.panelName}** | **[${h.category}]** | \`${h.triggerValue} ${h.unit || ''}\` (Limit: ${h.threshold}) | ${h.message} | ${timeStr} | ${h.duration || '-'} | ${statusText} |`;
        }).join('\n');

        return `### 📋 Alarm History Log (${history.length} Records):

| Equipment / Panel | Category | Trigger Value | Message | Time | Duration | Status |
|:---|:---|:---|:---|:---|:---|:---|
${rows}`;
      }

      case 'get_dashboard_summary': {
        const dashboards = ctx.appState.dashboards || [];
        const panels = ctx.appState.panels || [];
        const connections = ctx.appState.connections || [];
        const driverConns = ctx.appState.driverConnections || [];

        const dashList = dashboards.map(d => {
          const count = panels.filter(p => p.dashboardId === d.dashboardId).length;
          return `- **${d.dashboardName}** (\`${d.dashboardId}\`): ${count} widgets`;
        }).join('\n') || '- None';

        const driverList = driverConns.map(dc => 
          `- **${dc.connectionName}** (${dc.protocol}): ${dc.connected ? '✅ Connected' : '❌ Disconnected'}`
        ).join('\n') || '- None configured';

        return `### 📊 Project Architecture Summary:

**Dashboards (${dashboards.length}):**
${dashList}

**Industrial Communication Drivers (${driverConns.length}):**
${driverList}

**MQTT Brokers (${connections.length}):**
${connections.map(c => `- **${c.connectionName}** (${c.brokerAddress}:${c.port}) [${c.connected ? 'ONLINE' : 'OFFLINE'}]`).join('\n') || '- None configured'}

- **Total Widgets / Panels:** ${panels.length}
- **Total Driver Tags:** ${ctx.appState.driverTags?.length || 0}
- **Active Alarms:** ${ctx.activeAlarms.length}`;
      }

      case 'get_system_settings_and_info': {
        const edition = ctx.appState.productEdition || 'engineering';
        const role = ctx.appState.userRole || 'admin';
        const pinConfigured = !!ctx.appState.editPin;

        return `### ⚙️ System Settings & Runtime Info:
- **Product Edition:** ${edition.toUpperCase()}
- **Active User Role:** ${role.toUpperCase()}
- **Application Theme:** ${ctx.appState.appTheme || 'sky'}
- **Runtime PIN Security:** ${pinConfigured ? `Enabled (${ctx.appState.runtimePinTimeoutMinutes || 2} min timeout)` : 'Disabled'}
- **Total Dashboards:** ${ctx.appState.dashboards.length}
- **Total Panels / Widgets:** ${ctx.appState.panels.length}
- **Communication Drivers:** ${ctx.appState.driverConnections?.length || 0}
- **Registered Driver Tags:** ${ctx.appState.driverTags?.length || 0}`;
      }

      case 'generate_industrial_image': {
        const rawPrompt = String(args.prompt || '').trim();
        if (!rawPrompt) {
          return JSON.stringify({ error: 'Missing prompt argument' });
        }

        const style = String(args.style || 'schematic');
        const aspectRatio = String(args.aspectRatio || '16:9');
        let width = 1280;
        let height = 720;

        if (aspectRatio === '1:1') {
          width = 1024;
          height = 1024;
        } else if (aspectRatio === '4:3') {
          width = 1024;
          height = 768;
        } else if (aspectRatio === '16:9') {
          width = 1280;
          height = 720;
        }

        let enhancedPrompt = rawPrompt;
        if (style === 'blueprint') {
          enhancedPrompt += ', technical industrial blueprint, CAD schematic, engineering white line on blue background, high precision';
        } else if (style === 'schematic') {
          enhancedPrompt += ', clean SCADA P&ID schematic diagram, industrial instrumentation, vector layout, technical process flow';
        } else if (style === '3d_render') {
          enhancedPrompt += ', 3D photorealistic industrial rendering, modern manufacturing plant, octane render, 8k';
        } else if (style === 'realistic_photo') {
          enhancedPrompt += ', professional industrial photography, factory floor equipment, crisp lighting';
        }

        const seed = Math.floor(Math.random() * 1000000);
        const encoded = encodeURIComponent(enhancedPrompt);
        const imageUrl = `https://image.pollinations.ai/prompt/${encoded}?width=${width}&height=${height}&seed=${seed}&nologo=true`;

        return JSON.stringify({
          success: true,
          prompt: rawPrompt,
          enhancedPrompt,
          style,
          imageUrl,
          markdown: `![${rawPrompt}](${imageUrl})`,
          instructions: 'Display the image to the user using the markdown image syntax.'
        });
      }

      case 'suggest_report_additions': {
        // This tool causes the UI to render suggestion cards in the chat.
        // The actual suggestion logic is authored by the AI in the tool call arguments.
        // We just confirm receipt and instruct the AI to display them.
        const reqId = String(args.requestId || '');
        const suggestions = (args.suggestions as any[]) || [];
        const title = String(args.title || 'Report');
        const fromMs = Number(args.fromMs || 0);
        const toMs = Number(args.toMs || Date.now());
        const requestedTags = (args.requestedTags as string[]) || [];
        const resolution = String(args.resolution || '1hour');
        const includeAlarms = Boolean(args.includeAlarms);
        const includeFdd = Boolean(args.includeFdd);

        // Return a special marker that the UI will intercept to render suggestion cards
        return JSON.stringify({
          __reportSuggestion: true,
          requestId: reqId,
          title,
          fromMs,
          toMs,
          requestedTags,
          resolution,
          includeAlarms,
          includeFdd,
          suggestions: suggestions.slice(0, 3),
          instructions: 'The suggestion cards have been displayed to the user. Wait for them to select suggestions in the chat. Do NOT generate the report yet.'
        });
      }

      case 'generate_report': {
        // This tool causes the UI to trigger report generation client-side.
        // Return a special marker that the UI's aiTools handler intercepts.
        const reqId = String(args.requestId || '');
        const title = String(args.title || 'Industrial Report');
        const fromMs = Number(args.fromMs || 0);
        const toMs = Number(args.toMs || Date.now());
        const tags = (args.tags as string[]) || [];
        const resolution = String(args.resolution || '1hour');
        const includeAlarms = Boolean(args.includeAlarms ?? true);
        const includeFdd = Boolean(args.includeFdd ?? false);
        const selectedSuggestionIds = (args.selectedSuggestionIds as number[]) || [];
        const aiSummary = String(args.aiSummary || '');
        const aiResults = String(args.aiResults || '');

        if (!title || !fromMs || !toMs || tags.length === 0) {
          return JSON.stringify({ error: 'Missing required parameters: title, fromMs, toMs, or tags.' });
        }

        return JSON.stringify({
          __generateReport: true,
          requestId: reqId,
          title,
          fromMs,
          toMs,
          tags,
          resolution,
          includeAlarms,
          includeFdd,
          selectedSuggestionIds,
          aiSummary,
          aiResults,
          instructions: 'The report is being generated. A download link will appear in the chat momentarily.'
        });
      }

      case 'remember_plant_knowledge': {
        const category = (String(args.category || 'general').toLowerCase()) as any;
        const topic = String(args.topic || 'Plant Note');
        const note = String(args.note || '');
        const tagsLinked = (args.tagsLinked as string[]) || [];

        if (!note) {
          return JSON.stringify({ error: 'Note text cannot be empty.' });
        }

        const saved = await savePlantKnowledgeNote({
          category,
          topic,
          note,
          tagsLinked,
          author: 'AI Copilot'
        });

        return JSON.stringify({
          success: true,
          message: `Plant knowledge note "${topic}" permanently recorded in local memory.`,
          record: saved
        });
      }

      case 'learn_tag_alias': {
        const alias = String(args.alias || '').trim();
        const tagId = String(args.tagId || '').trim();
        const tagName = String(args.tagName || tagId).trim();
        const notes = args.notes ? String(args.notes) : undefined;

        if (!alias || !tagId) {
          return JSON.stringify({ error: 'Alias and tagId are required.' });
        }

        const saved = await saveLearnedAlias({
          alias,
          tagId,
          tagName,
          source: 'operator_chat',
          confidence: 1.0,
          notes
        });

        const validation = validateTagAlias(saved, ctx.appState);

        return JSON.stringify({
          success: true,
          message: `Learned tag alias: "${alias}" ➔ ${tagName} (${tagId}).`,
          status: validation.status,
          record: saved
        });
      }

      case 'query_learned_knowledge': {
        const categoryFilter = args.category ? String(args.category).toLowerCase() : null;
        const searchQuery = args.searchQuery ? String(args.searchQuery).toLowerCase() : '';

        const [notes, aliases] = await Promise.all([
          getAllPlantKnowledgeNotes(),
          getAllLearnedAliases()
        ]);

        const filteredNotes = notes
          .filter(n => !categoryFilter || n.category === categoryFilter)
          .filter(n => !searchQuery || n.topic.toLowerCase().includes(searchQuery) || n.note.toLowerCase().includes(searchQuery));

        const filteredAliases = aliases
          .filter(a => !searchQuery || a.alias.toLowerCase().includes(searchQuery) || a.tagName.toLowerCase().includes(searchQuery));

        return JSON.stringify({
          notesCount: filteredNotes.length,
          notes: filteredNotes.slice(0, 10),
          aliasesCount: filteredAliases.length,
          aliases: filteredAliases.slice(0, 10)
        });
      }

      case 'get_precomputed_telemetry_chunk': {
        const tagId = String(args.tagId || '');
        const dateStr = args.date ? String(args.date) : new Date().toISOString().slice(0, 10);
        const chunkKey = `chunk_${tagId}_1d_${dateStr}`;

        const chunk = await getPrecomputedChunk(chunkKey);
        if (!chunk) {
          return JSON.stringify({
            status: 'NOT_FOUND',
            message: `No precomputed telemetry chunk found for tag ${tagId} on ${dateStr}. Please use query_historian for on-demand aggregation.`
          });
        }

        return JSON.stringify({
          status: 'FOUND',
          chunkKey: chunk.chunkKey,
          tagId: chunk.tagId,
          stats: chunk.stats,
          generatedAt: chunk.generatedAt
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool name: ${name}` });

    }
  } catch (err: any) {
    return JSON.stringify({ error: `Tool execution failed: ${err.message}` });
  }
}
