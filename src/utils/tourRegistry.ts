import { AppView } from '../types';

export interface CoachMarkStep {
  id: string;
  targetSelector: string;
  title: string;
  category: string;
  badgeColor: string;
  icon: string;
  description: string;
  keyPoints?: string[];
  preferredPlacement?: 'bottom' | 'top' | 'left' | 'right' | 'auto';
  targetView?: AppView;
  specialAction?: 'fdd' | 'alarms' | 'historian' | 'manual';
  actionLabel?: string;
}

const STORAGE_PREFIX = 'tasc_tour_suppressed_';

/**
 * Fast O(1) check (< 0.1ms) to determine if a tour was permanently suppressed by the user.
 */
export function isTourSuppressed(tourId: string): boolean {
  if (typeof localStorage === 'undefined') return false;
  try {
    return localStorage.getItem(STORAGE_PREFIX + tourId) === '1';
  } catch {
    return false;
  }
}

/**
 * Sets or clears the suppression state of a specific submodule tour.
 */
export function setTourSuppressed(tourId: string, suppressed: boolean): void {
  if (typeof localStorage === 'undefined') return;
  try {
    if (suppressed) {
      localStorage.setItem(STORAGE_PREFIX + tourId, '1');
    } else {
      localStorage.removeItem(STORAGE_PREFIX + tourId);
    }
  } catch (e) {
    console.warn('[TourRegistry] Failed to save tour state:', e);
  }
}

/**
 * Resets all submodule tour suppression flags.
 */
export function resetAllTourSuppressions(): void {
  if (typeof localStorage === 'undefined') return;
  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(STORAGE_PREFIX)) {
        keysToRemove.push(k);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch (e) {
    console.warn('[TourRegistry] Failed to reset tour states:', e);
  }
}

