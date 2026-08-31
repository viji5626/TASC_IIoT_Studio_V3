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
import { OeePersistence } from '../services/OeePersistence';
import { OeeCalculationEngine } from '../services/OeeCalculationEngine';
import { TraceabilityService } from '../services/TraceabilityService';
import { Ai3dAssetService, Ai3dAssetDefinition } from '../services/Ai3dAssetService';

export interface AiToolsContext {
  latestValues: Record<string, { val: any; time: string; timestampMs?: number; quality?: string }>;
  appState: AppState;
  activeAlarms: ActiveAlarm[];
}

let currentContext: AiToolsContext | null = null;

export function resolveAiToolsContext(): AiToolsContext {
  if (currentContext && currentContext.appState) {
    return currentContext;
  }
  let fallbackAppState: any = {};
  try {
    const raw = 
      localStorage.getItem('tasc_app_state') || 
      localStorage.getItem('mqtt_dash_pro_state') || 
      localStorage.getItem('tasc_studio_state') || 
      localStorage.getItem('tasc_client_state_backup') || 
      localStorage.getItem('tasc_community_state_backup');
    if (raw) {
      fallbackAppState = JSON.parse(raw);
    }
  } catch {}

  const safeAppState: AppState = {
    dashboards: fallbackAppState.dashboards || [],
    panels: fallbackAppState.panels || [],
    connections: fallbackAppState.connections || [],
    driverConnections: fallbackAppState.driverConnections || [],
    driverTags: fallbackAppState.driverTags || [],
    historianTags: fallbackAppState.historianTags || [],
    assetHierarchy: fallbackAppState.assetHierarchy || [],
    equipmentClasses: fallbackAppState.equipmentClasses || [],
    userRole: (localStorage.getItem('tasc_user_role') as any) || 'admin',
    productEdition: (localStorage.getItem('tasc_product_edition') as any) || 'engineering',
    ...fallbackAppState
  } as AppState;

  const fallbackCtx: AiToolsContext = {
    latestValues: currentContext?.latestValues || {},
    appState: safeAppState,
    activeAlarms: currentContext?.activeAlarms || []
  };

  currentContext = fallbackCtx;
  return fallbackCtx;
}

export function setAiToolsContext(ctx: AiToolsContext): void {
  currentContext = ctx;
}

export function getAiToolsContext(): AiToolsContext {
  return resolveAiToolsContext();
}

/**
 * Generates an instant high-density live telemetry and architecture snapshot
 * to inject directly into the system prompt for instant zero-latency reasoning.
 */
