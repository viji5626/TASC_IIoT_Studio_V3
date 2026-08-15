/**
 * TASC IIoT Studio — Comprehensive System Knowledge Base & RAG Engine
 * Deep architectural and operational knowledge across all modules, settings, and protocols.
 */

export const TASC_SYSTEM_KNOWLEDGE = `
# TASC IIoT Studio — System Architecture & Modules Knowledge Base

## 1. Overview & Navigation Views (Side Menu)
- **SCADA Dashboard / Canvas (AppView.DASHBOARD)**: High-performance real-time industrial HMI canvas. Supports grid snapping, freeform widget positioning, interactive control panels, SVG symbols, animated pipes, switches, gauges, and charts.
- **All Connections (AppView.CONNECTIONS)**: Unified overview of both MQTT Broker connections and Industrial Communication Drivers with live status badges.
- **MQTT Broker Settings (AppView.ADD_CONNECTION)**: Configuration for MQTT brokers (TCP, WebSocket, WSS, SSL/TLS, Port, Client ID, Username, Password, Auto-reconnect, Keepalive, Clean Session).
- **MQTT Topic Manager (AppView.TOPIC_MANAGER)**: Centralized topic scanner and registry. Performs deep dependency scanning of all panels, validates MQTT syntax (+ and # wildcards), previews affected widgets, and performs bulk Find & Replace across all dashboards.
- **MQTT Tag Manager (AppView.TAG_MANAGER)**: Tag registry for detected, imported, and manually mapped MQTT tags. Tracks JSONPath definitions, usage counts, and linked widgets.
- **AI Industrial Copilot (AppView.AI_ASSISTANT)**: Real-time contextual engineering assistant with tool execution, vision image analysis, speech dictation with vocal filler removal, response latency metrics, and industrial blueprint generation.
- **Driver Connections (AppView.DRIVER_CONNECTIONS)**: Management of industrial hardware drivers (Modbus TCP, Modbus RTU, OPC UA, OPC DA, RS-485, USB Serial, TCP Custom).
- **Driver Tag Manager (AppView.DRIVER_TAG_MANAGER)**: Hardware PLC/SCADA tag manager. Manages Modbus registers (Coils, Discrete Inputs, Holding Registers, Input Registers), OPC UA Node IDs, scaling (rawMin/rawMax to engMin/engMax), poll rates (ms), live values, and data quality (Good/Bad/Stale/Uncertain).
- **OPC UA Browser (AppView.OPC_UA_BROWSER)**: Live hierarchical tree browser for connected OPC UA servers. Discovers objects, variables, namespaces, and node IDs, allowing one-click tag importing.
- **Driver Diagnostics (AppView.DRIVER_DIAGNOSTICS)**: Real-time driver health monitor. Tracks connection state, round-trip latency, packet error rates, consecutive failure counters, and stale tag monitors.
- **App Settings (AppView.SETTINGS)**: Global settings including Runtime PIN Protection (with configurable timeout), Theme Selection, Client Branding, Audio Alarm settings, and Auto-save intervals.
- **Backup & Restore (AppView.BACKUP)**: Full JSON configuration snapshot export/import, encrypted project packaging, and cloud sync backups.
- **Alarm Log & Historian**: IndexedDB persistent storage of all alarm trigger, acknowledgment, and resolution events with duration calculations.
- **Trend Historian**: High-speed indexed time-series historian for telemetry pens with historical range querying, statistical aggregation (MIN, MAX, AVG, LAST), and CSV/Excel export.

## 2. Industrial Communication Protocols
- **Modbus TCP / RTU**:
  - Register Types: Coils (FC 01/05), Discrete Inputs (FC 02), Holding Registers (FC 03/06/16), Input Registers (FC 04).
  - Data Types: Boolean, INT16, UINT16, INT32, UINT32, Float32 (IEEE 754), Double64, String.
  - Byte/Word Swapping: Big-Endian, Little-Endian, Word-Swapped (Mid-Endian) for 32-bit registers.
  - Configurable Slave ID / Unit ID, Timeout (ms), Retry Intervals.
- **OPC UA / OPC DA**:
  - Supports Security Modes (None, Sign, Sign & Encrypt) and Security Policies (Basic256Sha256, Aes128_Sha256_RsaOaep, etc.).
  - NodeId addressing (e.g. \`ns=2;s=Device1.Temperature\` or numeric \`ns=1;i=1001\`).
  - Browsing namespaces and subscribing to MonitoredItems.
- **MQTT**:
  - Supports MQTT 3.1.1 and 5.0 protocols over WebSockets (\`ws://\` and \`wss://\`).
  - QoS Levels: QoS 0 (At most once), QoS 1 (At least once), QoS 2 (Exactly once).
  - Wildcards: Single-level (\`+\`) and Multi-level (\`#\`).
  - Payload Parsing: Plain numeric/text strings, JSON payloads with configurable JSONPath extraction.

## 3. Product Editions & User Roles
- **Community Edition**: Free demo mode (1 Dashboard, max 10 Widgets, max 5 Driver Tags).
- **Engineering Studio (Admin)**: Full unrestricted engineering mode with schema editing, driver creation, tag management, and full project configuration.
- **Client Runtime (Operator)**: Locked kiosk operator runtime with restricted navigation, hidden edit controls, and PIN protection.
`;
