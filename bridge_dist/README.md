# ⚡ TASC Edge Bridge - Standalone Hardware Gateway for SCADA Engineers

This folder contains pre-built, ready-to-run Windows binaries for the **TASC Edge Bridge (Port 3000)**.
It allows web browsers on [app.tascautomation.com](https://app.tascautomation.com) to communicate directly with on-premise industrial PLCs, RTUs, and OPC servers.

---

## 📦 Available Downloads

| File | Type | Description | Size |
|---|---|---|---|
| **`TASC_Edge_Bridge_Setup.exe`** | **1-Click Windows Setup (Recommended)** | Standalone installer (built via Inno Setup). Installs embedded Node.js runtime, all industrial PLC drivers, and Windows System Tray companion. No Git or Node.js installation required. | ~73.5 MB |
| **`TascEdgeBridge.exe`** | **Portable Tray Companion** | Lightweight Windows GUI with live status indicators, minimize-to-tray on close `[X]`, and graceful process termination on right-click quit. | ~145 KB |

---

## 🚀 How to Run for PLC & SCADA Engineers

1. **Download & Run `TASC_Edge_Bridge_Setup.exe`**:
   - Double-click to install. It installs to your user profile / Program Files without requiring domain admin privileges.
   - At the end of the setup, leave **"Launch TASC Edge Bridge Now"** checked and click **Finish**.
2. **Observe System Tray**:
   - The TASC icon appears in your **Windows System Tray** (near the clock).
   - A notification will confirm: `TASC Edge Bridge Active - Listening on http://127.0.0.1:3000`.
3. **Minimize to Tray**:
   - When you close `[X]` the status window, the bridge **does NOT terminate**—it silently minimizes to the Windows System Tray so your SCADA polling is never interrupted.
4. **Clean Exit**:
   - When you need to fully stop the gateway, **right-click the tray icon** and select **"❌ Exit & Quit Bridge"**.

---

## 🔌 Supported Industrial Protocols

- **Modbus TCP / RTU** (Port 502 / RS-485 / RS-232 COM ports)
- **Siemens SIMATIC S7** (S7-300, S7-400, S7-1200, S7-1500 via ISO-on-TCP Port 102)
- **Mitsubishi MELSEC** (iQ-R, FX5U, Q, L via SLMP / MC 3E binary frames)
- **OPC UA & Classic OPC DA** (Port 4840 & COM/DCOM)
- **EtherNet/IP & CIP** (Allen-Bradley ControlLogix / CompactLogix / Micro800 via Port 44818)
- **MQTT TCP Bridge** (Port 1883)