export function getLiveContextSnapshot(): string {
  const ctx = resolveAiToolsContext();
  const { appState, activeAlarms, latestValues } = ctx;

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

  // OEE & Traceability Runtime Context
  let oeeSummary = 'OEE Studio: Ready';
  let traceSummary = 'Batch Traceability: Ready';
  try {
    const lines = OeePersistence.loadLines();
    const activeLineId = OeePersistence.getActiveLineId();
    const activeLine = lines.find(l => l.id === activeLineId) || lines[0];
    if (activeLine) {
      oeeSummary = `Active Line: "${activeLine.name}" (Code: ${activeLine.code}, Target OEE: ${activeLine.targetOeePct}%, Ideal Cycle: ${activeLine.idealCycleTimeSec}s). Total Lines: ${lines.length}.`;
    }

    const batches = TraceabilityService.loadBatches();
    const activeBatchId = TraceabilityService.getActiveBatchId();
    const activeBatch = batches.find(b => b.id === activeBatchId) || batches[0];
    if (activeBatch) {
      traceSummary = `Active Batch: ${activeBatch.batchNumber} (Recipe: "${activeBatch.recipeName}", Status: ${activeBatch.status}, Target: ${activeBatch.targetQuantity} ${activeBatch.unit}, Produced: ${activeBatch.actualQuantity}, Yield: ${activeBatch.yieldPercentage}%). Total Batches: ${batches.length}.`;
    }
  } catch {}

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
- OEE Studio State: ${oeeSummary}
- Batch & Lot Traceability: ${traceSummary}
- 3D SCADA Twin: Active (ASME B16.5 Piping & Live Telemetry Meshes)
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
  },
  {
    name: 'get_oee_studio_metrics',
    description: 'Query live OEE Studio metrics for machines/production lines, including Availability, Performance, Quality, Overall OEE %, total parts produced, scrap rates, downtime events, and Pareto root-cause losses.',
    parameters: {
      type: 'object',
      properties: {
        lineId: {
          type: 'string',
          description: 'Optional line ID (e.g. line_bottling_1, line_cnc_milling_2, line_cartoning_3). If omitted, returns active line.'
        }
      }
    }
  },
  {
    name: 'get_batch_traceability_detail',
    description: 'Query FDA 21 CFR Part 11 Batch & Lot Traceability records, Critical Process Parameters (CPPs), raw material lots genealogy, or run forward/backward recall traces.',
    parameters: {
      type: 'object',
      properties: {
        batchId: {
          type: 'string',
          description: 'Optional batch ID or batch number. If omitted, returns active batch.'
        },
        recallQuery: {
          type: 'string',
          description: 'Optional lot number or serial number to execute an instant forward or backward recall trace.'
        },
        recallMode: {
          type: 'string',
          description: 'FORWARD (from raw material lot) or BACKWARD (from customer serial / QR).'
        }
      }
    }
  },
  {
    name: 'generate_3d_asset',
    description: 'ONLY use when the user EXPLICITLY commands to "generate 3d model", "create 3d asset", or "build 3d equipment". NEVER use for general questions, summaries, alarms, or normal conversation. Procedurally creates interactive 3D SCADA equipment (pumps, tanks, valves, mixers, conveyors) with PBR materials and telemetry hooks.',
    parameters: {
      type: 'object',
      properties: {
        assetName: {
          type: 'string',
          description: 'Descriptive title of the 3D equipment (e.g. "Tri-Blender High-Shear Mixing Skid", "Continuous Distillation Column").'
        },
        sector: {
          type: 'string',
          description: 'Industrial sector: e.g. "AI Generated Assets", "Process Equipment", "Material Handling", "Power & Utilities".'
        },
        category: {
          type: 'string',
          description: 'Specific equipment category: e.g. "Mixing & Blending", "Thermal Exchange", "Piping & Valves", "Robotics".'
        },
        description: {
          type: 'string',
          description: 'Technical engineering summary detailing components, nozzles, drive motors, and operating capabilities.'
        },
        icon: {
          type: 'string',
          description: 'FontAwesome icon string (e.g. "fa-gears", "fa-flask-vial", "fa-fire-flame-curved", "fa-robot", "fa-industry", "fa-cubes").'
        },
        dimensions: {
          type: 'object',
          properties: {
            width: { type: 'number', description: 'Overall width (X-axis) in meters.' },
            height: { type: 'number', description: 'Overall height (Y-axis) in meters.' },
            depth: { type: 'number', description: 'Overall depth (Z-axis) in meters.' }
          },
          required: ['width', 'height', 'depth']
        },
        components: {
          type: 'array',
          description: 'Array of procedural 3D geometric sub-meshes that assemble the complete equipment structure.',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              name: { type: 'string' },
              type: {
                type: 'string',
                description: 'Primitive type: box | cylinder | sphere | cone | flanged_nozzle | motor_housing | hopper | skid_base'
              },
              position: {
                type: 'object',
                properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } },
                required: ['x', 'y', 'z']
              },
              rotation: {
                type: 'object',
                properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
              },
              scale: {
                type: 'object',
                properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } }
              },
              dimensions: {
                type: 'object',
                properties: {
                  width: { type: 'number' },
                  height: { type: 'number' },
                  depth: { type: 'number' },
                  radius: { type: 'number' },
                  radiusTop: { type: 'number' },
                  radiusBottom: { type: 'number' }
                }
              },
              material: {
                type: 'object',
                properties: {
                  color: { type: 'string' },
                  metalness: { type: 'number' },
                  roughness: { type: 'number' },
                  emissive: { type: 'string' },
                  emissiveIntensity: { type: 'number' },
                  opacity: { type: 'number' },
                  transparent: { type: 'boolean' }
                },
                required: ['color']
              },
              animationHook: {
                type: 'string',
                description: 'Optional animation: spin_shaft | level_indicator | thermal_glow | status_beacon'
              }
            },
            required: ['id', 'name', 'type', 'position', 'dimensions', 'material']
          }
        },
        telemetryHooks: {
          type: 'array',
          description: 'SCADA tag connection points for real-time telemetry animation (e.g. Speed RPM, Fill Level %, Core Temp °C, Pressure Bar, Run Status Bit).',
          items: {
            type: 'object',
            properties: {
              slotName: { type: 'string' },
              displayName: { type: 'string' },
              channelType: { type: 'string', description: 'speed_rpm | level_pct | temperature_c | pressure_bar | status_alarm | count_total' },
              defaultTag: { type: 'string' },
              description: { type: 'string' }
            },
            required: ['slotName', 'displayName', 'channelType', 'description']
          }
        },
        tags: {
          type: 'array',
          items: { type: 'string' }
        }
      },
      required: ['assetName', 'category', 'description', 'dimensions', 'components', 'telemetryHooks']
    }
  }
];

