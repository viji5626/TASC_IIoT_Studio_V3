/**
 * TASC IIoT Studio — Comprehensive System Knowledge Base & RAG Engine
 * Deep architectural and operational knowledge across all modules, settings, and protocols.
 */

export const TASC_SYSTEM_KNOWLEDGE = `
# TASC IIoT Studio — System Architecture & Modules Knowledge Base

## 1. Overview & Navigation Views (Side Menu & Studio Modules)
- **SCADA Dashboard / Canvas (AppView.DASHBOARD)**: High-performance real-time industrial HMI canvas. Supports grid snapping, freeform widget positioning, interactive control panels, SVG symbols, animated pipes, switches, gauges, and charts.
- **3D SCADA & Digital Twin Studio (AppView.SCADA_3D_VIEW)**: Real-time 3D WebGL industrial digital twin studio built with Three.js. Supports orbit/pan/zoom camera navigation, transform gizmos (translate, rotate, scale), industrial ASME B16.5 & B16.9 piping systems (weld-neck flanged joints with 8 hex bolts, 90° long-radius elbow bends, 45° elbows, equal tees, 4-way crosses, concentric reducers, motorized inline valves), and live 3D tag bindings (analog tank levels, pump RPMs, digital status glows, emergency trip color codes).
- **OEE & Downtime Intelligence Studio (AppView.OEE_STUDIO / route: /OEE_Studio)**: Standalone plant productivity studio. Computes deterministic Total Productive Maintenance (TPM) metrics: Availability (A), Performance (P), Quality (Q), and Overall OEE (A × P × Q). Features a 24-hour machine state Gantt ribbon, Pareto 80/20 downtime root cause tagging (Mechanical, Electrical, Material Shortage, Quality, Changeover), TPM Six Big Losses breakdown, Shift A/B/C benchmark comparison, and direct physical PLC driver / MQTT tag bindings.
- **Batch & Lot Traceability Studio (AppView.TRACEABILITY_STUDIO / route: /Traceability_Studio)**: Regulated manufacturing traceability and quality release studio. Features a 4-Stage Material & Process Genealogy Tree (Inward Raw Materials -> WIP Execution -> Process Controls -> Finished Serialized Goods with QR verification payloads), Critical Process Parameters (CPPs) Historian with Upper/Lower Specification Limits (USL/LSL), Bi-Directional Recall & Blast Radius Explorer (Forward Lot Recall and Backward Serial Trace), and 1-Click FDA 21 CFR Part 11 / ISO 9001 Certificate of Analysis (CoA) printable reports with SHA-256 validated electronic signatures.
- **All Connections (AppView.CONNECTIONS)**: Unified overview of both MQTT Broker connections and Industrial Communication Drivers with live status badges.
- **MQTT Broker Settings (AppView.ADD_CONNECTION)**: Configuration for MQTT brokers (TCP, WebSocket, WSS, SSL/TLS, Port, Client ID, Username, Password, Auto-reconnect, Keepalive, Clean Session).
- **MQTT Topic Manager (AppView.TOPIC_MANAGER)**: Centralized topic scanner and registry. Performs deep dependency scanning of all panels, validates MQTT syntax (+ and # wildcards), previews affected widgets, and performs bulk Find & Replace across all dashboards.
- **MQTT Tag Manager (AppView.TAG_MANAGER)**: Tag registry for detected, imported, and manually mapped MQTT tags. Tracks JSONPath definitions, usage counts, and linked widgets.
- **AI Industrial Copilot (AppView.AI_ASSISTANT)**: Real-time contextual engineering assistant with tool execution, vision image analysis, speech dictation with vocal filler removal, response latency metrics, and industrial blueprint generation.
- **Driver Connections (AppView.DRIVER_CONNECTIONS)**: Management of industrial hardware drivers (Siemens S7, Modbus TCP, Modbus RTU, OPC UA, OPC DA, Rockwell Allen Bradley Ethernet/IP, Profinet, Profibus, Mitsubishi MELSEC, IEC 61850, USB Serial).
- **Driver Tag Manager (AppView.DRIVER_TAG_MANAGER)**: Hardware PLC/SCADA tag manager. Manages Modbus registers, Siemens DB blocks (e.g. DB1.DBD4), OPC UA Node IDs, scaling (rawMin/rawMax to engMin/engMax), poll rates (ms), live values, and data quality (Good/Bad/Stale/Uncertain).
- **OPC UA Browser (AppView.OPC_UA_BROWSER)**: Live hierarchical tree browser for connected OPC UA servers. Discovers objects, variables, namespaces, and node IDs, allowing one-click tag importing.
- **Driver Diagnostics (AppView.DRIVER_DIAGNOSTICS)**: Real-time driver health monitor. Tracks connection state, round-trip latency, packet error rates, consecutive failure counters, and stale tag monitors.
- **App Settings (AppView.SETTINGS)**: Global settings including Runtime PIN Protection (with configurable timeout), Theme Selection, Client Branding, Audio Alarm settings, and Auto-save intervals.
- **Backup & Restore (AppView.BACKUP)**: Full JSON configuration snapshot export/import, encrypted project packaging, and cloud sync backups.
- **Alarm Log & Historian**: IndexedDB persistent storage of all alarm trigger, acknowledgment, and resolution events with duration calculations.
- **Trend Historian**: High-speed indexed time-series historian for telemetry pens with historical range querying, statistical aggregation (MIN, MAX, AVG, LAST), and CSV/Excel export.

## 2. Industrial Communication Protocols
- **Siemens S7 (S7-300 / S7-400 / S7-1200 / S7-1500)**:
  - DB Addressing: DB1.DBX0.0 (Bit), DB1.DBB2 (Byte), DB1.DBW4 (Word), DB1.DBD8 (DWord/Float).
  - Rack / Slot configuration (Rack 0, Slot 1/2).
- **Modbus TCP / RTU**:
  - Register Types: Coils (FC 01/05), Discrete Inputs (FC 02), Holding Registers (FC 03/06/16), Input Registers (FC 04).
  - Data Types: Boolean, INT16, UINT16, INT32, UINT32, Float32 (IEEE 754), Double64, String.
  - Byte/Word Swapping: Big-Endian, Little-Endian, Word-Swapped (Mid-Endian) for 32-bit registers.
  - Configurable Slave ID / Unit ID, Timeout (ms), Retry Intervals.
- **OPC UA / OPC DA**:
  - Supports Security Modes (None, Sign, Sign & Encrypt) and Security Policies (Basic256Sha256, Aes128_Sha256_RsaOaep, etc.).
  - NodeId addressing (e.g. \`ns=2;s=Device1.Temperature\` or numeric \`ns=1;i=1001\`).
  - Browsing namespaces and subscribing to MonitoredItems.
- **Rockwell Allen Bradley (EtherNet/IP)**:
  - Native CIP Symbolic Tag Addressing (e.g. \`Line1_Infeed_Count\`, \`Program:MainProgram.Motor_Speed\`).
- **MQTT**:
  - Supports MQTT 3.1.1 and 5.0 protocols over WebSockets (\`ws://\` and \`wss://\`).
  - QoS Levels: QoS 0 (At most once), QoS 1 (At least once), QoS 2 (Exactly once).
  - Wildcards: Single-level (\`+\`) and Multi-level (\`#\`).
  - Payload Parsing: Plain numeric/text strings, JSON payloads with configurable JSONPath extraction.

## 3. Product Editions & User Roles
- **Community Edition**: Free demo mode (1 Dashboard, max 10 Widgets, max 5 Driver Tags).
- **Engineering Studio (Admin)**: Full unrestricted engineering mode with schema editing, driver creation, tag management, and full project configuration.
- **Client Runtime (Operator)**: Locked kiosk operator runtime with restricted navigation, hidden edit controls, and PIN protection.

## 4. OEE & Downtime Intelligence Architecture
- **TPM OEE Formulation**:
  - Availability (A) = (Operating Time / Planned Production Time) × 100
  - Performance (P) = (Ideal Cycle Time × Total Count) / Operating Time × 100
  - Quality (Q) = (Good Count / Total Count) × 100
  - Overall OEE % = (A × P × Q) / 10,000 (Target Benchmark >= 85.0%)
- **Rollover & Counter Safety**: Built-in monotonic accumulator (CumulativeDeltaTracker) protects against PLC 16-bit/32-bit counter resets and rollover spikes.
- **Anti-Chatter Filter**: 3-second debounce filter prevents noisy sensor flapping between discrete parts.
- **Pareto 80/20 Loss Decomposition**: Classifies downtime into Mechanical, Electrical, Material Shortage, Quality Inspection, Tooling Changeover, and Utility Failures.

## 5. Batch & Lot Traceability Architecture (FDA 21 CFR Part 11)
- **4-Stage Material & Process Genealogy**: Raw Inward Material Lots -> WIP Batch Operations -> Critical Process Parameters (CPPs) -> Finished Serialized Units with QR Payloads.
- **Bi-Directional Recall**:
  - Forward Recall: Takes a contaminated raw material lot number -> Identifies all affected finished goods and customer blast radius.
  - Backward Trace: Takes a finished customer unit serial number / QR payload -> Resolves manufacturing timestamps, operator, equipment, and supplier raw material provenance.
- **CoA Release Reports**: 1-click printable Certificates of Analysis with specification compliance tables and SHA-256 cryptographically validated electronic signatures.

## 6. Fault Detection & Diagnostics (FDD) & Predictive Maintenance
- **FDD Rule Engine**: Evaluates multi-variable boolean and threshold rules (e.g. \`Chiller.DischargeTemp > 85 && Chiller.WaterFlow < 25\`).
- **Financial Waste Rate ($/hr)**: Quantifies excess energy consumption (kW) and hourly financial cost impact for every active equipment fault.
- **AI Root Cause Analysis (RCA)**: Deep statistical evaluation of pre-fault 30-minute historian trends to diagnose probable root causes with confidence rankings and corrective SOP steps.
- **Predictive Maintenance & RUL**: Linear degradation slope (dX/dt) and remaining useful life (RUL) estimation.

## 7. AI 3D Asset Generation & 3D SCADA Studio Library Integration
- **Procedural 3D Asset Engine (Ai3dAssetService)**: When an operator asks the AI to create, design, or generate a 3D asset or equipment (e.g. pumps, extruders, bioreactors, distillation columns, robotic arms, conveyors, tanks, pressure vessels):
  1. The AI invokes the \`generate_3d_asset\` tool with realistic industrial dimensions ($W \times H \times D$), procedural geometric sub-components (boxes, cylinders, spheres, flanged ASME nozzles, hoppers, motor housings, skid bases), PBR materials, and real-time SCADA telemetry animation binding hooks.
  2. The generated asset is rendered in an interactive glassmorphism **3D Asset Preview Card** in the chat window with dimension specs, component counts, and an **"📥 Push to 3D Asset Library"** button.
  3. Pushed assets are stored in persistent storage (\`tasc_ai_3d_assets_v1\`) and immediately appear under the dedicated **"🤖 AI Assets"** tab in the 3D SCADA Studio equipment drawer (\`AssetLibrary3dPanel\`).
  4. Operators can click **"+ Add"** to spawn the AI-generated equipment directly into their active 3D digital twin viewport with full spatial transform gizmos and live PLC/MQTT tag bindings.
`;

