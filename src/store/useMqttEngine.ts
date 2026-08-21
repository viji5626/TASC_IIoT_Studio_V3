import { useState, useEffect, useRef, useCallback, RefObject } from 'react';
import mqtt, { MqttClient } from 'mqtt';
import { 
  AppState, 
  Dashboard, 
  MqttConnection, 
  Panel, 
  PanelType, 
  MqttMessageLog 
} from '../types';
import { extractPanelValue, extractPenValues } from '../services/mqttService';
import { routeTelemetryToHistorian } from '../services/telemetryRouter';
import { formatBrokerWebSocketUrl, getJsonValue, mqttWildcardMatch } from '../utils/mqttHelper';
import { DriverBridgeClient } from '../utils/driverBridgeClient';
import { getDriverTagById } from '../utils/driverTagManager';

export interface UseMqttEngineProps {
  appState: AppState;
  activeConnection?: MqttConnection;
  activeDashboard?: Dashboard;
  activePanels: Panel[];
  driverBridgeClientRef?: RefObject<DriverBridgeClient | null>;
  onResetRuntimeTimeout?: () => void;
}

export function useMqttEngine({
  appState,
  activeConnection,
  activeDashboard,
  activePanels,
  driverBridgeClientRef,
  onResetRuntimeTimeout
}: UseMqttEngineProps) {
  // Real-time MQTT data stores
  const [latestValues, setLatestValues] = useState<Record<string, { val: any; time: string; timestampMs?: number; quality?: string; rawPayload?: any; sentTime?: string; lastGoodValue?: any; lastGoodTimestamp?: string }>>({});
  const [historyValues, setHistoryValues] = useState<Record<string, { value: number; time: string; timestampMs?: number }[]>>({});
  const [mqttLogs, setMqttLogs] = useState<MqttMessageLog[]>([]);
  const [mqttConnected, setMqttConnected] = useState(false);
  const [isSimulated, setIsSimulated] = useState(false);
  const [nowMs, setNowMs] = useState<number>(Date.now());

  const clientRef = useRef<MqttClient | null>(null);

  // Internal refs for closure safety in event listeners
  const appStateRef = useRef<AppState>(appState);
  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const activeDashboardRef = useRef<Dashboard | undefined>(activeDashboard);
  useEffect(() => {
    activeDashboardRef.current = activeDashboard;
  }, [activeDashboard]);

  // 1-Second ticker for live element telemetry timeout & stale detection
  useEffect(() => {
    const timer = setInterval(() => {
      setNowMs(Date.now());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  // Helper for message payload parsing
  const processIncomingMessage = useCallback((topic: string, payloadStr: string) => {
    const timeStr = new Date().toLocaleTimeString();

    setMqttLogs(prev => [
      {
        id: `log_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
        topic,
        payload: payloadStr,
        timestamp: timeStr
      },
      ...prev.slice(0, 99)
    ]);

    const currentAppState = appStateRef.current;
    const currentDash = activeDashboardRef.current;

    // Update panel matching topics
    currentAppState.panels.forEach(panel => {
      const matchResult = extractPanelValue(
        topic,
        payloadStr,
        panel,
        currentDash?.prefixTopic
      );

      if (matchResult) {
        const { extracted } = matchResult;

        setLatestValues(prev => {
          const existing = prev[panel.panelId];
          return {
            ...prev,
            [panel.panelId]: {
              val: extracted,
              rawPayload: payloadStr,
              time: timeStr,
              timestampMs: Date.now(),
              quality: 'good',
              sentTime: existing?.sentTime
            }
          };
        });

        // Process telemetry / trend values for history and historian engine
        setHistoryValues(prev => {
          const pId = panel.panelId;
          const top = panel.topic;
          const currentIdArr = prev[pId] || [];
          const currentTopArr = top ? (prev[top] || []) : [];
          const multiPenUpdates: Record<string, any[]> = {};

          // 1. Process multi-pens if configured
          if (panel.pens && panel.pens.length > 0) {
            const penVals = extractPenValues(payloadStr, panel);
            penVals.forEach(({ penId, penTopic, numVal }) => {
              const penPoint = { value: numVal, time: timeStr, timestampMs: Date.now() };
              const curPenArr = prev[penId] || [];
              const newArr = [...curPenArr, penPoint].slice(-3600);
              multiPenUpdates[penId] = newArr;

              if (penTopic && penTopic !== panel.topic) {
                multiPenUpdates[penTopic] = newArr;
              }

              const penObj = panel.pens?.find(p => p.id === penId);
              if (panel.type === PanelType.LINE_GRAPH && panel.enableHistorianLogging && panel.logIntervalSeconds && penObj?.loggingEnabled !== false) {
                routeTelemetryToHistorian({
                  numVal,
                  topic: penTopic || panel.topic,
                  penId,
                  panelId: panel.panelId,
                  sourceType: 'mqtt',
                  sourceMode: 'pen',
                  logIntervalSeconds: panel.logIntervalSeconds,
                  loggingEnabled: penObj?.loggingEnabled !== false
                });
              }
            });
          }

          // 2. Process primary panel value (for single pen mode or standard panels)
          let primaryNumVal: number | null = null;
          let primaryValToParse = extracted;
          if (panel.jsonPath && (typeof extracted !== 'number' || isNaN(extracted))) {
            const extractedJson = getJsonValue(payloadStr, panel.jsonPath);
            if (extractedJson !== undefined) {
              primaryValToParse = extractedJson;
            }
          }
          const parsedPrimary = typeof primaryValToParse === 'number' ? primaryValToParse : parseFloat(String(primaryValToParse ?? ''));
          if (!isNaN(parsedPrimary)) {
            primaryNumVal = parsedPrimary;
          }

          let updatedPrimaryId = currentIdArr;
          let updatedPrimaryTop = currentTopArr;
          if (primaryNumVal !== null) {
            const newPoint = { value: primaryNumVal, time: timeStr, timestampMs: Date.now() };
            updatedPrimaryId = [...currentIdArr, newPoint].slice(-3600);
            if (top) {
              updatedPrimaryTop = [...currentTopArr, newPoint].slice(-3600);
            }

            if (panel.type === PanelType.LINE_GRAPH && panel.enableHistorianLogging && panel.logIntervalSeconds && (!panel.pens || panel.pens.length === 0)) {
              if (panel.topic) {
                routeTelemetryToHistorian({
                  numVal: primaryNumVal,
                  topic: panel.topic,
                  panelId: panel.panelId,
                  sourceType: 'mqtt',
                  sourceMode: 'primary',
                  logIntervalSeconds: panel.logIntervalSeconds,
                  loggingEnabled: true
                });
              }
            }
          }

          return {
            ...prev,
            [pId]: updatedPrimaryId,
            ...(top ? { [top]: updatedPrimaryTop } : {}),
            ...multiPenUpdates
          };
        });
      }
    });

    // 3. Centralized Historian Engine continuous logging for MQTT Tags
    const histCfg = appStateRef.current.historianConfig;
    const globalHistEnabled = histCfg?.enabled !== false;
    const globalInterval = histCfg?.logIntervalSeconds || 10;

    if (globalHistEnabled && appStateRef.current.historianTags) {
      let parsedPayload: any = null;
      try {
        parsedPayload = JSON.parse(payloadStr);
      } catch {
        parsedPayload = payloadStr;
      }

      appStateRef.current.historianTags.forEach(ht => {
        if (ht.enabled !== false && ht.sourceType === 'mqtt' && ht.topic) {
          if (mqttWildcardMatch(ht.topic, topic)) {
            let histNum: number | null = null;
            if (ht.jsonPath) {
              const val = getJsonValue(payloadStr, ht.jsonPath);
              if (typeof val === 'number') histNum = val;
              else if (val !== undefined) histNum = parseFloat(String(val));
            } else {
              if (typeof parsedPayload === 'number') histNum = parsedPayload;
              else histNum = parseFloat(String(parsedPayload ?? payloadStr));
            }
            if (histNum !== null && !isNaN(histNum)) {
              const effectiveInterval = ht.useCustomInterval && ht.customIntervalSeconds ? ht.customIntervalSeconds : globalInterval;
              routeTelemetryToHistorian({
                numVal: histNum,
                topic: ht.topic,
                tagId: ht.id,
                sourceType: 'mqtt',
                sourceMode: 'historian_tag',
                logIntervalSeconds: effectiveInterval,
                historianConfig: histCfg
              });
            }
          }
        }
      });
    }
  }, []);

  // MQTT Connection Manager
  useEffect(() => {
    if (!activeConnection || isSimulated) {
      if (clientRef.current) {
        clientRef.current.end(true);
        clientRef.current = null;
      }
      setMqttConnected(false);
      return;
    }

    try {
      const brokerUrl = formatBrokerWebSocketUrl(activeConnection);
      console.log('Connecting to MQTT Broker:', brokerUrl);

      const client = mqtt.connect(brokerUrl, {
        clientId: activeConnection.clientId || `tasc_${Math.random().toString(16).substring(2, 8)}`,
        username: activeConnection.username || undefined,
        password: activeConnection.password || undefined,
        clean: activeConnection.cleanSession,
        keepalive: activeConnection.keepAlive || 60,
        reconnectPeriod: 5000,
        connectTimeout: 10000
      });

      clientRef.current = client;

      client.on('connect', () => {
        setMqttConnected(true);
        console.log('MQTT Connected successfully to', activeConnection.connectionName);
      });

      client.on('message', (topic, message) => {
        processIncomingMessage(topic, message.toString());
      });

      client.on('error', (err) => {
        console.warn('MQTT connection error:', err);
        setMqttConnected(false);
      });

      client.on('close', () => {
        setMqttConnected(false);
      });

      return () => {
        if (client) {
          client.end(true);
        }
      };
    } catch (err) {
      console.warn('Failed to initialize MQTT connection:', err);
      setMqttConnected(false);
    }
  }, [
    activeConnection?.connectionId, 
    activeConnection?.brokerAddress, 
    activeConnection?.port, 
    activeConnection?.protocol, 
    isSimulated, 
    processIncomingMessage
  ]);

  // MQTT Dynamic Topic Subscriptions Manager
  useEffect(() => {
    if (!mqttConnected || !clientRef.current || isSimulated) return;

    const topicsToSubscribe = new Set<string>();

    appState.panels.forEach(panel => {
      const rawTopics = [panel.topic?.trim(), panel.publishTopic?.trim(), panel.tripTopic?.trim()].filter(Boolean) as string[];
      rawTopics.forEach(rawTopic => {
        topicsToSubscribe.add(rawTopic);
        if (activeDashboard?.prefixTopic) {
          topicsToSubscribe.add(`${activeDashboard.prefixTopic.trim()}${rawTopic}`);
        }
      });
    });

    if (activeDashboard?.prefixTopic && activeDashboard.prefixTopic.trim()) {
      const p = activeDashboard.prefixTopic.trim();
      topicsToSubscribe.add(p.endsWith('/') ? `${p}#` : `${p}/#`);
    }

    topicsToSubscribe.forEach(topic => {
      try {
        clientRef.current?.subscribe(topic, { qos: 0 }, (err) => {
          if (err) {
            console.warn(`Failed to subscribe to topic ${topic}:`, err);
          } else {
            console.log(`Subscribed to topic: ${topic}`);
          }
        });
      } catch (e) {
        console.warn(`Error subscribing to ${topic}:`, e);
      }
    });
  }, [mqttConnected, appState.panels, activeDashboard?.prefixTopic, isSimulated]);

  // Demo Data Simulation Engine
  useEffect(() => {
    if (!isSimulated) return;

    const interval = setInterval(() => {
      const timeStr = new Date().toLocaleTimeString();

      activePanels.forEach(panel => {
        if (panel.dataSourceMode === 'driver') return;
        let simVal: any;

        switch (panel.type) {
          case PanelType.GAUGE: {
            const min = panel.payloadMin ?? 10;
            const max = panel.payloadMax ?? 50;
            const prev = latestValues[panel.panelId]?.val ?? (min + (max - min) / 2);
            simVal = Math.max(min, Math.min(max, prev + (Math.random() - 0.48) * 3));
            break;
          }
          case PanelType.LINE_GRAPH: {
            const prev = latestValues[panel.panelId]?.val ?? 12.5;
            simVal = Math.max(0, prev + (Math.random() - 0.49) * 2.5);
            break;
          }
          case PanelType.PROGRESS: {
            const prev = latestValues[panel.panelId]?.val ?? 80;
            simVal = Math.max(10, Math.min(100, prev + (Math.random() - 0.52) * 2));
            break;
          }
          case PanelType.LED:
            simVal = Math.random() > 0.3 ? '1' : '0';
            break;
          case PanelType.NODE_STATUS:
            simVal = 'online';
            break;
          case PanelType.IMAGE:
          case 'image' as any:
          case 'symbol' as any: {
            if (panel.symbolId || panel.symbolAnimType) {
              const min = panel.payloadMin ?? 0;
              const max = panel.payloadMax ?? 100;
              const prev = latestValues[panel.panelId]?.val ?? (min + (max - min) * 0.85);
              simVal = Math.max(min, Math.min(max, prev + (Math.random() - 0.48) * 3));
            } else {
              return;
            }
            break;
          }
          default:
            return;
        }

        setLatestValues(prev => {
          const existing = prev[panel.panelId];
          return {
            ...prev,
            [panel.panelId]: {
              val: simVal,
              time: timeStr,
              sentTime: existing?.sentTime
            }
          };
        });

        const numVal = typeof simVal === 'number' ? simVal : parseFloat(simVal);
        if (!isNaN(numVal)) {
          setHistoryValues(prev => {
            const pId = panel.panelId;
            const top = panel.topic;
            const currentIdArr = prev[pId] || [];
            const currentTopArr = top ? (prev[top] || []) : [];
            const newPoint = { value: numVal, time: timeStr };
            return {
              ...prev,
              [pId]: [...currentIdArr, newPoint].slice(-200),
              ...(top ? { [top]: [...currentTopArr, newPoint].slice(-200) } : {})
            };
          });

          if (panel.type === PanelType.LINE_GRAPH && panel.enableHistorianLogging && panel.logIntervalSeconds) {
            routeTelemetryToHistorian({
              numVal,
              topic: panel.topic,
              panelId: panel.panelId,
              sourceType: 'mqtt',
              sourceMode: 'primary',
              logIntervalSeconds: panel.logIntervalSeconds,
              loggingEnabled: true
            });
          }
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [isSimulated, activePanels, latestValues]);

  // Core MQTT Publish Execution
  const executePublish = (topic: string, payload: string | number) => {
    if (onResetRuntimeTimeout) {
      onResetRuntimeTimeout();
    }
    const timeStr = new Date().toLocaleTimeString();
    const payloadStr = String(payload);

    // Driver Tag write path
    const driverPanel = appState.panels.find(p =>
      p.dataSourceMode === 'driver' &&
      (p.driverWriteTagId || p.driverTagId) &&
      (p.topic === topic || p.publishTopic === topic || !p.topic)
    );

    if (driverPanel) {
      const tagId = driverPanel.driverWriteTagId || driverPanel.driverTagId;
      if (tagId) {
        const tag = getDriverTagById(appState, tagId);
        if (tag && driverBridgeClientRef?.current) {
          driverBridgeClientRef.current.writeTag(tag.tagId, tag.connectionId, payload);
          return;
        }
      }
    }

    if (clientRef.current && clientRef.current.connected) {
      clientRef.current.publish(topic, payloadStr);
    }

    setMqttLogs(prev => [
      {
        id: `pub_${Date.now()}`,
        topic,
        payload: `[PUBLISHED] ${payloadStr}`,
        timestamp: timeStr
      },
      ...prev.slice(0, 99)
    ]);

    const currentDash = activeDashboardRef.current;
    const prefix = currentDash?.prefixTopic ? currentDash.prefixTopic.trim() : '';

    appState.panels.forEach(p => {
      const rawTopics = [p.topic?.trim(), p.publishTopic?.trim()].filter(Boolean) as string[];
      const isMatch = rawTopics.some(rt => {
        const fullTopic = p.disableDashboardPrefix ? rt : `${prefix}${rt}`;
        return topic === rt || topic === fullTopic || topic.endsWith('/' + rt) || topic.endsWith(rt);
      });

      if (isMatch) {
        let extractedVal: any = payload;
        if (p.isJSONPayload || p.jsonPath || (typeof payload === 'string' && (payload.startsWith('{') || payload.startsWith('[')))) {
          const parsed = getJsonValue(payload, p.jsonPath || '');
          if (parsed !== undefined) {
            extractedVal = parsed;
          }
        }
        setLatestValues(prev => {
          const existing = prev[p.panelId];
          return {
            ...prev,
            [p.panelId]: {
              val: extractedVal,
              time: existing?.time || '',
              sentTime: timeStr
            }
          };
        });
      }
    });
  };

  return {
    latestValues,
    setLatestValues,
    historyValues,
    setHistoryValues,
    mqttLogs,
    mqttConnected,
    isSimulated,
    setIsSimulated,
    nowMs,
    clientRef,
    executePublish,
    processIncomingMessage
  };
}