/**
 * Selects only the relevant tools for a given user query to optimize context usage
 * and prevent small/local LLMs from hallucinatory/unsolicited heavy tool calling.
 */
export function getRelevantAiTools(userQuery: string): ToolDefinition[] {
  const q = (userQuery || '').toLowerCase();

  // Explicit 3D Asset creation intent
  const has3dIntent = /(3d|cad|mesh|digital twin|threejs|geometry|generate.*(pump|tank|valve|mixer|blender|motor|conveyor|vessel|column|asset|model|equipment)|create.*(3d|model|asset|equipment|pump)|design.*(3d|model|asset|equipment|pump)|build.*(3d|model|asset|equipment|pump))/i.test(q);

  // Explicit Image / Diagram generation intent
  const hasImageIntent = /(draw|schematic|diagram|blueprint|p&id|p\s*&\s*id|generate.*image|create.*image|illustration|wiring layout|render photo)/i.test(q);

  // Report generation intent
  const hasReportIntent = /(report|export|shift summary|generate.*report|create.*report|pdf report)/i.test(q);

  // FDD / Fault diagnostics intent
  const hasFddIntent = /(fault|fdd|rca|root cause|diagnos|maintenance|work order|waste rate|energy waste|breakdown|health)/i.test(q);

  // Historian / Trends intent
  const hasHistoryIntent = /(history|trend|historian|past|yesterday|last hour|range|aggregate|min|max|average|avg|log)/i.test(q);

  return AI_TOOL_DEFINITIONS.filter(tool => {
    if (tool.name === 'generate_3d_asset') return has3dIntent;
    if (tool.name === 'generate_industrial_image') return hasImageIntent;
    if (tool.name === 'suggest_report_additions' || tool.name === 'generate_report') return hasReportIntent;
    if (tool.name.startsWith('fdd_')) return hasFddIntent;
    if (tool.name === 'query_historian') return hasHistoryIntent;

    // Default high-utility telemetry, alarm, driver, and tag tools
    return true;
  });
}

