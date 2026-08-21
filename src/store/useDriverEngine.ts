import { useState, useEffect, useRef, useCallback, Dispatch, SetStateAction } from 'react';
import { 
  AppState, 
  Panel, 
  PanelType,
  DriverTagValue, 
  DriverConnectionHealthPayload 
} from '../types';
import { DriverBridgeClient } from '../utils/driverBridgeClient';
import { routeTelemetryToHistorian } from '../services/telemetryRouter';

export interface UseDriverEngineProps {
  appState: AppState;
  setAppState: Dispatch<SetStateAction<AppState>>;
  activePanels: Panel[];
  setLatestValues: Dispatch<SetStateAction<Record<string, any>>>;
  setHistoryValues: Dispatch<SetStateAction<Record<string, { value: number; time: string; timestampMs?: number }[]>>>;
}

export function useDriverEngine({
  appState,
  setAppState,
  activePanels,
  setLatestValues,
  setHistoryValues
}: UseDriverEngineProps) {
  const driverBridgeClientRef = useRef<DriverBridgeClient | null>(null);
  const lastSubscribedKeyRef = useRef<string>('');
  const [bridgeReconnectCount, setBridgeReconnectCount] = useState(0);

  // Internal appStateRef for closure safety in callback
  const appStateRef = useRef<AppState>(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const handleDriverConnectionHealth = useCallback((payload: DriverConnectionHealthPayload) => {
    setAppState(prev => {
      if (!prev.driverConnections) return prev;
      const updatedConns = prev.driverConnections.map(c => {
        if (c.connectionId === payload.connectionId) {
          return {
            ...c,
            connected: payload.connectionState === 'connected',
            connectionState: payload.connectionState,
            lastConnectedAt: payload.lastConnectedAt || c.lastConnectedAt,
            lastDisconnectedAt: payload.lastDisconnectedAt || c.lastDisconnectedAt,
            lastError: payload.lastError,
            retryCount: payload.retryCount,
            consecutiveFailureCount: payload.consecutiveFailureCount
          };
        }
        return c;
      });
      return { ...prev, driverConnections: updatedConns };
    });
  }, [setAppState]);

  const processDriverTagValue = useCallback((update: DriverTagValue) => {
    const timeStr = new Date().toLocaleTimeString();
    const now = Date.now();
    
    // 1. Triple-key write to latestValues (panelId + tagId + tagName)
    setLatestValues(prev => {
      const existingPanel = prev[update.panelId];
      const existingTag = prev[update.tagId];
      
      const isBad = update.quality === 'bad';
      const hasNewValue = update.value !== null && update.value !== undefined;
      
      const panelVal = hasNewValue ? update.value : (isBad ? null : existingPanel?.val);
      const tagVal = hasNewValue ? update.value : (isBad ? null : existingTag?.val);
      
      const panelTimestamp = now;
      const tagTimestamp = now;

      const lastGoodValue = hasNewValue ? update.value : (update.lastGoodValue ?? existingTag?.lastGoodValue ?? existingPanel?.lastGoodValue);
      const lastGoodTimestamp = hasNewValue ? (update.timestamp || new Date().toISOString()) : (update.lastGoodTimestamp || existingTag?.lastGoodTimestamp || existingPanel?.lastGoodTimestamp);

      const nextState: Record<string, any> = {
        ...prev,
        [update.panelId]: {
          val: panelVal,
          time: timeStr,
          timestampMs: panelTimestamp,
          quality: update.quality || 'good',
          lastGoodValue,
          lastGoodTimestamp
        },
        [update.tagId]: {
          val: tagVal,
          time: timeStr,
          timestampMs: tagTimestamp,
          quality: update.quality || 'good',
          lastGoodValue,
          lastGoodTimestamp
        }
      };

      if (update.tagName) {
        nextState[update.tagName] = {
          val: tagVal,
          time: timeStr,
          timestampMs: tagTimestamp,
          quality: update.quality || 'good',
          lastGoodValue,
          lastGoodTimestamp
        };
      }

      return nextState;
    });

    // 2. Patch driverTags in appState with latest runtime info
    setAppState(prev => {
      if (!prev.driverTags) return prev;
      let changed = false;
      const isBad = update.quality === 'bad';
      const hasNewValue = update.value !== null && update.value !== undefined;

      const updatedTags = prev.driverTags.map(t => {
        if (t.tagId === update.tagId || t.tagName === update.tagId || (update.tagName && t.tagName === update.tagName)) {
          const newQuality = (update.quality || 'good') as any;
          const newRuntime = isBad ? ('bad' as const) : ('healthy' as const);
          const newVal = hasNewValue ? update.value : (isBad ? null : t.lastValue);
          if (t.quality !== newQuality || t.runtimeState !== newRuntime || t.lastValue !== newVal) {
            changed = true;
          }
          return {
            ...t,
            quality: newQuality,
            runtimeState: newRuntime,
            lastValue: newVal,
            lastGoodValue: hasNewValue ? update.value : (update.lastGoodValue ?? t.lastGoodValue),
            lastGoodTimestamp: hasNewValue ? (update.timestamp || new Date().toISOString()) : (update.lastGoodTimestamp ?? t.lastGoodTimestamp),
            lastTimestamp: update.timestamp || new Date().toISOString()
          };
        }
        return t;
      });
      return changed ? { ...prev, driverTags: updatedTags } : prev;
    });

    // 3. Record driver tag values into historyValues and Historian Engine
    const numVal = typeof update.value === 'number' ? update.value : parseFloat(String(update.value ?? ''));
    if (!isNaN(numVal) && update.value !== null && update.value !== undefined) {
      setHistoryValues(prev => {
        const tagHist = prev[update.tagId] || [];
        const newPt = { value: numVal, time: timeStr, timestampMs: now };
        const updated: Record<string, { value: number; time: string; timestampMs?: number }[]> = {
          ...prev,
          [update.tagId]: [...tagHist, newPt].slice(-3600),
          [update.panelId]: [...(prev[update.panelId] || []), newPt].slice(-3600)
        };

        // 3a. Centralized Historian Engine continuous logging
        const histCfg = appStateRef.current.historianConfig;
        const globalHistEnabled = histCfg?.enabled !== false;
        const globalInterval = histCfg?.logIntervalSeconds || 10;

        if (globalHistEnabled && appStateRef.current.historianTags) {
          appStateRef.current.historianTags.forEach(ht => {
            if (ht.enabled !== false && ht.sourceType === 'driver' && (ht.driverTagId === update.tagId || ht.id === update.tagId)) {
              const effectiveInterval = ht.useCustomInterval && ht.customIntervalSeconds ? ht.customIntervalSeconds : globalInterval;
              routeTelemetryToHistorian({
                numVal,
                topic: ht.topic,
                tagId: ht.id,
                sourceType: 'driver',
                sourceMode: 'historian_tag',
                logIntervalSeconds: effectiveInterval,
                historianConfig: histCfg
              });
            }
          });
        }

        // 3b. Legacy panel pen updates and backwards compatibility
        (appStateRef.current.panels || []).forEach(p => {
          if (p.pens && p.pens.length > 0) {
            p.pens.forEach(pen => {
              if (pen.driverTagId === update.tagId || pen.topic === update.tagId) {
                const penHist = prev[pen.id] || [];
                updated[pen.id] = [...penHist, newPt].slice(-3600);
                if (p.type === PanelType.LINE_GRAPH && p.enableHistorianLogging && p.logIntervalSeconds && pen.loggingEnabled !== false) {
                  routeTelemetryToHistorian({
                    numVal,
                    topic: pen.topic,
                    penId: pen.id,
                    panelId: p.panelId,
                    sourceType: 'driver',
                    sourceMode: 'pen',
                    logIntervalSeconds: p.logIntervalSeconds,
                    loggingEnabled: pen.loggingEnabled !== false
                  });
                }
              }
            });
          } else if (p.dataSourceMode === 'driver' && (p.driverTagId === update.tagId || p.topic === update.tagId)) {
            if (p.type === PanelType.LINE_GRAPH && p.enableHistorianLogging && p.logIntervalSeconds) {
              routeTelemetryToHistorian({
                numVal,
                tagId: update.tagId,
                panelId: p.panelId,
                sourceType: 'driver',
                sourceMode: 'primary',
                logIntervalSeconds: p.logIntervalSeconds,
                loggingEnabled: true
              });
            }
          }
        });

        return updated;
      });
    }
  }, [setLatestValues, setAppState, setHistoryValues]);

  const handleDriverBridgeReconnect = useCallback(() => {
    console.log('[DriverBridge] Reconnected — forcing re-subscription.');
    lastSubscribedKeyRef.current = '';
    setBridgeReconnectCount(c => c + 1);
  }, []);

  // Driver Bridge Lifecycle
  useEffect(() => {
    if (!driverBridgeClientRef.current) {
      driverBridgeClientRef.current = new DriverBridgeClient(
        processDriverTagValue,
        handleDriverConnectionHealth,
        handleDriverBridgeReconnect
      );
    }
    driverBridgeClientRef.current.connect();

    return () => {
      driverBridgeClientRef.current?.disconnect();
    };
  }, [processDriverTagValue, handleDriverConnectionHealth, handleDriverBridgeReconnect]);

  // Sync driver-mode subscriptions to the bridge
  useEffect(() => {
    const bridge = driverBridgeClientRef.current;
    if (!bridge) return;

    const enabledConns = (appState.driverConnections || []).filter(c => c.enabled !== false);
    
    const findConnection = (connId: string) => {
      const match = enabledConns.find(c => c.connectionId === connId || c.connectionName === connId);
      if (match) return match;
      if (enabledConns.length > 0) return enabledConns[0];
      return {
        connectionId: connId || 'conn_default_modbus',
        connectionName: 'Local Modbus TCP',
        protocol: 'modbus_tcp' as const,
        host: '127.0.0.1',
        port: 502,
        unitId: 1,
        enabled: true
      };
    };

    const allTagsToPoll = (appState.driverTags || []).filter(t => t.enabled !== false);

    const driverPanels = activePanels.filter(p => p.dataSourceMode === 'driver' && p.driverTagId);
    const panelMapByTagId = new Map(driverPanels.map(p => [p.driverTagId, p.panelId]));

    const subscriptions = allTagsToPoll.map(tag => {
      const connection = findConnection(tag.connectionId);
      const panelId = panelMapByTagId.get(tag.tagId) || `tag_panel_${tag.tagId}`;

      return {
        tagId: tag.tagId,
        panelId,
        connectionId: tag.connectionId || connection?.connectionId || 'drv_default',
        pollRate: Number(tag.pollRate) || 100,
        tag,
        connection
      };
    });

    const subKey = JSON.stringify(subscriptions.map(s => `${s.tagId}:${s.panelId}:${s.pollRate}:${s.connection?.host}:${s.connection?.port}:${s.connection?.enabled}:${s.tag?.address}:${s.tag?.registerType}:${s.tag?.enabled}`));
    if (lastSubscribedKeyRef.current === subKey) return;
    lastSubscribedKeyRef.current = subKey;

    if (subscriptions.length > 0) {
      bridge.subscribe(subscriptions);
    } else {
      bridge.unsubscribeAll();
    }
  }, [activePanels, appState.driverTags, appState.driverConnections, bridgeReconnectCount]);

  return {
    driverBridgeClientRef,
    processDriverTagValue,
    handleDriverConnectionHealth,
    handleDriverBridgeReconnect,
    bridgeReconnectCount
  };
}
