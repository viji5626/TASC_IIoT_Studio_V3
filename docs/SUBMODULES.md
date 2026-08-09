# TASC IIoT Studio - Submodule & Component Documentation

Welcome to **TASC IIoT Studio**, a comprehensive Industrial Internet of Things (IIoT), SCADA/Web-HMI, and MQTT Dashboard platform. This repository is structured into modular submodules and components designed for industrial visual canvas design, live MQTT message routing, client runtime packaging, and SCADA dashboard generation.

---

## 🏗️ Architecture Overview

The system consists of three main architecture layers:
1. **Frontend Core (React 19 + TypeScript + Vite + Tailwind CSS)**: Renders drag-and-drop Bento Grids, absolute SCADA Web HMI canvas views, real-time gauges, line graphs, and control components.
2. **Backend Server (`server.ts`)**: Express server providing health checks, TCP MQTT test utilities, and a WebSocket-to-TCP bridge (`/api/mqtt-bridge`) allowing browser client applications to communicate directly with native TCP MQTT brokers (`1883`, `8883`).
3. **Edition & Security Engine (`src/utils/`)**: Product edition management (Community, Engineering, Client Runtime), payload formatting, PIN security, and package encryption.

---

## 📦 Core Submodules (`src/utils/`)

### 1. `EditionManager.ts`
* **Role**: Manages application runtime modes and product editions.
* **Supported Editions**:
  * `COMMUNITY`: Open-source community dashboard features.
  * `ENGINEERING`: Full engineering suite including Web HMI canvas editor, client packaging, and full topic manager.
  * `CLIENT_RUNTIME`: Locked operator runtime mode with optional PIN protection and read-only canvas.
* **Key Functions**:
  * `getEdition()`: Reads current product edition.
  * `setEdition(edition)`: Switches active edition and persists to local storage.
  * `isFeatureAllowed(feature)`: Guards restricted features based on role/edition.

### 2. `mqttHelper.ts`
* **Role**: Handles real-time MQTT client lifecycle, topic subscriptions, message routing, and automatic failover.
* **Features**:
  * Native WebSocket connection support (`ws://`, `wss://`).
  * Seamless backend TCP bridge integration (`ws://localhost:3000/api/mqtt-bridge?target=tcp://host:port`) for native TCP brokers.
  * Automatic topic prefix prepending.
  * Global message log buffer for debugging.
* **Key Functions**:
  * `connectMqtt(connectionConfig)`: Initializes MQTT client.
  * `subscribeTopic(topic)` / `unsubscribeTopic(topic)`: Dynamic subscription management.
  * `publishMessage(topic, payload, qos, retain)`: Transmits MQTT packets with JSON formatting support.

### 3. `clientSecurity.ts`
* **Role**: Provides cryptographic hashing, client package locking, and PIN validation.
* **Key Functions**:
  * `hashPin(pin)`: Creates secure hash for engineering unlock PINs.
  * `verifyPin(pin, storedHash)`: Validates operator input against stored credentials.
  * `exportSignedPackage(state, pin)`: Packages dashboards into an encrypted client runtime JSON payload.

### 4. `topicManager.ts`
* **Role**: Industrial MQTT topic tree parser and wildcard evaluator.
* **Key Functions**:
  * `parseTopicTree(messages)`: Constructs a nested hierarchy tree from active MQTT topic strings.
  * `matchTopicWildcard(pattern, topic)`: Evaluates single-level (`+`) and multi-level (`#`) MQTT wildcards.

### 5. `theme.ts`
* **Role**: Styling tokens, color scales, and theme switchers for industrial high-contrast and dark-mode displays.

---

## 🎨 UI Component Replicas (`src/components/`)

### 1. `LandingPage.tsx`
* **Purpose**: Entry landing screen allowing users to pick between Community Edition, Engineering Edition, and Client Runtime.

