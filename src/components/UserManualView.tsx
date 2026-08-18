import React, { useState, useMemo } from 'react';
import { AppView } from '../types';

interface UserManualViewProps {
  onBack: () => void;
  onNavigate?: (view: AppView) => void;
  onOpenTour?: () => void;
}

interface Chapter {
  id: string;
  number: number;
  title: string;
  category: string;
  icon: string;
  summary: string;
  readTime: string;
  sections: {
    title: string;
    content: React.ReactNode;
  }[];
}

export const UserManualView: React.FC<UserManualViewProps> = ({
  onBack,
  onNavigate,
  onOpenTour
}) => {
  const [selectedChapterId, setSelectedChapterId] = useState<string>('ch1');
  const [searchQuery, setSearchQuery] = useState<string>('');

  const chapters: Chapter[] = useMemo(() => [
    {
      id: 'ch1',
      number: 1,
      title: 'Getting Started & System Architecture',
      category: 'Fundamentals',
      icon: 'fa-book-open',
      readTime: '4 min',
      summary: 'High-level overview of TASC IIoT Studio, zero-install web execution, browser-based offline storage, and end-to-end industrial data flow.',
      sections: [
        {
          title: '1.1 System Overview & Philosophy',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                <strong>TASC IIoT Studio</strong> is a next-generation, high-performance Industrial Human-Machine Interface (HMI) and Supervisory Control and Data Acquisition (SCADA) platform. Unlike legacy desktop SCADA applications that require cumbersome client installations, database servers, and license dongles, TASC Studio runs entirely inside modern web browsers with zero installation.
              </p>
              
              {/* Annotated Visual Schematic */}
              <div className="my-4 p-4 bg-slate-950 border border-slate-800 rounded-2xl">
                <div className="text-[11px] font-bold text-sky-400 uppercase tracking-wider mb-2 flex items-center space-x-1.5">
                  <i className="fas fa-diagram-project"></i>
                  <span>Architecture Schematic: End-to-End Industrial Data Flow</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 text-center text-[11px] font-mono">
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="inline-block w-5 h-5 rounded-full bg-sky-500 text-slate-950 font-bold mb-1">❶</span>
                    <div className="font-bold text-white">Physical Hardware</div>
                    <div className="text-[10px] text-slate-400 mt-1">PLCs, VFDs, Sensors, Power Meters</div>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="inline-block w-5 h-5 rounded-full bg-indigo-500 text-white font-bold mb-1">❷</span>
                    <div className="font-bold text-white">Driver Bridge</div>
                    <div className="text-[10px] text-slate-400 mt-1">Modbus TCP/RTU, OPC UA, MQTT</div>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="inline-block w-5 h-5 rounded-full bg-amber-500 text-slate-950 font-bold mb-1">❸</span>
                    <div className="font-bold text-white">TASC Core Engine</div>
                    <div className="text-[10px] text-slate-400 mt-1">FDD Engine, Alarms, Trend Historian</div>
                  </div>
                  <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl">
                    <span className="inline-block w-5 h-5 rounded-full bg-emerald-500 text-slate-950 font-bold mb-1">❹</span>
                    <div className="font-bold text-white">HMI Visualization</div>
                    <div className="text-[10px] text-slate-400 mt-1">Bento Grid, SCADA Canvas, AI Copilot</div>
                  </div>
                </div>
              </div>

              <div className="p-3.5 bg-indigo-950/40 border-l-4 border-indigo-500 rounded-r-xl space-y-1">
                <div className="font-bold text-indigo-300 text-xs flex items-center space-x-1.5">
                  <i className="fas fa-info-circle"></i>
                  <span>NOTE: Zero External Database Requirement</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  TASC Studio utilizes high-performance browser <strong>IndexedDB</strong> for multi-year time-series historian logging and <strong>localStorage</strong> for project schemas. No external SQL Server or cloud database is required.
                </p>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch2',
      number: 2,
      title: 'SCADA Dashboard & Web HMI Canvas',
      category: 'HMI & Design',
      icon: 'fa-microchip',
      readTime: '6 min',
      summary: 'Comprehensive guide to building industrial screens, modular Bento Grid widgets, freeform Web HMI canvases, animated SVG symbols, and multi-screen navigation.',
      sections: [
        {
          title: '2.1 Bento Grid vs Absolute SCADA Canvas',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                TASC Studio features two complementary visualization paradigms to suit every operational scenario:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <i className="fas fa-table-cells-large text-sky-400"></i>
                    <span>1. Modular Bento Grid</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Auto-arranging card layout optimized for clean telemetry overviews, multi-variable dashboards, responsive tablet scaling, and quick drag-and-drop sizing.
                  </p>
                </div>
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <div className="font-bold text-white flex items-center space-x-1.5">
                    <i className="fas fa-draw-polygon text-emerald-400"></i>
                    <span>2. Freeform SCADA Canvas</span>
                  </div>
                  <p className="text-[11px] text-slate-400">
                    Pixel-precise engineering canvas allowing arbitrary widget placement, animated fluid pipes, custom factory floorplans, and industrial symbol graphics.
                  </p>
                </div>
              </div>

              {/* Schematic of Canvas Controls */}
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  <i className="fas fa-layer-group mr-1"></i> Interactive Visual Widgets & Symbols
                </div>
                <ul className="grid grid-cols-2 sm:grid-cols-3 gap-2 text-[11px] font-mono text-slate-300">
                  <li className="p-2 bg-slate-900 rounded-lg border border-slate-850">❶ Circular & Radial Gauges</li>
                  <li className="p-2 bg-slate-900 rounded-lg border border-slate-850">❷ Animated Fluid Pipes</li>
                  <li className="p-2 bg-slate-900 rounded-lg border border-slate-850">❸ Tank Liquid Level Bars</li>
                  <li className="p-2 bg-slate-900 rounded-lg border border-slate-850">❹ Rotating Pumps & Fans</li>
                  <li className="p-2 bg-slate-900 rounded-lg border border-slate-850">❺ Multi-State Push Buttons</li>
                  <li className="p-2 bg-slate-900 rounded-lg border border-slate-850">❻ Screen Jump Navigation</li>
                </ul>
              </div>

              <div className="p-3.5 bg-emerald-950/40 border-l-4 border-emerald-500 rounded-r-xl space-y-1">
                <div className="font-bold text-emerald-300 text-xs flex items-center space-x-1.5">
                  <i className="fas fa-lightbulb"></i>
                  <span>TIP: Touchscreen & Kiosk Auto-Fit</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  Click the <strong>Fullscreen</strong> icon in the top right to enter kiosk mode. On Web HMI screens, click <strong>Restore Fit</strong> to automatically zoom and center all graphics to your display resolution.
                </p>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch3',
      number: 3,
      title: 'Industrial Communication Protocols',
      category: 'Connectivity',
      icon: 'fa-plug-circle-bolt',
      readTime: '7 min',
      summary: 'Deep-dive into Modbus TCP/RTU register addressing, byte/word endianness swapping, OPC UA security certificates, and MQTT WebSockets.',
      sections: [
        {
          title: '3.1 Modbus TCP & RTU Protocol Guide',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                Modbus is the most widely adopted open industrial standard. TASC Studio communicates with Modbus devices over Ethernet (Modbus TCP) or USB/RS-485 Serial (Modbus RTU via Node.js Bridge).
              </p>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-[11px]">
                  <thead>
                    <tr className="border-b border-slate-800 text-slate-400 bg-slate-950">
                      <th className="p-2 font-bold">Register Type</th>
                      <th className="p-2 font-bold">Function Code</th>
                      <th className="p-2 font-bold">Access</th>
                      <th className="p-2 font-bold">Typical Industrial Usage</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-850">
                    <tr>
                      <td className="p-2 font-mono text-sky-300">Discrete Inputs</td>
                      <td className="p-2 font-mono">FC 02</td>
                      <td className="p-2 text-slate-400">Read-Only</td>
                      <td className="p-2">Physical limit switches, safety interlocks</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-sky-300">Coils</td>
                      <td className="p-2 font-mono">FC 01, 05, 15</td>
                      <td className="p-2 text-emerald-400">Read/Write</td>
                      <td className="p-2">Relay outputs, solenoid valves, start/stop commands</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-sky-300">Input Registers</td>
                      <td className="p-2 font-mono">FC 04</td>
                      <td className="p-2 text-slate-400">Read-Only</td>
                      <td className="p-2">Analog input sensors (temperature, pressure)</td>
                    </tr>
                    <tr>
                      <td className="p-2 font-mono text-sky-300">Holding Registers</td>
                      <td className="p-2 font-mono">FC 03, 06, 16</td>
                      <td className="p-2 text-emerald-400">Read/Write</td>
                      <td className="p-2">Setpoints, configuration parameters, energy totalizers</td>
                    </tr>
                  </tbody>
                </table>
              </div>

              <div className="p-3.5 bg-amber-950/40 border-l-4 border-amber-500 rounded-r-xl space-y-1">
                <div className="font-bold text-amber-300 text-xs flex items-center space-x-1.5">
                  <i className="fas fa-triangle-exclamation"></i>
                  <span>IMPORTANT: 32-Bit Word & Byte Swapping</span>
                </div>
                <p className="text-[11px] text-slate-300">
                  When reading 32-bit Float or Integer registers, PLCs differ in byte order. If readings appear as astronomical numbers (e.g. <code>1.45e38</code>), change the <strong>Byte Swap Mode</strong> in Driver Tag settings between <em>Big-Endian</em>, <em>Little-Endian</em>, or <em>Word-Swapped (Mid-Endian)</em>.
                </p>
              </div>
            </div>
          )
        },
        {
          title: '3.2 OPC UA Hierarchical Address Space',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                OPC Unified Architecture (OPC UA) provides encrypted, object-oriented telemetry. Open the <strong>OPC UA Browser</strong> in the sidebar to view connected server folders, objects, variables, and Node IDs, allowing one-click tag importing.
              </p>
              <div className="p-3 bg-slate-950 font-mono text-[11px] text-indigo-350 border border-slate-800 rounded-xl">
                Example NodeId: <code>ns=2;s=Device1.Boiler.SteamTemperature</code>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch4',
      number: 4,
      title: 'Driver & MQTT Tag Management',
      category: 'Data Management',
      icon: 'fa-tags',
      readTime: '5 min',
      summary: 'Formula-based engineering unit scaling, poll rate tuning, data quality flags (Good/Bad/Stale/Offline), and MQTT JSONPath extraction.',
      sections: [
        {
          title: '4.1 Engineering Unit Scaling',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                Industrial PLC registers often store raw analog counts (e.g., <code>0 to 4095</code> for 12-bit ADC). The Driver Tag Manager allows linear scaling into human-readable engineering units:
              </p>
              <div className="p-3 bg-slate-950 font-mono text-[11px] border border-slate-800 rounded-xl space-y-1 text-slate-300">
                <div>Formula: <code>ScaledValue = ((Raw - RawMin) / (RawMax - RawMin)) * (EngMax - EngMin) + EngMin</code></div>
                <div className="text-sky-400">Example: Raw 0-4095 counts &rarr; Scaled 0.0 to 100.0 °C</div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch5',
      number: 5,
      title: 'Real-Time Alarms & Safety Trip Interlocks',
      category: 'Safety & Alarms',
      icon: 'fa-bell',
      readTime: '6 min',
      summary: 'Inbuilt parameter threshold alerts, emergency trip interlocks, audible sirens, operator acknowledgment lifecycle, and Alarm Historian auditing.',
      sections: [
        {
          title: '5.1 Alarm Thresholds & Trip Evaluation',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                TASC Studio evaluates alarms continuously on every incoming telemetry packet.
              </p>
              <ul className="space-y-2">
                <li className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <strong className="text-red-400">❶ Equipment Trip Tag Alarms:</strong> Dedicated digital interlock tags linked to motor overloads, E-Stop buttons, or circuit breakers. Tripping instantly locks the widget in red and sounds the audio siren.
                </li>
                <li className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <strong className="text-amber-400">❷ Parameter Threshold Alarms:</strong> High-High (HH), High (H), Low (L), and Low-Low (LL) bounds configured in widget properties.
                </li>
                <li className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <strong className="text-emerald-400">❸ Operator Acknowledgment:</strong> Operators can silence sirens and acknowledge alarms. The timestamp, duration, and operator name are permanently archived in the <strong>Alarm Historian</strong>.
                </li>
              </ul>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch6',
      number: 6,
      title: 'High-Performance Trend Historian',
      category: 'Historian & Analytics',
      icon: 'fa-chart-line',
      readTime: '6 min',
      summary: 'Multi-year IndexedDB offline time-series logging, Largest-Triangle-Three-Buckets (LTTB) decimation downsampling, and CSV/Excel export.',
      sections: [
        {
          title: '6.1 IndexedDB Storage & Portability',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                The Trend Historian logs high-speed time-series telemetry into partitioned browser storage with up to 50 GB capacity on PC.
              </p>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-sky-400">LTTB (Largest-Triangle-Three-Buckets) Downsampling:</div>
                <p className="text-[11px] text-slate-300">
                  When querying months or years of historical data, LTTB decimates millions of raw data points down to 1,000 visual pixels without flattening sharp operational peaks or fault spikes.
                </p>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch7',
      number: 7,
      title: 'Fault Detection & Diagnostics (FDD) & Predictive Maintenance',
      category: 'Predictive Maintenance',
      icon: 'fa-shield-halved',
      readTime: '8 min',
      summary: 'Industrial multi-variable Boolean rule engine, debounce timing, financial energy waste tracking ($/hr or ₹/hr), AI Root Cause Analysis, and Work Orders.',
      sections: [
        {
          title: '7.1 Multi-Variable FDD Rule Logic',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                Simple threshold alarms only monitor one sensor at a time. <strong>FDD</strong> monitors complex multi-sensor relationships to catch subtle equipment degradation before catastrophic failure occurs.
              </p>

              {/* Annotated FDD Logic Card */}
              <div className="p-4 bg-slate-950 border border-slate-800 rounded-2xl space-y-2">
                <div className="text-[11px] font-bold text-amber-400 uppercase tracking-wider">
                  <i className="fas fa-code-branch mr-1"></i> Multi-Variable Expression Grammar
                </div>
                <div className="p-3 bg-slate-900 font-mono text-sky-300 text-xs rounded-xl border border-slate-800">
                  Chiller.DischargeTemp &gt; 85 &amp;&amp; Chiller.WaterFlow &lt; 25
                </div>
                <p className="text-[11px] text-slate-400">
                  Evaluates whether the chiller discharge temperature exceeds 85°C while chilled water flow rate is below 25 m³/h for more than 5 seconds (debounce).
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="font-bold text-amber-300">Financial Waste Rate ($/hr)</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Every active fault calculates excess kilowatt consumption multiplied by the plant energy tariff, giving management immediate visibility of operational losses.
                  </div>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                  <div className="font-bold text-indigo-300">AI Root Cause Analysis (RCA)</div>
                  <div className="text-[11px] text-slate-400 mt-1">
                    Evaluates pre-fault 30-minute historical trends to output ranked probable causes, confidence scores, and immediate corrective actions.
                  </div>
                </div>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch8',
      number: 8,
      title: 'AI Industrial Copilot & Natural Language Tools',
      category: 'AI Assistant',
      icon: 'fa-wand-magic-sparkles',
      readTime: '6 min',
      summary: 'Configuring AI providers (NVIDIA NIM, Google Gemini, Ollama, LM Studio), real-time tool calling, speech dictation, and vision blueprint analysis.',
      sections: [
        {
          title: '8.1 AI Copilot Integration',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                The AI Industrial Copilot has real-time tool access to query live tag values, check active alarms, analyze FDD faults, and schedule work orders.
              </p>
              <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                <div className="font-bold text-sky-400">Supported AI Providers:</div>
                <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                  <li><strong>NVIDIA NIM / Custom OpenAI Endpoint:</strong> High-performance enterprise GPU inference.</li>
                  <li><strong>Google AI Studio (Gemini 2.5 / 1.5):</strong> Deep reasoning and visual blueprint analysis.</li>
                  <li><strong>Ollama & LM Studio:</strong> 100% air-gapped on-premise local LLM execution.</li>
                </ul>
              </div>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch9',
      number: 9,
      title: 'Security, Operator Safeguards & Runtime PIN',
      category: 'Security',
      icon: 'fa-shield-halved',
      readTime: '5 min',
      summary: 'Setting runtime PIN safeguards, idle auto-lock timeouts, user roles (Admin vs Operator Client vs Free Community), and kiosk restrictions.',
      sections: [
        {
          title: '9.1 Runtime PIN Protection',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                To prevent accidental touches on factory floor touchscreens, TASC Studio allows locking control switches and setpoints behind a 4-digit PIN with a configurable idle timeout (e.g. 2 minutes).
              </p>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch10',
      number: 10,
      title: 'Backup, Portability & Standalone Client Packages',
      category: 'Deployment',
      icon: 'fa-cloud-arrow-up',
      readTime: '4 min',
      summary: 'Exporting JSON configuration snapshots, encrypted client deployment packaging, and zero-cloud local execution.',
      sections: [
        {
          title: '10.1 Standalone Client Packages',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <p>
                Admins can package their entire SCADA project into an encrypted client file for deployment to factory floor tablets or customer sites with locked edit permissions.
              </p>
            </div>
          )
        }
      ]
    },
    {
      id: 'ch11',
      number: 11,
      title: 'Troubleshooting & Common Industrial FAQs',
      category: 'Support',
      icon: 'fa-circle-question',
      readTime: '5 min',
      summary: 'Resolving Modbus connection timeouts, OPC UA security errors, browser memory caps, and MQTT WebSocket connectivity issues.',
      sections: [
        {
          title: '11.1 Frequently Encountered Issues',
          content: (
            <div className="space-y-3 text-xs leading-relaxed text-slate-300">
              <div className="space-y-2">
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <strong className="text-amber-300">Q: Modbus driver connects, but tag values show "NaN" or offline?</strong>
                  <p className="text-[11px] text-slate-400">
                    Check the Slave ID, Register Offset (0-based vs 1-based), and ensure the Node.js serial/TCP driver server is running.
                  </p>
                </div>
                <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl space-y-1">
                  <strong className="text-amber-300">Q: FDD / CBM button is not visible?</strong>
                  <p className="text-[11px] text-slate-400">
                    FDD is an advanced engineering capability designed for Desktop PCs. On mobile phones, it is automatically parked to preserve battery and memory.
                  </p>
                </div>
              </div>
            </div>
          )
        }
      ]
    }
  ], []);

  // Filtered chapters based on search query
  const filteredChapters = useMemo(() => {
    if (!searchQuery.trim()) return chapters;
    const query = searchQuery.toLowerCase();
    return chapters.filter(c =>
      c.title.toLowerCase().includes(query) ||
      c.summary.toLowerCase().includes(query) ||
      c.category.toLowerCase().includes(query)
    );
  }, [chapters, searchQuery]);

  const activeChapter = chapters.find(c => c.id === selectedChapterId) || chapters[0];
  const activeIndex = chapters.findIndex(c => c.id === activeChapter.id);
  const prevChapter = activeIndex > 0 ? chapters[activeIndex - 1] : null;
  const nextChapter = activeIndex < chapters.length - 1 ? chapters[activeIndex + 1] : null;

  return (
    <div className="flex flex-col h-full bg-slate-950 text-slate-100 font-sans overflow-hidden">
      
      {/* Top Header Bar */}
      <header className="bg-slate-900/90 border-b border-slate-800 px-4 sm:px-6 py-3.5 flex flex-wrap items-center justify-between gap-3 shrink-0 shadow-md">
        <div className="flex items-center space-x-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer border border-slate-700"
            title="Return to Dashboard"
          >
            <i className="fas fa-arrow-left text-sm"></i>
          </button>
          <div>
            <div className="flex items-center space-x-2">
              <h1 className="text-base font-bold text-white tracking-wide">
                TASC IIoT Studio — Engineering User Manual & Handbook
              </h1>
              <span className="px-2 py-0.5 text-[10px] font-mono font-bold bg-sky-900/60 border border-sky-500/50 text-sky-300 rounded-md uppercase">
                v3.5 Official
              </span>
            </div>
            <p className="text-xs text-slate-400">
              Interactive indexed user documentation, architectural schematics, and operational SOPs.
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          {onOpenTour && (
            <button
              type="button"
              onClick={onOpenTour}
              className="px-3.5 py-1.5 bg-gradient-to-r from-amber-600/20 to-indigo-600/20 hover:from-amber-600/30 hover:to-indigo-600/30 border border-amber-500/40 text-amber-300 text-xs font-semibold rounded-xl transition-colors flex items-center space-x-1.5 cursor-pointer shadow-sm"
            >
              <i className="fas fa-wand-magic-sparkles text-amber-400"></i>
              <span>Launch Quick Tour</span>
            </button>
          )}
          <button
            type="button"
            onClick={() => window.print()}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white text-xs font-semibold rounded-xl border border-slate-700 transition-colors flex items-center space-x-1.5 cursor-pointer"
            title="Print or Save PDF"
          >
            <i className="fas fa-print"></i>
            <span className="hidden sm:inline">Print Manual</span>
          </button>
        </div>
      </header>

      {/* Main Body: Sidebar Index + Reader Pane */}
      <div className="flex-1 flex overflow-hidden">
        
        {/* Left Sticky Table of Contents */}
        <aside className="w-72 sm:w-80 bg-slate-900/80 border-r border-slate-800 flex flex-col shrink-0 overflow-y-auto">
          {/* Search Box */}
          <div className="p-3.5 border-b border-slate-800/80">
            <div className="relative">
              <i className="fas fa-search absolute left-3 top-2.5 text-xs text-slate-500"></i>
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search manual topics, protocols..."
                className="w-full bg-slate-950 border border-slate-750 rounded-xl pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-sky-500"
              />
            </div>
          </div>

          {/* Chapter Links */}
          <nav className="p-2 space-y-1 flex-1">
            {filteredChapters.map((ch) => {
              const isSelected = ch.id === activeChapter.id;
              return (
                <button
                  key={ch.id}
                  type="button"
                  onClick={() => setSelectedChapterId(ch.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all cursor-pointer flex items-start space-x-3 ${
                    isSelected
                      ? 'bg-sky-500/15 border border-sky-500/40 text-white shadow-sm'
                      : 'hover:bg-slate-800/50 text-slate-400 hover:text-slate-200 border border-transparent'
                  }`}
                >
                  <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 mt-0.5 ${
                    isSelected ? 'bg-sky-500 text-slate-950 font-bold' : 'bg-slate-800 text-slate-400'
                  }`}>
                    <i className={`fas ${ch.icon} text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-[10px] font-mono mb-0.5">
                      <span className={isSelected ? 'text-sky-300 font-bold' : 'text-slate-500'}>Chapter {ch.number}</span>
                      <span className="text-slate-500">{ch.readTime}</span>
                    </div>
                    <h4 className="text-xs font-semibold text-slate-200 truncate">{ch.title}</h4>
                  </div>
                </button>
              );
            })}
          </nav>
        </aside>

        {/* Right Main Reader Content Pane */}
        <main className="flex-1 overflow-y-auto p-6 sm:p-10 max-w-4xl space-y-8">
          
          {/* Breadcrumb & Chapter Title */}
          <div className="space-y-2 border-b border-slate-800 pb-6">
            <div className="flex items-center space-x-2 text-xs text-slate-500 font-mono">
              <span>TASC Manual</span>
              <span>&gt;</span>
              <span className="text-sky-400 font-bold">Chapter {activeChapter.number}</span>
              <span>&gt;</span>
              <span className="text-slate-400">{activeChapter.category}</span>
            </div>
            
            <div className="flex items-center space-x-3">
              <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/30 text-sky-400 flex items-center justify-center text-xl shadow-inner shrink-0">
                <i className={`fas ${activeChapter.icon}`}></i>
              </div>
              <div>
                <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
                  Chapter {activeChapter.number}: {activeChapter.title}
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 mt-1">
                  {activeChapter.summary}
                </p>
              </div>
            </div>
          </div>

          {/* Chapter Content Sections */}
          <div className="space-y-8">
            {activeChapter.sections.map((section, idx) => (
              <section key={idx} className="space-y-3">
                <h3 className="text-sm sm:text-base font-bold text-white border-l-2 border-sky-500 pl-3">
                  {section.title}
                </h3>
                <div>
                  {section.content}
                </div>
              </section>
            ))}
          </div>

          {/* Bottom Pagination Footer */}
          <div className="pt-8 border-t border-slate-800 flex flex-wrap items-center justify-between gap-4">
            {prevChapter ? (
              <button
                type="button"
                onClick={() => setSelectedChapterId(prevChapter.id)}
                className="px-4 py-2.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors cursor-pointer flex items-center space-x-2"
              >
                <i className="fas fa-arrow-left text-sky-400"></i>
                <div className="text-left">
                  <div className="text-[10px] text-slate-500">Previous Chapter</div>
                  <div>Ch {prevChapter.number}: {prevChapter.title}</div>
                </div>
              </button>
            ) : <div />}

            {nextChapter ? (
              <button
                type="button"
                onClick={() => setSelectedChapterId(nextChapter.id)}
                className="px-4 py-2.5 bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold rounded-xl text-xs transition-colors cursor-pointer flex items-center space-x-2 shadow-lg shadow-sky-500/20"
              >
                <div className="text-right">
                  <div className="text-[10px] text-slate-900/80">Next Chapter</div>
                  <div>Ch {nextChapter.number}: {nextChapter.title}</div>
                </div>
                <i className="fas fa-arrow-right"></i>
              </button>
            ) : <div />}
          </div>

        </main>
      </div>

    </div>
  );
};