export async function executeAiTool(name: string, args: Record<string, unknown>, userQuery?: string): Promise<string> {
  const ctx = resolveAiToolsContext();

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
        const spanDays = Math.round((endMs - startMs) / (24 * 3600 * 1000));
        const isArchiveTier = spanDays > 30;
        const storageTier = spanDays > 90 ? '1day_rollup' : (isArchiveTier ? 'compressed_archive_chunk' : 'hot_raw');

        const numericVals = points.map(p => p.v).filter(v => typeof v === 'number' && isFinite(v));
        const minVal = numericVals.length > 0 ? Math.min(...numericVals) : null;
        const maxVal = numericVals.length > 0 ? Math.max(...numericVals) : null;
        const avgVal = numericVals.length > 0 ? Math.round((numericVals.reduce((a, b) => a + b, 0) / numericVals.length) * 100) / 100 : null;

        return JSON.stringify({
          penTopic,
          startMs,
          endMs,
          timeSpanDays: spanDays,
          storageTier,
          storageDescription: isArchiveTier ? `Decompressed from ${storageTier.toUpperCase()}` : 'Hot Raw Circular Buffer',
          returnedPoints: points.length,
          statsSummary: numericVals.length > 0 ? { min: minVal, max: maxVal, avg: avgVal } : null,
          points: points.slice(0, 100).map(p => ({ time: new Date(p.t).toISOString(), value: p.v }))
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
        const reqId = String(args.requestId || `req_${Date.now()}`);
        const suggestions = (args.suggestions as any[]) || [];
        const title = String(args.title || 'Industrial Report');
        const now = Date.now();
        const toMs = Number(args.toMs) && !isNaN(Number(args.toMs)) ? Number(args.toMs) : now;
        const fromMs = Number(args.fromMs) && !isNaN(Number(args.fromMs)) ? Number(args.fromMs) : (toMs - 86400000);
        
        let requestedTags = (args.requestedTags as string[]) || [];
        if (requestedTags.length === 0 && currentContext?.appState) {
          const histTags = currentContext.appState.historianTags?.map(t => t.id) || [];
          const panelTags = currentContext.appState.panels?.map(p => p.panelId) || [];
          requestedTags = histTags.length > 0 ? histTags : panelTags.slice(0, 10);
        }

        const resolution = String(args.resolution || '1hour');
        const includeAlarms = Boolean(args.includeAlarms);
        const includeFdd = Boolean(args.includeFdd);

        const payload = {
          __reportSuggestion: true,
          requestId: reqId,
          title,
          fromMs,
          toMs,
          requestedTags,
          resolution,
          includeAlarms,
          includeFdd,
          suggestions: (suggestions.length > 0 ? suggestions : [
            { id: 1, title: 'Energy & Peak Demand Analysis', description: 'Evaluates peak demand spikes and active load distribution.' },
            { id: 2, title: 'Alarm Rate & Incident Correlation', description: 'Correlates parameter spikes with historical alarm trigger timestamps.' },
            { id: 3, title: 'Statistical Deviation & 90th Percentile', description: 'Calculates standard deviation, min/max bounds, and p90 performance indices.' }
          ]).slice(0, 3),
          instructions: 'The suggestion cards have been displayed to the user. Wait for them to select suggestions in the chat. Do NOT generate the report yet.'
        };

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tasc_report_suggestion', { detail: payload }));
        }

        return JSON.stringify(payload);
      }

      case 'generate_report': {
        const reqId = String(args.requestId || `job_${Date.now()}`);
        const title = String(args.title || 'Industrial Report');
        const now = Date.now();
        const toMs = Number(args.toMs) && !isNaN(Number(args.toMs)) ? Number(args.toMs) : now;
        const fromMs = Number(args.fromMs) && !isNaN(Number(args.fromMs)) ? Number(args.fromMs) : (toMs - 86400000);
        
        let tags = (args.tags as string[]) || [];
        if (tags.length === 0 && currentContext?.appState) {
          const histTags = currentContext.appState.historianTags?.map(t => t.id) || [];
          const panelTags = currentContext.appState.panels?.map(p => p.panelId) || [];
          tags = histTags.length > 0 ? histTags : panelTags.slice(0, 10);
        }

        const resolution = String(args.resolution || '1hour');
        const includeAlarms = Boolean(args.includeAlarms ?? true);
        const includeFdd = Boolean(args.includeFdd ?? false);
        const selectedSuggestionIds = (args.selectedSuggestionIds as number[]) || [];
        const aiSummary = String(args.aiSummary || 'AI Automated Telemetry Analysis Report');
        const aiResults = String(args.aiResults || 'All monitored plant parameters operated within expected statistical limits over the reporting timeframe.');

        const payload = {
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
        };

        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tasc_report_generate', { detail: payload }));
        }

        return JSON.stringify(payload);
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

      case 'get_oee_studio_metrics': {
        const lines = OeePersistence.loadLines();
        const lineId = args.lineId ? String(args.lineId) : OeePersistence.getActiveLineId();
        const line = lines.find(l => l.id === lineId) || lines[0];

        if (!line) {
          return JSON.stringify({ error: 'No production lines found in OEE Studio.' });
        }

        const events = OeePersistence.loadEvents(line.id);
        const tags = line.tags || {};
        const rawTotal = tags.totalCountTag && ctx.latestValues[tags.totalCountTag] !== undefined
          ? Number(ctx.latestValues[tags.totalCountTag]?.val || 0)
          : 0;
        const rawReject = tags.rejectCountTag && ctx.latestValues[tags.rejectCountTag] !== undefined
          ? Number(ctx.latestValues[tags.rejectCountTag]?.val || 0)
          : 0;

        const plannedShiftSec = line.plannedShiftHours * 3600;
        const unplannedDowntimeSec = events.filter(e => !e.isPlanned).reduce((s, e) => s + e.durationSec, 0);
        const microStopsSec = events.filter(e => e.state === 'IDLE_MICRO_STOP').reduce((s, e) => s + e.durationSec, 0);

        const metrics = OeeCalculationEngine.calculateOee(
          line,
          plannedShiftSec,
          unplannedDowntimeSec,
          line.plannedDowntimeSec,
          microStopsSec,
          rawTotal,
          rawReject
        );

        const pareto = OeeCalculationEngine.getParetoLosses(events);
        const sixBigLosses = OeeCalculationEngine.calculateSixBigLosses(events, metrics, line.idealCycleTimeSec);

        return JSON.stringify({
          lineName: line.name,
          lineCode: line.code,
          department: line.department,
          idealCycleTimeSec: line.idealCycleTimeSec,
          targetOeePct: line.targetOeePct,
          activeShift: 'Shift A',
          metrics: {
            oeePct: metrics.oeePct,
            availabilityPct: metrics.availabilityPct,
            performancePct: metrics.performancePct,
            qualityPct: metrics.qualityPct,
            totalProduced: metrics.totalCount,
            goodCount: metrics.goodCount,
            rejectCount: metrics.rejectCount,
            scrapRatePct: metrics.scrapRatePct,
            actualRunRatePpm: metrics.actualRunRatePpm,
            targetRunRatePpm: metrics.targetRunRatePpm,
            unplannedDowntimeMinutes: Math.round(unplannedDowntimeSec / 60),
            operatingHours: Number((metrics.operatingTimeSec / 3600).toFixed(2))
          },
          topLosses: pareto.slice(0, 5),
          sixBigLossesSummary: {
            unplannedBreakdownsMin: Math.round(sixBigLosses.unplannedBreakdownsSec / 60),
            setupAdjustmentsMin: Math.round(sixBigLosses.setupAndAdjustmentsSec / 60),
            smallStopsMin: Math.round(sixBigLosses.smallStopsAndIdlingSec / 60),
            reducedSpeedLossMin: Math.round(sixBigLosses.reducedSpeedLossSec / 60),
            productionRejectsCount: sixBigLosses.productionRejectsCount,
            totalLostHours: sixBigLosses.totalLostHours
          }
        });
      }

      case 'get_batch_traceability_detail': {
        const batches = TraceabilityService.loadBatches();
        const batchId = args.batchId ? String(args.batchId) : TraceabilityService.getActiveBatchId();
        const batch = batches.find(b => b.id === batchId || b.batchNumber === batchId) || batches[0];

        if (args.recallQuery) {
          const mode = (String(args.recallMode || 'FORWARD').toUpperCase()) as 'FORWARD' | 'BACKWARD';
          const forwardResults = mode === 'FORWARD'
            ? TraceabilityService.forwardRecall(String(args.recallQuery))
            : [];
          const backwardResult = mode === 'BACKWARD'
            ? TraceabilityService.backwardRecall(String(args.recallQuery))
            : null;

          return JSON.stringify({
            recallMode: mode,
            query: args.recallQuery,
            forwardMatchesCount: forwardResults.length,
            forwardResults,
            backwardResult
          });
        }

        if (!batch) {
          return JSON.stringify({ error: 'No batch records found in Traceability Studio.' });
        }

        return JSON.stringify({
          batchNumber: batch.batchNumber,
          workOrderNumber: batch.workOrderNumber,
          recipeName: batch.recipeName,
          recipeVersion: batch.recipeVersion,
          lineName: batch.lineName,
          status: batch.status,
          targetQuantity: batch.targetQuantity,
          actualQuantity: batch.actualQuantity,
          scrapQuantity: batch.scrapQuantity,
          yieldPercentage: batch.yieldPercentage,
          unit: batch.unit,
          leadOperator: batch.leadOperator,
          supervisorName: batch.supervisorName,
          rawMaterialsCount: batch.rawMaterials.length,
          rawMaterials: batch.rawMaterials.map(r => ({
            materialName: r.materialName,
            lotNumber: r.lotNumber,
            supplierName: r.supplierName,
            quantityUsed: r.quantityUsed,
            grade: r.qualityGrade,
            passedInspection: r.passedInspection
          })),
          parametersCount: batch.parameters.length,
          parameters: batch.parameters.map(p => ({
            name: p.name,
            currentValue: p.currentValue,
            unit: p.unit,
            setpoint: p.setpoint,
            limits: `${p.minLimit} - ${p.maxLimit}`,
            oosViolationCount: p.oosViolationCount
          })),
          auditTrailCount: batch.auditTrail.length,
          finishedSerialsCount: batch.finishedSerials.length
        });
      }

      case 'generate_3d_asset': {
        const is3dExplicitlyRequested = /(3d|cad|mesh|digital twin|threejs|geometry|generate.*(pump|tank|valve|mixer|blender|motor|conveyor|vessel|column|asset|model|equipment)|create.*(3d|model|asset|equipment|pump)|design.*(3d|model|asset|equipment|pump)|build.*(3d|model|asset|equipment|pump))/i.test(userQuery || '');
        if (userQuery && !is3dExplicitlyRequested) {
          return JSON.stringify({
            status: 'REJECTED',
            error: "3D Asset Generation was not requested by the user. Please answer the user's inquiry directly using text/markdown without calling generate_3d_asset."
          });
        }

        const assetName = String(args.assetName || 'Custom 3D Industrial Asset').trim();
        const sector = String(args.sector || 'AI Generated Assets').trim();
        const category = String(args.category || 'Process Equipment').trim();
        const description = String(args.description || 'Procedurally generated 3D equipment asset with PBR materials and live telemetry hooks.').trim();
        const icon = String(args.icon || 'fa-cubes').trim();

        const rawDim = (args.dimensions as any) || {};
        const dimensions = {
          width: Math.max(0.2, Math.min(50, Number(rawDim.width || 2.0))),
          height: Math.max(0.2, Math.min(50, Number(rawDim.height || 2.0))),
          depth: Math.max(0.2, Math.min(50, Number(rawDim.depth || 2.0)))
        };

        const rawComps = Array.isArray(args.components) ? args.components : [];
        const components = rawComps.map((c: any, idx: number) => ({
          id: String(c.id || `comp_${idx + 1}`),
          name: String(c.name || `Part ${idx + 1}`),
          type: c.type || 'box',
          position: {
            x: Number(c.position?.x || 0),
            y: Number(c.position?.y || 0),
            z: Number(c.position?.z || 0)
          },
          rotation: c.rotation ? {
            x: Number(c.rotation?.x || 0),
            y: Number(c.rotation?.y || 0),
            z: Number(c.rotation?.z || 0)
          } : undefined,
          scale: c.scale ? {
            x: Number(c.scale?.x || 1),
            y: Number(c.scale?.y || 1),
            z: Number(c.scale?.z || 1)
          } : undefined,
          dimensions: {
            width: c.dimensions?.width ? Number(c.dimensions.width) : undefined,
            height: c.dimensions?.height ? Number(c.dimensions.height) : undefined,
            depth: c.dimensions?.depth ? Number(c.dimensions.depth) : undefined,
            radius: c.dimensions?.radius ? Number(c.dimensions.radius) : undefined,
            radiusTop: c.dimensions?.radiusTop ? Number(c.dimensions.radiusTop) : undefined,
            radiusBottom: c.dimensions?.radiusBottom ? Number(c.dimensions.radiusBottom) : undefined
          },
          material: {
            color: c.material?.color || '#64748b',
            metalness: c.material?.metalness !== undefined ? Number(c.material.metalness) : 0.7,
            roughness: c.material?.roughness !== undefined ? Number(c.material.roughness) : 0.3,
            emissive: c.material?.emissive || undefined,
            emissiveIntensity: c.material?.emissiveIntensity !== undefined ? Number(c.material.emissiveIntensity) : undefined,
            opacity: c.material?.opacity !== undefined ? Number(c.material.opacity) : 1,
            transparent: !!c.material?.transparent
          },
          animationHook: c.animationHook
        }));

        const rawHooks = Array.isArray(args.telemetryHooks) ? args.telemetryHooks : [];
        const telemetryHooks = rawHooks.map((h: any) => ({
          slotName: String(h.slotName || 'status'),
          displayName: String(h.displayName || 'Telemetry Point'),
          channelType: h.channelType || 'status_alarm',
          defaultTag: h.defaultTag ? String(h.defaultTag) : undefined,
          description: String(h.description || '')
        }));

        const assetId = `ai_asset_${Date.now().toString(36)}_${Math.random().toString(36).substring(2, 6)}`;
        const assetDef: Ai3dAssetDefinition = {
          id: assetId,
          name: assetName,
          sector,
          category,
          description,
          version: '1.0.0',
          createdAt: Date.now(),
          dimensions,
          components,
          telemetryHooks,
          icon,
          tags: (args.tags as string[]) || [category.toLowerCase(), 'ai-generated', '3d'],
          author: 'AI Copilot'
        };

        // Save and compile into 3D system
        Ai3dAssetService.saveAsset(assetDef);

        // Dispatch in-app event for instant chat preview card
        if (typeof window !== 'undefined') {
          window.dispatchEvent(new CustomEvent('tasc_3d_asset_generated', { detail: assetDef }));
        }

        return JSON.stringify({
          success: true,
          assetId: assetDef.id,
          assetName: assetDef.name,
          category: assetDef.category,
          dimensions: `${dimensions.width}m (W) × ${dimensions.height}m (H) × ${dimensions.depth}m (D)`,
          componentsCount: components.length,
          telemetrySlotsCount: telemetryHooks.length,
          telemetryHooks: telemetryHooks.map(h => `${h.displayName} [${h.channelType}]`),
          status: 'READY_IN_LIBRARY',
          message: `3D Asset "${assetName}" has been successfully generated and compiled into the 3D SCADA Asset Library under "🤖 AI Assets".`
        });
      }

      default:
        return JSON.stringify({ error: `Unknown tool name: ${name}` });

    }
  } catch (err: any) {
    return JSON.stringify({ error: `Tool execution failed: ${err.message}` });
  }
}
