# TASC IIoT Studio

A full-stack Industrial Internet of Things (IIoT), SCADA/Web-HMI Canvas, and MQTT Dashboard Platform built with React 19, TypeScript, Express, Vite, and Tailwind CSS.

## 🌟 Key Features

- **24+ Industrial Panel Types**: Radial Gauges, Time-Series Trend Charts, Switches, Push Buttons, Sliders, LEDs, Pipe Flows, Multi-State Indicators, Shape Components, Clocks, Color Pickers, and Text Inputs.
- **Dual Visual Editors**:
  - **Bento Grid Layout**: Drag-and-drop responsive grid dashboard.
  - **Web HMI Canvas**: SCADA-style absolute positioning editor with screen jumps, pipe diagrams, and custom graphics.
- **Protocol Flexibility**:
  - Direct Browser WebSockets (`ws://`, `wss://`).
  - Integrated Backend TCP-to-WebSocket Bridge (`server.ts` `/api/mqtt-bridge`) enabling direct connections to standard TCP MQTT brokers (`1883`, `8883`).
- **Real-Time Alarm System**: Multi-zone threshold alarms (LOW, MID, HIGH) with real-time notification drawer and operator acknowledgements.
- **Client Runtime Packaging**: Export encrypted, PIN-protected dashboard packages for locked operator kiosks.
- **Product Editions**:
  - **Community Edition**: Open dashboard features.
  - **Engineering Edition**: Full editor, HMI canvas, topic tree inspector, and client package builder.
  - **Client Runtime**: Operator-focused read-only deployment mode.

## 🛠️ Architecture & Submodules

For detailed documentation on all individual components and utility submodules, see [docs/SUBMODULES.md](docs/SUBMODULES.md).

- **`server.ts`**: Express server & HTTP-WebSocket bridge routing TCP MQTT traffic and serving Vite frontend.
- **`src/components/`**: 29 modular React components replicating every view, modal, gauge, chart, and canvas control.
- **`src/utils/`**: Utility submodules for MQTT management, security hashing, topic trees, edition control, and theme configuration.

## 🚀 Running Locally

1. **Install dependencies**:
   ```bash
   npm install
   ```

2. **Development Mode**:
   ```bash
   npm run dev
   ```
   Access the app at `http://localhost:3000`.

3. **Production Build**:
   ```bash
   npm run build
   npm run start
   ```