### 2. `Sidebar.tsx`
* **Purpose**: Main navigation sidebar for switching views between Dashboards, Connections, Web HMI Canvas, Topic Manager, Backup & Settings.

### 3. `BentoGrid.tsx`
* **Purpose**: Drag-and-drop dashboard panel grid container built on `@dnd-kit`. Supports responsive col/row spans and grid reordering.

### 4. `WebHmiCanvasView.tsx`
* **Purpose**: Industrial SCADA/HMI canvas view. Enables absolute positioning, pipe rendering, status indicators, screen jumping, and visual diagram building.

### 5. `PanelCard.tsx`
* **Purpose**: Primary dispatcher component rendering 24+ industrial widget types (Gauges, LEDs, Switches, Sliders, Line Graphs, Clocks, Pipes, Text Inputs, Color Pickers, Combo Boxes, Multi-State indicators, etc.).

### 6. `Gauge.tsx`
* **Purpose**: High-precision SVG radial gauge component with dynamic arcs, min/max thresholds, unit formatting, and alarm color shifts.

### 7. `LineGraph.tsx`
* **Purpose**: Time-series trend chart component for streaming MQTT numeric values over time with customizable line thickness and pen colors.

### 8. `AddConnectionView.tsx`
* **Purpose**: Management interface for MQTT connections (Broker IP/URL, Port, Client ID, KeepAlive, AutoConnect, Clean Session, Username/Password).

### 9. `AddDashboardView.tsx`
* **Purpose**: Creator modal for new dashboards with theme color presets, topic prefix rules, and icon selectors.

### 10. `AddPanelModal.tsx` & `EditPanelModal.tsx`
* **Purpose**: Configuration modals for creating and editing widgets. Configures MQTT topics, payload JSON paths, multiplier factors, thresholds, and alarm messages.

### 11. `TopicManagerView.tsx`
* **Purpose**: Real-time topic tree inspector and test message publisher with live packet counter.

### 12. `MqttLogDrawer.tsx`
* **Purpose**: Slide-out drawer displaying streaming MQTT logs with payload formatting, filter-by-topic, and copy-to-clipboard.

### 13. `AlarmModal.tsx`
* **Purpose**: Real-time active alarm drawer notifying operators of LOW, MID, or HIGH threshold breaches with acknowledgement controls.

### 14. `ExportClientPackageModal.tsx`
* **Purpose**: Standalone runtime packager that builds downloadable `.json` runtime packages locked with a PIN for deployment on factory floor client terminals.

### 15. `ClientGateView.tsx` & `PinModal.tsx`
* **Purpose**: Access control gate screens requiring PIN authorization to unlock engineering/edit modes on client terminals.

### 16. `BackupRestoreView.tsx`
* **Purpose**: Full system state backup and restore view enabling easy migration of all connections, dashboards, panels, and HMI canvas layouts.

### 17. `SettingsView.tsx`
* **Purpose**: System setup view for changing themes, user roles, backend TCP bridge health verification, and default connection defaults.

### 18. `ShareConnectionModal.tsx`
* **Purpose**: QR-code and link generator for sharing connection credentials across team members.

### 19. `EngineeringChoiceModal.tsx`
* **Purpose**: Mode toggle modal between Standard Grid Dashboards and Web HMI Canvas Layouts.

### 20. `ColorPicker.tsx`, `IconPicker.tsx`, `KeypadModal.tsx`
* **Purpose**: Touchscreen-optimized input helpers for color selection, Lucide icon browsing, and numeric keypad PIN entry.

---

## 🚀 Local Deployment & Verification

1. **Development Server**:
   ```bash
   npm run dev
   ```
   Boots the Express backend and Vite frontend on `http://0.0.0.0:3000`.

2. **Production Build**:
   ```bash
   npm run build
   ```
   Bundles Vite static assets and compiles `server.ts` to `dist/server.cjs` via `esbuild`.

3. **Start Production**:
   ```bash
   npm run start
   ```
