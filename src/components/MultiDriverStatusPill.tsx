import React, { useState, useRef, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { MqttConnection, DriverConnection } from '../types';

export interface DriverStatusItem {
  id: string;
  name: string;
  protocol: string;
  protocolType: 'mqtt' | 'modbus_tcp' | 'modbus_rtu' | 'opcua' | 's7' | 'custom';
  endpoint: string;
  status: 'connected' | 'connecting' | 'disconnected' | 'simulated';
  lastError?: string;
  lastConnectedAt?: string;
  lastDisconnectedAt?: string;
  isMqtt?: boolean;
}

interface MultiDriverStatusPillProps {
  mqttConnection?: MqttConnection;
  allMqttConnections?: MqttConnection[];
  mqttConnected: boolean;
  isSimulated?: boolean;
  driverConnections?: DriverConnection[];
  isClient?: boolean;
  onOpenMqttSettings?: () => void;
  onOpenDriverConnections?: () => void;
}

export const MultiDriverStatusPill: React.FC<MultiDriverStatusPillProps> = ({
  mqttConnection,
  allMqttConnections = [],
  mqttConnected,
  isSimulated = false,
  driverConnections = [],
  isClient = false,
  onOpenMqttSettings,
  onOpenDriverConnections
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const popoverRef = useRef<HTMLDivElement>(null);
  const [popoverCoords, setPopoverCoords] = useState<{ top: number; left: number }>({ top: 0, left: 0 });

  // Update popup coordinates based on button's bounding rectangle
  const updateCoords = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const popoverWidth = Math.min(380, window.innerWidth - 24);
      let left = rect.left;
      if (left + popoverWidth > window.innerWidth - 12) {
        left = Math.max(12, window.innerWidth - popoverWidth - 12);
      }
      setPopoverCoords({
        top: rect.bottom + 6,
        left
      });
    }
  };

  // Close dropdown on outside click or Escape key, and update on resize/scroll
  useEffect(() => {
    if (!isOpen) return;

    updateCoords();

    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (
        buttonRef.current && !buttonRef.current.contains(target) &&
        popoverRef.current && !popoverRef.current.contains(target)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };

    const handleScrollResize = () => {
      updateCoords();
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleScrollResize);
    window.addEventListener('scroll', handleScrollResize, true);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleScrollResize);
      window.removeEventListener('scroll', handleScrollResize, true);
    };
  }, [isOpen]);

  // Aggregate all configured communication drivers (MQTT + Industrial Drivers)
  const driverItems: DriverStatusItem[] = useMemo(() => {
    const items: DriverStatusItem[] = [];

    // 1. MQTT Broker Connection (if configured)
    const activeMqtt = mqttConnection || (allMqttConnections && allMqttConnections[0]);
    const brokerAddress = (activeMqtt as any)?.brokerAddress || (activeMqtt as any)?.brokerUrl || '';
    const connName = (activeMqtt as any)?.connectionName || (activeMqtt as any)?.name || 'MQTT Broker';
    const isMqttConfigured = Boolean(
      activeMqtt && (Boolean(brokerAddress.trim()) || Boolean(connName.trim()) || allMqttConnections.length > 0)
    );

    if (isMqttConfigured && activeMqtt) {
      const proto = activeMqtt.protocol || 'WebSocket';
      const port = activeMqtt.port || 8083;
      const endpoint = `${proto} • ${brokerAddress || 'localhost'}:${port}`;
      items.push({
        id: activeMqtt.connectionId || 'mqtt_main',
        name: connName,
        protocol: 'MQTT',
        protocolType: 'mqtt',
        endpoint,
        status: isSimulated ? 'simulated' : mqttConnected ? 'connected' : 'disconnected',
        isMqtt: true
      });
    }

    // 2. Industrial Driver Connections (Modbus TCP, RTU, OPC UA, S7, etc.)
    const enabledDrivers = (driverConnections || []).filter(d => d.enabled !== false);
    for (const d of enabledDrivers) {
      let endpoint = '';
      let protocolType: DriverStatusItem['protocolType'] = 'custom';
      const proto = (d.protocol || '').toLowerCase();

      if (proto.includes('opcua') || proto.includes('opc')) {
        protocolType = 'opcua';
        endpoint = d.endpointUrl || `opc.tcp://${d.host || '127.0.0.1'}:${d.port || 4840}`;
      } else if (proto.includes('rtu') || proto.includes('serial') || proto.includes('rs485')) {
        protocolType = 'modbus_rtu';
        endpoint = `${d.portPath || 'COM1'} (${d.baudRate || 9600} baud)`;
      } else if (proto.includes('modbus') || proto.includes('tcp')) {
        protocolType = 'modbus_tcp';
        endpoint = `${d.host || '127.0.0.1'}:${d.port || 502}${d.unitId !== undefined ? ` (Unit ${d.unitId})` : ''}`;
      } else if (proto.includes('s7')) {
        protocolType = 's7';
        endpoint = `${d.host || '127.0.0.1'}:${d.port || 102}`;
      } else {
        protocolType = 'custom';
        endpoint = d.endpointUrl || `${d.host || '127.0.0.1'}:${d.port || 502}`;
      }

      const isConn = d.connected || d.connectionState === 'connected';
      const isConnecting = d.connectionState === 'connecting' || d.connectionState === 'reconnecting';

      items.push({
        id: d.connectionId,
        name: d.connectionName || (d as any).name || `${d.protocol.toUpperCase()} Driver`,
        protocol: d.protocol.toUpperCase().replace('_', ' '),
        protocolType,
        endpoint,
        status: isConn ? 'connected' : isConnecting ? 'connecting' : 'disconnected',
        lastError: d.lastError,
        lastConnectedAt: d.lastConnectedAt,
        lastDisconnectedAt: d.lastDisconnectedAt,
        isMqtt: false
      });
    }

    return items;
  }, [mqttConnection, allMqttConnections, mqttConnected, isSimulated, driverConnections]);

  // If NO drivers / sources are configured at all, do NOT render the pill
  if (driverItems.length === 0) {
    return null;
  }

  const onlineCount = driverItems.filter(d => d.status === 'connected').length;
  const totalCount = driverItems.length;
  const isAllOnline = onlineCount === totalCount;
  const isAllOffline = onlineCount === 0;

  // Text summary beside the dots
  const summaryLabel = (() => {
    if (isSimulated) return 'SIM';
    if (totalCount === 1) {
      return driverItems[0].status === 'connected' ? 'CONNECTED' : 'OFFLINE';
    }
    if (isAllOnline) return 'CONNECTED';
    if (isAllOffline) return 'OFFLINE';
    return `${onlineCount}/${totalCount} ONLINE`;
  })();

  const getProtocolIcon = (type: DriverStatusItem['protocolType']) => {
    switch (type) {
      case 'mqtt':
        return 'fas fa-network-wired text-sky-400';
      case 'modbus_tcp':
        return 'fas fa-server text-teal-400';
      case 'modbus_rtu':
        return 'fas fa-microchip text-amber-400';
      case 'opcua':
        return 'fas fa-cube text-purple-400';
      case 's7':
        return 'fas fa-industry text-blue-400';
      default:
        return 'fas fa-plug text-slate-400';
    }
  };

  const getProtocolBadge = (type: DriverStatusItem['protocolType']) => {
    switch (type) {
      case 'mqtt':
        return 'bg-sky-500/10 text-sky-300 border-sky-500/30';
      case 'modbus_tcp':
        return 'bg-teal-500/10 text-teal-300 border-teal-500/30';
      case 'modbus_rtu':
        return 'bg-amber-500/10 text-amber-300 border-amber-500/30';
      case 'opcua':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 's7':
        return 'bg-blue-500/10 text-blue-300 border-blue-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  const toggleDropdown = () => {
    if (!isOpen) {
      updateCoords();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Top Navbar Pill with Smaller Multi-Dots & COM Label */}
      <button
        ref={buttonRef}
        type="button"
        onClick={toggleDropdown}
        className={`flex items-center space-x-1.5 bg-slate-950/85 hover:bg-slate-900 px-2 py-1 rounded-lg border transition-all cursor-pointer group shrink-0 min-h-[28px] shadow-sm ${
          isOpen
            ? 'border-sky-500/70 ring-1 ring-sky-500/50 bg-slate-900'
            : isAllOnline
            ? 'border-slate-800 hover:border-emerald-500/40'
            : !isAllOffline
            ? 'border-slate-800 hover:border-amber-500/40'
            : 'border-slate-800 hover:border-rose-500/40'
        }`}
        title="Click to view all configured Communication Drivers & Live Connectivity"
      >
        {/* Row of Micro Dynamic Status Dots (4px size) */}
        <div className="flex items-center space-x-1 shrink-0">
          {driverItems.map(item => {
            if (item.status === 'connected') {
              return (
                <span
                  key={item.id}
                  className="w-1 h-1 rounded-full bg-emerald-400 shadow-[0_0_4px_#10b981]"
                  title={`${item.name} (${item.protocol}): ONLINE`}
                />
              );
            }
            if (item.status === 'connecting' || item.status === 'simulated') {
              return (
                <span
                  key={item.id}
                  className="w-1 h-1 rounded-full bg-amber-400 animate-pulse shadow-[0_0_4px_#f59e0b]"
                  title={`${item.name} (${item.protocol}): ${item.status.toUpperCase()}`}
                />
              );
            }
            return (
              <span
                key={item.id}
                className="w-1 h-1 rounded-full bg-rose-500 shadow-[0_0_3px_#f43f5e]"
                title={`${item.name} (${item.protocol}): OFFLINE`}
              />
            );
          })}
        </div>

        {/* Small "COM" Label */}
        <span className="text-[10px] font-mono font-bold tracking-wider text-slate-300 group-hover:text-white transition-colors">
          COM
        </span>

        {/* Down Chevron */}
        <i
          className={`fas fa-chevron-down text-[7px] text-slate-400 transition-transform duration-200 ${
            isOpen ? 'rotate-180 text-sky-400' : 'group-hover:text-slate-200'
          }`}
        ></i>
      </button>

      {/* Floating Dropdown Popover Menu Rendered in Portal to Prevent Navbar Clipping */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div
          ref={popoverRef}
          style={{
            position: 'fixed',
            top: `${popoverCoords.top}px`,
            left: `${popoverCoords.left}px`,
            zIndex: 99999
          }}
          className="w-80 sm:w-96 bg-slate-900/95 backdrop-blur-2xl border border-slate-700/80 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.8)] overflow-hidden animate-in fade-in zoom-in-95 duration-150"
        >
          {/* Header Banner */}
          <div className="p-3 bg-slate-950/80 border-b border-slate-800/90 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="w-7 h-7 rounded-lg bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400 text-xs">
                <i className="fas fa-network-wired"></i>
              </div>
              <div>
                <h4 className="text-xs font-bold text-slate-100">Communication Drivers</h4>
                <p className="text-[10px] text-slate-400 font-mono">
                  {onlineCount} of {totalCount} Connected
                </p>
              </div>
            </div>

            {/* Quick Status Count Badges */}
            <div className="flex items-center space-x-1.5">
              <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">
                {onlineCount} ON
              </span>
              {totalCount - onlineCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500/10 text-rose-300 border border-rose-500/30">
                  {totalCount - onlineCount} OFF
                </span>
              )}
            </div>
          </div>

          {/* Drivers List */}
          <div className="p-2 space-y-1.5 max-h-72 overflow-y-auto divide-y divide-slate-800/40">
            {driverItems.map(item => (
              <div
                key={item.id}
                className="p-2.5 rounded-xl bg-slate-950/40 hover:bg-slate-800/50 border border-slate-800/60 transition-colors space-y-1.5"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-start space-x-2.5 min-w-0">
                    <div className="mt-0.5 text-xs shrink-0">
                      <i className={getProtocolIcon(item.protocolType)}></i>
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center space-x-2">
                        <span className="text-xs font-bold text-slate-100 truncate block">
                          {item.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.2 rounded font-mono font-bold border uppercase shrink-0 ${getProtocolBadge(
                            item.protocolType
                          )}`}
                        >
                          {item.protocol}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono truncate block mt-0.5">
                        {item.endpoint}
                      </span>
                    </div>
                  </div>

                  {/* Status Indicator Chip */}
                  <div className="shrink-0 flex items-center space-x-1.5">
                    {item.status === 'connected' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shadow-[0_0_5px_#10b981]"></span>
                        <span>ONLINE</span>
                      </span>
                    ) : item.status === 'connecting' || item.status === 'simulated' ? (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse shadow-[0_0_5px_#f59e0b]"></span>
                        <span>{item.status.toUpperCase()}</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center space-x-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-500 shadow-[0_0_4px_#f43f5e]"></span>
                        <span>OFFLINE</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Error diagnostics banner if driver has error */}
                {item.lastError && (
                  <div className="px-2 py-1 rounded bg-rose-950/60 border border-rose-500/30 text-[10px] font-mono text-rose-300 flex items-center space-x-1.5 truncate">
                    <i className="fas fa-triangle-exclamation text-[9px] text-rose-400 shrink-0"></i>
                    <span className="truncate">{item.lastError}</span>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Footer Quick Configuration Navigation (Only in Studio / Non-Client) */}
          {!isClient ? (
            <div className="p-2.5 bg-slate-950/80 border-t border-slate-800/90 flex items-center justify-between gap-2">
              {onOpenDriverConnections && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenDriverConnections();
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[11px] font-bold border border-slate-700 transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <i className="fas fa-sliders text-[10px] text-sky-400"></i>
                  <span>Manage Drivers</span>
                </button>
              )}

              {onOpenMqttSettings && (
                <button
                  type="button"
                  onClick={() => {
                    setIsOpen(false);
                    onOpenMqttSettings();
                  }}
                  className="flex-1 py-1.5 px-2 bg-slate-800 hover:bg-slate-700 text-slate-200 hover:text-white rounded-lg text-[11px] font-bold border border-slate-700 transition-all text-center cursor-pointer flex items-center justify-center space-x-1.5"
                >
                  <i className="fas fa-server text-[10px] text-teal-400"></i>
                  <span>MQTT Broker</span>
                </button>
              )}
            </div>
          ) : (
            <div className="p-2 bg-slate-950/80 border-t border-slate-800/90 text-center">
              <span className="text-[10px] font-mono text-slate-500">
                Client Runtime Mode • Auto-Polling Active
              </span>
            </div>
          )}
        </div>,
        document.body
      )}
    </>
  );
};