// ─── Central Tour Step Registry for All Modules ─────────────────────────────
export const ALL_SUBMODULE_TOURS: Record<string, CoachMarkStep[]> = {
  // 1. Global Navbar & Main Shell
  global: [
    {
      id: 'sidebar_menu',
      targetSelector: '[data-tour="sidebar-btn"]',
      title: 'Main Navigation & Settings Menu',
      category: 'Navigation',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      icon: 'fa-bars',
      description: 'Access all system modules from the slide-out menu: MQTT Broker settings, Driver Connections, Tag Managers, OPC UA Browser, System Backups, and App Settings.',
      keyPoints: [
        'Switch between screens and dashboard configurations',
        'Manage user roles (Admin vs Operator Client)'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'driver_connections',
      targetSelector: '[data-tour="drivers-pill"]',
      title: 'Live Driver & MQTT Connections',
      category: 'Hardware Communication',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: 'fa-network-wired',
      description: 'Live communication status pill showing real-time connectivity to Modbus TCP/RTU PLCs, OPC UA servers, and MQTT message brokers with multi-color status dots.',
      keyPoints: [
        'Click to view individual driver health and latency',
        'Quick switch between live and simulated telemetry'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'alarm_center',
      targetSelector: '[data-tour="alarms-btn"]',
      title: 'Real-Time Alarms & Safety Trips',
      category: 'Safety & Alerts',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: 'fa-bell',
      description: 'Instant visual pulsating alerts and audible sirens whenever sensor parameters exceed critical safety thresholds or equipment trip tags activate.',
      keyPoints: [
        'Displays total active real-time alarm count',
        'One-click operator acknowledgment with audit logging'
      ],
      preferredPlacement: 'bottom',
      specialAction: 'alarms',
      actionLabel: 'Open Alarms'
    },
    {
      id: 'historian_window',
      targetSelector: '[data-tour="historian-btn"]',
      title: 'Alarm Historian & Audit Log',
      category: 'Historical Logging',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: 'fa-history',
      description: 'Persistent FIFO alarm lifecycle historian stored directly in browser IndexedDB. Tracks exact trigger timestamps, trip duration, and operator acknowledgments.',
      keyPoints: [
        'Multi-day filtering and search by zone or severity',
        'One-click export to CSV & Excel audit reports'
      ],
      preferredPlacement: 'bottom',
      specialAction: 'historian',
      actionLabel: 'View Historian'
    },
    {
      id: 'fdd_predictive',
      targetSelector: '[data-tour="fdd-btn"]',
      title: 'Fault Detection & Diagnostics (FDDWorx)',
      category: 'Predictive Maintenance',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: 'fa-shield-halved',
      description: 'ICONICS FDDWorx compatible predictive engine. Evaluates complex multi-variable rules, calculates hourly energy waste ($/hr), and runs AI Root Cause Analysis (RCA).',
      keyPoints: [
        'Catch equipment faults before machines break down',
        'Generates automated SOP maintenance work orders'
      ],
      preferredPlacement: 'bottom',
      specialAction: 'fdd',
      actionLabel: 'Open FDD'
    },
    {
      id: 'user_manual',
      targetSelector: '[data-tour="manual-btn"]',
      title: 'Engineering User Manual & Handbook',
      category: 'Documentation',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: 'fa-book-bookmark',
      description: 'Complete book-style user manual with 11 indexed chapters, interactive schematics with numbered markers, protocol tables, and troubleshooting FAQs.',
      keyPoints: [
        'Searchable index of all system features & guides',
        'Printable hardcopy and PDF export ready'
      ],
      preferredPlacement: 'bottom',
      targetView: AppView.USER_MANUAL,
      actionLabel: 'Read Manual'
    },
    {
      id: 'view_switcher',
      targetSelector: '[data-tour="view-toggle"]',
      title: 'Bento Grid & SCADA Canvas Switcher',
      category: 'HMI Visualization',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: 'fa-table-cells-large',
      description: 'Switch between the responsive modular Bento Grid layout and the absolute Web HMI Canvas featuring animated fluid pipes, tanks, and rotating pumps.',
      keyPoints: [
        'Toggle layout modes on the fly',
        'Select active HMI screen from the screen dropdown'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'ai_copilot_fab',
      targetSelector: '[data-tour="ai-copilot"]',
      title: 'AI Industrial Copilot',
      category: 'AI Assistant',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: 'fa-wand-magic-sparkles',
      description: 'Your 24/7 intelligent engineering assistant. Ask questions in plain English to query live telemetry, diagnose PLC trips, or analyze blueprint photos.',
      keyPoints: [
        'Supports NVIDIA NIM, Google Gemini, and Local Ollama',
        'Speech dictation with automatic filler word removal'
      ],
      preferredPlacement: 'top',
      targetView: AppView.AI_ASSISTANT,
      actionLabel: 'Chat with AI'
    }
  ],

  // 2. FDD & Predictive Maintenance Submodule
  fdd: [
    {
      id: 'fdd_kpi_bar',
      targetSelector: '[data-tour="fdd-kpis"]',
      title: 'Executive Plant Health & Waste Scorecard',
      category: 'KPI Overview',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: 'fa-gauge-high',
      description: 'Real-time scorecard tracking total active faults, critical issues, total Plant Health Index (0-100%), and hourly financial energy waste rate ($/hr).',
      keyPoints: [
        'Total $/hr financial losses from active equipment faults',
        'Real-time health index calculation across all plant assets'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'fdd_nlp_bar',
      targetSelector: '[data-tour="fdd-nlp-search"]',
      title: 'Natural Language AI Fault Search',
      category: 'AI Diagnostics',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: 'fa-sparkles',
      description: 'Ask questions in plain English (e.g. "What faults are active?", "Which asset is wasting the most energy?", "Show chiller health").',
      keyPoints: [
        'Instant answers powered by pre-fault telemetry analysis',
        'One-click query execution'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'fdd_tabs',
      targetSelector: '[data-tour="fdd-tabs"]',
      title: 'FDD Navigation & Diagnostic Modes',
      category: 'Navigation',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      icon: 'fa-layer-group',
      description: 'Switch between Active Faults Matrix, Hierarchical Asset Tree, Fault Trend Overlay chart, Predictive Work Orders, and the FDD Rule Builder.',
      keyPoints: [
        'Active Faults: Live trigger values and one-click AI RCA',
        'Asset Tree: Plant -> Area -> Machine hierarchy',
        'Rule Builder: Multi-variable expression grammar'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'fdd_sim_btn',
      targetSelector: '[data-tour="fdd-sim-btn"]',
      title: 'Simulate Fault Injection',
      category: 'Testing & Validation',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: 'fa-bolt-lightning',
      description: 'Inject a simulated chiller overheat fault to test live FDD detection, debounce timing, financial waste calculations, and AI Root Cause Analysis.',
      keyPoints: [
        'Safe testing without impacting physical hardware',
        'Instantly generates active fault cards and RCA'
      ],
      preferredPlacement: 'bottom'
    }
  ],

  // 3. Driver Connections Submodule
  driver_connections: [
    {
      id: 'drv_header',
      targetSelector: '[data-tour="drv-header"]',
      title: 'Industrial Driver Connections',
      category: 'Hardware Communication',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: 'fa-plug-circle-bolt',
      description: 'Manage communication drivers connecting TASC Studio to physical PLCs, VFDs, power meters, and remote IO racks over Modbus TCP/RTU, OPC UA, or Serial.',
      keyPoints: [
        'Supports Modbus TCP, Modbus RTU, OPC UA, RS-485, USB Serial',
        'Tracks round-trip latency and connection health'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'drv_add_btn',
      targetSelector: '[data-tour="drv-add-btn"]',
      title: 'Add New Hardware Driver',
      category: 'Configuration',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: 'fa-plus',
      description: 'Configure a new PLC connection by specifying IP address, Port, Slave Unit ID, Timeout, and Byte/Word order settings.',
      keyPoints: [
        'Custom retry intervals and poll rates',
        'Support for 32-bit float and integer byte swapping'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'drv_list',
      targetSelector: '[data-tour="drv-list"]',
      title: 'Configured Driver Cards & Live State',
      category: 'Status',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      icon: 'fa-server',
      description: 'Displays all configured drivers with protocol badges, IP addresses, enabled/disabled state, and one-click Connect / Disconnect controls.',
      keyPoints: [
        'Real-time online/offline LED indicator',
        'Direct link to Driver Diagnostics & Tag Manager'
      ],
      preferredPlacement: 'top'
    }
  ],

  // 4. Driver Tag Manager Submodule
  driver_tag_manager: [
    {
      id: 'tag_header',
      targetSelector: '[data-tour="tag-header"]',
      title: 'PLC / Driver Tag Registry',
      category: 'Tag Management',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: 'fa-database',
      description: 'Central registry for all physical hardware tags. Map Modbus register addresses (Holding, Input, Coils) or OPC UA Node IDs to named variables.',
      keyPoints: [
        'Formula-based linear scaling (Raw Min/Max to Eng Min/Max)',
        'Data quality monitoring (Good, Bad, Stale, Offline)'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'tag_add_btn',
      targetSelector: '[data-tour="tag-add-btn"]',
      title: 'Create or Import Tags',
      category: 'Actions',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: 'fa-plus',
      description: 'Add individual tags manually or perform bulk CSV / JSON importing and exporting for rapid plant commissioning.',
      keyPoints: [
        'One-click CSV template import/export',
        'Automatic register datatype validation'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'tag_search',
      targetSelector: '[data-tour="tag-search"]',
      title: 'Search & Protocol Filters',
      category: 'Filters',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      icon: 'fa-search',
      description: 'Filter registered tags by protocol (Modbus TCP, OPC UA, Serial), connection ID, register type, or data quality status.',
      preferredPlacement: 'bottom'
    },
    {
      id: 'tag_table',
      targetSelector: '[data-tour="tag-table"]',
      title: 'Tag Table & Live Telemetry',
      category: 'Data Table',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: 'fa-table',
      description: 'Inspect live readings, engineering units, raw-to-scaled conversions, and live data quality badges for every registered tag.',
      preferredPlacement: 'top'
    }
  ],

  // 5. MQTT Tag Manager Submodule
  tag_manager: [
    {
      id: 'mqtt_tag_header',
      targetSelector: '[data-tour="mqtt-tag-header"]',
      title: 'MQTT Tag & JSONPath Manager',
      category: 'MQTT Registry',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: 'fa-tags',
      description: 'Manage auto-discovered and custom MQTT topic tags, JSONPath extractions, and linked UI widgets.',
      keyPoints: [
        'Auto-extract nested JSON payloads (e.g. $.telemetry.temp)',
        'Usage tracking: See which panels are bound to each tag'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'mqtt_tag_actions',
      targetSelector: '[data-tour="mqtt-tag-actions"]',
      title: 'Tag Discovery & Custom Mapping',
      category: 'Actions',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: 'fa-tag',
      description: 'Add custom tag definitions or let TASC Studio auto-populate tags as MQTT messages arrive on subscribed topics.',
      preferredPlacement: 'bottom'
    }
  ],

  // 6. MQTT Topic Manager Submodule
  topic_manager: [
    {
      id: 'topic_header',
      targetSelector: '[data-tour="topic-header"]',
      title: 'MQTT Topic Hierarchy & Dependency Scanner',
      category: 'Topic Management',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      icon: 'fa-sitemap',
      description: 'Deep dependency scanner that analyzes all panels across every dashboard, validates wildcard syntax, and prevents broken topic links.',
      keyPoints: [
        'Preview affected widgets before modifying topics',
        'Bulk Find & Replace across all dashboards with one click'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'topic_bulk_replace',
      targetSelector: '[data-tour="topic-bulk-replace"]',
      title: 'Bulk Find & Replace Engine',
      category: 'Refactoring',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: 'fa-arrows-rotate',
      description: 'Rename an entire topic prefix (e.g. factory/line1 -> factory/line2) across all dashboards and panels simultaneously.',
      preferredPlacement: 'bottom'
    }
  ],

  // 7. MQTT Broker Settings Submodule
  add_connection: [
    {
      id: 'broker_settings_header',
      targetSelector: '[data-tour="broker-header"]',
      title: 'MQTT Broker Connection Settings',
      category: 'Connectivity',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: 'fa-server',
      description: 'Configure MQTT broker host, port, protocol (WebSocket ws:// or Secure wss://), Keepalive, and Clean Session settings.',
      keyPoints: [
        'Supports standard and secure TLS WebSockets',
        'Client ID and Username/Password authentication'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'broker_test_btn',
      targetSelector: '[data-tour="broker-test-btn"]',
      title: 'Test & Save Connection',
      category: 'Actions',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: 'fa-plug',
      description: 'Test broker connectivity in real-time before saving the configuration to browser memory.',
      preferredPlacement: 'top'
    }
  ],

  // 8. OPC UA Browser Submodule
  opc_ua_browser: [
    {
      id: 'opc_header',
      targetSelector: '[data-tour="opc-header"]',
      title: 'Live OPC UA Hierarchical Tree Browser',
      category: 'OPC UA Discovery',
      badgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
      icon: 'fa-sitemap',
      description: 'Connect directly to OPC UA servers and browse folders, objects, and variable nodes in an interactive tree view.',
      keyPoints: [
        'One-click tag importing directly into the Tag Manager',
        'Inspect NodeId, DataType, AccessLevel, and live values'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'opc_tree',
      targetSelector: '[data-tour="opc-tree"]',
      title: 'Address Space Hierarchy',
      category: 'Navigation',
      badgeColor: 'bg-sky-500/20 text-sky-300 border-sky-500/40',
      icon: 'fa-folder-tree',
      description: 'Expand server namespaces and folders (Root -> Objects -> Devices) to discover available sensors and telemetry points.',
      preferredPlacement: 'right'
    }
  ],

  // 9. Driver Diagnostics Submodule
  driver_diagnostics: [
    {
      id: 'diag_header',
      targetSelector: '[data-tour="diag-header"]',
      title: 'Real-Time Driver Health & Performance',
      category: 'Diagnostics',
      badgeColor: 'bg-rose-500/20 text-rose-300 border-rose-500/40',
      icon: 'fa-stethoscope',
      description: 'Monitor round-trip communication latency, packet error rates, consecutive failure counters, and stale tag alarms.',
      keyPoints: [
        'Diagnose intermittent Modbus timeouts and dropped packets',
        'One-click driver restart and socket reconnection'
      ],
      preferredPlacement: 'bottom'
    }
  ],

  // 10. Alarm Historian Submodule
  alarm_historian: [
    {
      id: 'ah_header',
      targetSelector: '[data-tour="ah-header"]',
      title: 'Industrial Alarm Historian Window',
      category: 'Audit & Records',
      badgeColor: 'bg-indigo-500/20 text-indigo-300 border-indigo-500/40',
      icon: 'fa-history',
      description: 'FIFO persistent alarm audit log stored in browser IndexedDB. Records exact trip timestamps, duration, and operator acknowledgment notes.',
      keyPoints: [
        'Filter by date range, zone, or severity (HH, H, Trip, LL)',
        'One-click export to CSV & Excel audit sheets'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'ah_export',
      targetSelector: '[data-tour="ah-export-btn"]',
      title: 'Export Audit Log (CSV / Excel)',
      category: 'Reporting',
      badgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
      icon: 'fa-file-excel',
      description: 'Download the complete historical alarm audit log for compliance, shift handover reports, and reliability analysis.',
      preferredPlacement: 'bottom'
    }
  ],

  // 11. App Settings Submodule
  settings: [
    {
      id: 'settings_header',
      targetSelector: '[data-tour="settings-header"]',
      title: 'System Settings & Security Safeguards',
      category: 'Configuration',
      badgeColor: 'bg-slate-500/20 text-slate-300 border-slate-500/40',
      icon: 'fa-gear',
      description: 'Configure color themes, runtime PIN security protection, idle auto-lock timeouts, and audio alarm sirens.',
      keyPoints: [
        'Runtime PIN lock for touchscreen kiosks',
        'Custom client branding and theme styling'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'settings_pin',
      targetSelector: '[data-tour="settings-pin"]',
      title: 'Runtime Control PIN Safeguard',
      category: 'Security',
      badgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
      icon: 'fa-lock',
      description: 'Protect dangerous control switches and setpoint sliders behind a 4-digit PIN with a configurable auto-lock idle timeout.',
      preferredPlacement: 'top'
    }
  ],

  // 12. AI Copilot Full View Submodule
  ai_assistant: [
    {
      id: 'ai_header',
      targetSelector: '[data-tour="ai-header"]',
      title: 'AI Industrial Copilot Engineering Studio',
      category: 'AI Copilot',
      badgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
      icon: 'fa-wand-magic-sparkles',
      description: 'Full engineering studio for configuring AI models, executing tool queries against live plant telemetry, and diagnosing machine alarms.',
      keyPoints: [
        'Dedicated per-provider settings for NVIDIA NIM, Gemini, and Ollama',
        'Voice speech dictation with automatic filler word removal',
        'Vision blueprint and schematic analysis'
      ],
      preferredPlacement: 'bottom'
    },
    {
      id: 'ai_provider_tabs',
      targetSelector: '[data-tour="ai-provider-tabs"]',
      title: 'AI Model Provider Selection',
      category: 'Configuration',
      badgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
      icon: 'fa-sliders',
      description: 'Switch between cloud GPU providers (NVIDIA NIM, Google Gemini, Groq) and 100% air-gapped on-premise local LLMs (Ollama, LM Studio).',
      preferredPlacement: 'bottom'
    }
  ]
};
