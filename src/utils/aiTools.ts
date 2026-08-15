import { AppState, ActiveAlarm, DriverTag } from '../types';
import { ToolDefinition } from './aiProviders/types';
import { queryHistoricalRange } from './trendHistorianEngine';
import { getAlarmHistory } from './alarmHistorianEngine';
import { scanAppTopics } from './topicManager';

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

  return `
[LIVE PROJECT SNAPSHOT - CURRENT RUNTIME STATE]
- Dashboards (${dashboards.length}): ${dashboards.map(db => `"${db.dashboardName}" (${db.dashboardId})`).join(', ') || 'None'}
- Total UI Panels/Widgets: ${panels.length}
- MQTT Brokers (${connections.length}): ${connections.map(c => `${c.connectionName} (${c.brokerAddress}:${c.port}) [${c.connected ? 'ONLINE' : 'OFFLINE'}]`).join(', ') || 'None'}
- Industrial Communication Drivers (${drivers.length} total, ${connectedDrivers.length} connected):
${driverSummary || '  No drivers configured'}
- Driver Tags (${driverTags.length} registered): ${goodTagsCount} Good Quality, ${badTagsCount} Bad/Offline
- Active Real-Time Alarms (${activeAlarms.length}): ${activeAlarms.map(a => `[${a.zone}] ${a.panelName}: ${a.message} (val=${a.value})`).join(', ') || 'No active alarms (Normal)'}
- User Role / Mode: ${appState.userRole || 'admin'} (${appState.productEdition || 'engineering'})
`.trim();
}

export const AI_TOOL_DEFINITIONS: ToolDefinition[] = [
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
  }
];

export async function executeAiTool(name: string, args: Record<string, unknown>): Promise<string> {
  const ctx = currentContext;
  if (!ctx) {
    return JSON.stringify({ error: 'AI tools context is not initialized.' });
  }

  try {
    switch (name) {
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

      default:
        return JSON.stringify({ error: `Unknown tool name: ${name}` });
    }
  } catch (err: any) {
    return JSON.stringify({ error: `Tool execution failed: ${err.message}` });
  }
}
