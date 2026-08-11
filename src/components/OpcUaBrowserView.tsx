import React, { useState, useRef, useCallback, useEffect } from 'react';
import { AppState, AppView, DriverTag, DriverConnection } from '../types';

interface OpcUaBrowserViewProps {
  onBack?: () => void;
  appState: AppState;
  onNavigate?: (view: AppView) => void;
  onImportTag: (tag: DriverTag) => void;
}

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'error';

interface OpcNode {
  nodeId: string;
  browseName: string;
  displayName: string;
  nodeClass: number;
  isFolder: boolean;
  isVariable: boolean;
  children?: OpcNode[];
  loaded?: boolean;
}

interface NodeDetail {
  nodeId: string;
  displayName: string;
  description: string;
  dataType: string;
  accessLevel: number;
  value: any;
  statusCode: string;
  sourceTimestamp: string | null;
}

const OpcUaBrowserView: React.FC<OpcUaBrowserViewProps> = ({ onBack, appState, onNavigate, onImportTag }) => {
  const ws = useRef<WebSocket | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>('disconnected');
  const [statusMsg, setStatusMsg] = useState('');
  const [selectedConnectionId, setSelectedConnectionId] = useState('');
  const [rootNodes, setRootNodes] = useState<OpcNode[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [childMap, setChildMap] = useState<Record<string, OpcNode[]>>({});
  const [loadingNodes, setLoadingNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<NodeDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [importedIds, setImportedIds] = useState<Set<string>>(new Set());

  const opcuaConnections: DriverConnection[] = (appState.driverConnections || []).filter(
    c => c.protocol === 'opcua' && c.enabled
  );

  const sendWs = useCallback((msg: object) => {
    if (ws.current && ws.current.readyState === WebSocket.OPEN) {
      ws.current.send(JSON.stringify(msg));
    }
  }, []);

  useEffect(() => {
    if (!selectedConnectionId && opcuaConnections.length > 0) {
      setSelectedConnectionId(opcuaConnections[0].connectionId);
    }
  }, [opcuaConnections, selectedConnectionId]);

  const handleConnect = () => {
    const conn = opcuaConnections.find(c => c.connectionId === selectedConnectionId);
    if (!conn) return;
    setRootNodes([]);
    setChildMap({});
    setSelectedNode(null);
    setErrorMsg('');
    setStatus('connecting');
    setStatusMsg(`Connecting to ${conn.endpointUrl || conn.connectionName}...`);

    if (ws.current) {
      ws.current.onclose = null;
      ws.current.close();
    }

    const wsProtocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${wsProtocol}//${window.location.host}/api/opc-ua-browse`;
    const socket = new WebSocket(wsUrl);
    ws.current = socket;

    socket.onopen = () => {
      console.log('[OpcUaBrowser] WebSocket opened. Sending connect message to server...');
      const msg: any = { type: 'connect', endpointUrl: conn.endpointUrl };
      if (conn.username) { msg.username = conn.username; msg.password = conn.password; }
      socket.send(JSON.stringify(msg));
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'status') {
          if (msg.status === 'connecting') {
            setStatus('connecting');
            setStatusMsg(`Connecting to ${msg.endpointUrl}...`);
          }
          if (msg.status === 'connected') {
            setStatus('connected');
            setStatusMsg('Connected');
            setErrorMsg('');
            // Auto-browse RootFolder on connect
            socket.send(JSON.stringify({ type: 'browse', nodeId: 'RootFolder' }));
          }
          if (msg.status === 'disconnected') {
            setStatus('disconnected');
            setStatusMsg('Disconnected');
            setRootNodes([]);
            setChildMap({});
          }
        }

        if (msg.type === 'browse_result') {
          const { parentNodeId, children } = msg;
          if (parentNodeId === 'RootFolder') {
            setRootNodes(children);
          } else {
            setChildMap(prev => ({ ...prev, [parentNodeId]: children }));
          }
          setLoadingNodes(prev => { const n = new Set(prev); n.delete(parentNodeId); return n; });
        }

        if (msg.type === 'read_result') {
          setSelectedNode({
            nodeId: msg.nodeId,
            displayName: msg.displayName,
            description: msg.description,
            dataType: msg.dataType,
            accessLevel: msg.accessLevel,
            value: msg.value,
            statusCode: msg.statusCode,
            sourceTimestamp: msg.sourceTimestamp
          });
          setLoadingDetail(false);
        }

        if (msg.type === 'error') {
          setErrorMsg(msg.message || 'Unknown error');
          setLoadingDetail(false);
          setLoadingNodes(new Set());
          setStatus('error');
        }
      } catch (e: any) {
        console.error('[OpcUaBrowser] Message parsing error:', e);
      }
    };

    socket.onerror = () => {
      setStatus('error');
      setErrorMsg('WebSocket connection to server failed.');
    };

    socket.onclose = () => {
      setStatus(prev => prev === 'connected' ? 'disconnected' : prev);
    };
  };

  const handleDisconnect = () => {
    sendWs({ type: 'disconnect' });
    setStatus('disconnected');
    setRootNodes([]);
    setChildMap({});
    setSelectedNode(null);
  };

  const handleToggleFolder = (nodeId: string) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
        if (!childMap[nodeId] && status === 'connected') {
          setLoadingNodes(p => new Set(p).add(nodeId));
          sendWs({ type: 'browse', nodeId });
        }
      }
      return next;
    });
  };

  const handleSelectVariable = (node: OpcNode) => {
    setLoadingDetail(true);
    setSelectedNode(null);
    sendWs({ type: 'read', nodeId: node.nodeId });
  };

  const mapDataType = (opcDataType: string): 'boolean' | 'int16' | 'int32' | 'uint16' | 'uint32' | 'float' | 'double' | 'string' => {
    const dt = (opcDataType || '').toLowerCase();
    if (dt.includes('bool')) return 'boolean';
    if (dt.includes('int16')) return 'int16';
    if (dt.includes('uint16')) return 'uint16';
    if (dt.includes('int32') || dt.includes('int')) return 'int32';
    if (dt.includes('uint32') || dt.includes('uint')) return 'uint32';
    if (dt.includes('float')) return 'float';
    if (dt.includes('double')) return 'double';
    return 'string';
  };

  const mapAccessType = (level: number): 'read' | 'write' | 'read-write' => {
    const canRead = (level & 0x01) !== 0;
    const canWrite = (level & 0x02) !== 0;
    if (canRead && canWrite) return 'read-write';
    if (canWrite) return 'write';
    return 'read';
  };

  const handleImport = () => {
    if (!selectedNode) return;
    const conn = opcuaConnections.find(c => c.connectionId === selectedConnectionId);
    if (!conn) return;

    const nameBase = selectedNode.displayName || selectedNode.nodeId.split(';').pop() || 'opc_tag';
    const tag: DriverTag = {
      tagId: `dtag_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      tagName: nameBase.replace(/[^a-zA-Z0-9_\- ]/g, '_'),
      protocol: 'opcua',
      sourceType: 'browsed',
      connectionId: conn.connectionId,
      nodeId: selectedNode.nodeId,
      browsePath: selectedNode.nodeId,
      dataType: mapDataType(selectedNode.dataType),
      accessType: mapAccessType(selectedNode.accessLevel),
      pollRate: 100,
      enabled: true,
      description: selectedNode.description,
      createdAt: new Date().toISOString()
    };

    onImportTag(tag);
    setImportedIds(prev => new Set(prev).add(selectedNode.nodeId));
  };

  useEffect(() => {
    return () => {
      if (ws.current) { ws.current.onclose = null; ws.current.close(); }
    };
  }, []);

  // Filter helper
  const filterNodes = (nodes: OpcNode[]): OpcNode[] => {
    if (!searchQuery.trim()) return nodes;
    return nodes.filter(n =>
      n.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      n.nodeId.toLowerCase().includes(searchQuery.toLowerCase())
    );
  };

  const renderNode = (node: OpcNode, depth = 0): React.ReactNode => {
    const isExpanded = expandedNodes.has(node.nodeId);
    const isLoading = loadingNodes.has(node.nodeId);
    const children = childMap[node.nodeId];

    if (node.isFolder) {
      return (
        <div key={node.nodeId}>
          <button
            onClick={() => handleToggleFolder(node.nodeId)}
            className="flex items-center w-full text-left py-1 px-2 hover:bg-slate-700/50 rounded group cursor-pointer"
            style={{ paddingLeft: `${8 + depth * 16}px` }}
          >
            <i className={`fas ${isExpanded ? 'fa-chevron-down' : 'fa-chevron-right'} text-[9px] text-slate-500 mr-1.5 w-3`}></i>
            {isLoading
              ? <i className="fas fa-spinner fa-spin text-violet-400 text-xs mr-2"></i>
              : <i className={`fas ${isExpanded ? 'fa-folder-open' : 'fa-folder'} text-amber-400 text-xs mr-2`}></i>
            }
            <span className="text-sm text-slate-200 truncate">{node.displayName}</span>
            <span className="text-[10px] text-slate-600 ml-auto pl-2 truncate max-w-[120px]">{node.nodeId}</span>
          </button>
          {isExpanded && children && (
            <div>
              {filterNodes(children).map(child => renderNode(child, depth + 1))}
              {children.length === 0 && (
                <p className="text-[11px] text-slate-600 py-1" style={{ paddingLeft: `${24 + (depth + 1) * 16}px` }}>
                  Empty folder
                </p>
              )}
            </div>
          )}
        </div>
      );
    }

    if (node.isVariable) {
      const isSelected = selectedNode?.nodeId === node.nodeId;
      const alreadyImported = importedIds.has(node.nodeId) ||
        (appState.driverTags || []).some(t => t.nodeId === node.nodeId && t.connectionId === selectedConnectionId);

      return (
        <button
          key={node.nodeId}
          onClick={() => handleSelectVariable(node)}
          className={`flex items-center w-full text-left py-1 px-2 rounded group transition-colors cursor-pointer ${
            isSelected
              ? 'bg-violet-600/20 border border-violet-500/30'
              : 'hover:bg-slate-700/50'
          }`}
          style={{ paddingLeft: `${8 + depth * 16}px` }}
        >
          <span className="w-3 mr-1.5"></span>
          <i className="fas fa-tag text-sky-400 text-xs mr-2"></i>
          <span className="text-sm text-slate-200 truncate">{node.displayName}</span>
          {alreadyImported && (
            <span className="ml-2 text-[9px] bg-emerald-500/20 text-emerald-400 px-1.5 py-0.5 rounded border border-emerald-500/30 font-bold">
              IMPORTED
            </span>
          )}
          <span className="text-[10px] text-slate-600 ml-auto pl-2 truncate max-w-[120px]">{node.nodeId}</span>
        </button>
      );
    }

    return null;
  };

  const statusColor = {
    disconnected: 'text-slate-500',
    connecting: 'text-amber-400',
    connected: 'text-emerald-400',
    error: 'text-rose-400'
  }[status];

  const statusDot = {
    disconnected: 'bg-slate-500',
    connecting: 'bg-amber-400 animate-pulse',
    connected: 'bg-emerald-500',
    error: 'bg-rose-500'
  }[status];

  return (
    <div className="p-4 max-w-7xl mx-auto h-full flex flex-col">

      {/* Header */}
      <div className="flex items-center space-x-3 mb-4">
        <button
          type="button"
          onClick={() => {
            if (onBack) onBack();
            else if (onNavigate) onNavigate(AppView.DASHBOARD);
          }}
          className="p-2 rounded-xl text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 border border-slate-700/80 transition-all cursor-pointer flex items-center space-x-2 shrink-0 active:scale-95"
          title="Back to Dashboard"
        >
          <i className="fas fa-arrow-left text-sm"></i>
          <span className="text-xs font-bold">Back</span>
        </button>
        <i className="fas fa-sitemap text-violet-400 text-xl"></i>
        <div>
          <h1 className="text-xl font-bold text-white">OPC UA Browser</h1>
          <p className="text-sm text-slate-400">Browse OPC UA address space and import nodes as driver tags</p>
        </div>
        <div className="ml-auto flex items-center space-x-2">
          <span className={`w-2 h-2 rounded-full ${statusDot}`}></span>
          <span className={`text-xs font-medium ${statusColor}`}>{status.toUpperCase()}</span>
        </div>
      </div>

      {/* Connection Bar */}
      <div className="flex items-center space-x-3 mb-4 bg-slate-800/50 border border-slate-700 rounded-xl p-3">
        <div className="flex-1">
          <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">OPC UA Connection</label>
          {opcuaConnections.length === 0 ? (
            <div className="flex items-center space-x-2">
              <span className="text-sm text-rose-400">No OPC UA driver connections configured.</span>
              <button
                onClick={() => onNavigate(AppView.DRIVER_CONNECTIONS)}
                className="text-xs text-violet-400 underline hover:text-violet-300 cursor-pointer"
              >
                Add Connection →
              </button>
            </div>
          ) : (
            <select
              value={selectedConnectionId}
              onChange={e => setSelectedConnectionId(e.target.value)}
              disabled={status === 'connecting' || status === 'connected'}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-white focus:outline-none focus:border-violet-500 disabled:opacity-50"
            >
              <option value="">— Select a connection —</option>
              {opcuaConnections.map(c => (
                <option key={c.connectionId} value={c.connectionId}>
                  {c.connectionName} ({c.endpointUrl})
                </option>
              ))}
            </select>
          )}
        </div>

        {status === 'disconnected' || status === 'error' ? (
          <button
            onClick={handleConnect}
            disabled={!selectedConnectionId}
            className="px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <i className="fas fa-plug mr-2"></i>Connect
          </button>
        ) : status === 'connecting' ? (
          <button disabled className="px-4 py-2 bg-amber-600/50 text-amber-300 text-sm font-bold rounded-xl">
            <i className="fas fa-spinner fa-spin mr-2"></i>Connecting...
          </button>
        ) : (
          <button
            onClick={handleDisconnect}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
          >
            <i className="fas fa-times mr-2"></i>Disconnect
          </button>
        )}
      </div>

      {/* Error banner */}
      {errorMsg && (
        <div className="mb-3 px-3 py-2 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center space-x-2">
          <i className="fas fa-exclamation-circle"></i>
          <span>{errorMsg}</span>
          <button onClick={() => setErrorMsg('')} className="ml-auto text-rose-400/50 hover:text-rose-400 cursor-pointer">
            <i className="fas fa-times"></i>
          </button>
        </div>
      )}

      {/* Main content — Tree + Detail pane */}
      {status === 'connected' ? (
        <div className="flex-1 flex gap-4 min-h-0">

          {/* Tree pane */}
          <div className="flex-1 flex flex-col min-h-0 bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden">
            <div className="px-3 py-2 border-b border-slate-700 flex items-center space-x-2">
              <i className="fas fa-search text-slate-500 text-xs"></i>
              <input
                type="text"
                placeholder="Filter nodes..."
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                className="flex-1 bg-transparent text-sm text-white placeholder-slate-600 focus:outline-none"
              />
              {searchQuery && (
                <button onClick={() => setSearchQuery('')} className="text-slate-500 hover:text-slate-300 cursor-pointer">
                  <i className="fas fa-times text-xs"></i>
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-1">
              {rootNodes.length === 0 ? (
                <div className="flex flex-col items-center justify-center h-full text-slate-500 space-y-2">
                  <i className="fas fa-spinner fa-spin text-2xl text-violet-400/40"></i>
                  <p className="text-sm">Loading address space...</p>
                </div>
              ) : (
                filterNodes(rootNodes).map(node => renderNode(node))
              )}
            </div>
          </div>

          {/* Detail pane */}
          <div className="w-80 flex-shrink-0 bg-slate-800/30 border border-slate-700 rounded-xl overflow-hidden flex flex-col">
            <div className="px-3 py-2 border-b border-slate-700">
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Node Detail</p>
            </div>

            {loadingDetail ? (
              <div className="flex-1 flex items-center justify-center">
                <i className="fas fa-spinner fa-spin text-violet-400 text-xl"></i>
              </div>
            ) : selectedNode ? (
              <div className="flex-1 overflow-y-auto p-3 space-y-3">
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Display Name</p>
                  <p className="text-sm text-white font-semibold mt-0.5">{selectedNode.displayName || '—'}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Node ID</p>
                  <p className="text-xs text-violet-300 font-mono mt-0.5 break-all">{selectedNode.nodeId}</p>
                </div>
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Data Type</p>
                    <p className="text-sm text-sky-300 mt-0.5">{selectedNode.dataType || '—'}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Access</p>
                    <p className="text-sm text-amber-300 mt-0.5">{mapAccessType(selectedNode.accessLevel).toUpperCase()}</p>
                  </div>
                </div>
                <div>
                  <p className="text-[10px] text-slate-500 uppercase tracking-wider">Current Value</p>
                  <div className="mt-0.5 px-2 py-1.5 bg-slate-900 rounded-lg border border-slate-700">
                    <p className="text-sm text-emerald-300 font-mono">{selectedNode.value !== null && selectedNode.value !== undefined ? String(selectedNode.value) : 'null'}</p>
                    <p className="text-[10px] text-slate-600 mt-0.5">{selectedNode.statusCode}</p>
                  </div>
                </div>
                {selectedNode.description && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Description</p>
                    <p className="text-xs text-slate-300 mt-0.5">{selectedNode.description}</p>
                  </div>
                )}
                {selectedNode.sourceTimestamp && (
                  <div>
                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Timestamp</p>
                    <p className="text-xs text-slate-400 mt-0.5">{new Date(selectedNode.sourceTimestamp).toLocaleString()}</p>
                  </div>
                )}

                {/* Import button */}
                {(() => {
                  const alreadyImported = importedIds.has(selectedNode.nodeId) ||
                    (appState.driverTags || []).some(t => t.nodeId === selectedNode.nodeId && t.connectionId === selectedConnectionId);

                  return alreadyImported ? (
                    <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-center">
                      <i className="fas fa-check-circle text-emerald-400 mr-2"></i>
                      <span className="text-sm text-emerald-400 font-medium">Already imported</span>
                    </div>
                  ) : (
                    <button
                      onClick={handleImport}
                      className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-colors cursor-pointer"
                    >
                      <i className="fas fa-file-import mr-2"></i>Import as Driver Tag
                    </button>
                  );
                })()}
              </div>
            ) : (
              <div className="flex-1 flex flex-col items-center justify-center text-slate-600 space-y-2 p-4 text-center">
                <i className="fas fa-mouse-pointer text-2xl"></i>
                <p className="text-sm">Click a variable node in the tree to see its details</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Not connected placeholder
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center space-y-3">
            <i className={`fas fa-sitemap text-5xl ${status === 'error' ? 'text-rose-400/40' : 'text-violet-400/20'}`}></i>
            <p className="text-slate-400 font-medium">
              {status === 'error' ? 'Connection failed' : 'Connect to an OPC UA server to browse its address space'}
            </p>
            {status === 'error' && errorMsg && (
              <p className="text-sm text-rose-400">{errorMsg}</p>
            )}
            <p className="text-xs text-slate-600">Select an OPC UA connection above and click Connect</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default OpcUaBrowserView;
