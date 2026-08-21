import { useState, useEffect, useRef } from 'react';
import { Panel, ActiveAlarm } from '../types';
import { evaluateAlarms } from '../services/alarmEvaluator';
import { recordAlarmTriggerEvent, recordAlarmAckEvent, recordAlarmResolvedEvent } from '../utils/alarmHistorianEngine';
import { triggerHaptic, stopHaptic, triggerAckHaptic } from '../utils/hapticFeedback';

export interface UseAlarmEngineProps {
  panels: Panel[];
  latestValues: Record<string, { val: any; time: string; rawPayload?: any }>;
}

export function useAlarmEngine({ panels, latestValues }: UseAlarmEngineProps) {
  const [activeAlarms, setActiveAlarms] = useState<ActiveAlarm[]>([]);
  const [isAlarmModalOpen, setIsAlarmModalOpen] = useState(false);
  const [isAlarmHistorianModalOpen, setIsAlarmHistorianModalOpen] = useState(false);
  const [isFddModalOpen, setIsFddModalOpen] = useState(false);
  const [isVibrateEnabled, setIsVibrateEnabled] = useState(true);
  const [isSoundEnabled, setIsSoundEnabled] = useState(true);
  const [isAutoPopupEnabled, setIsAutoPopupEnabled] = useState(true);
  const [acknowledgedAlarms, setAcknowledgedAlarms] = useState<Record<string, boolean>>({});
  const [latestAlarmTriggered, setLatestAlarmTriggered] = useState<ActiveAlarm | null>(null);

  const prevAlarmKeysRef = useRef<string[]>([]);
  const prevAlarmCountRef = useRef<number>(0);

  // Live Alarm Evaluation Loop
  useEffect(() => {
    const newAlarmsList = evaluateAlarms(panels, latestValues, acknowledgedAlarms);

    setActiveAlarms(newAlarmsList);

    // 1. Record triggered events into Historian Engine
    newAlarmsList.forEach(alarm => {
      const panelObj = panels.find(p => p.panelId === alarm.panelId);
      recordAlarmTriggerEvent({
        alarmKey: alarm.alarmKey,
        panelId: alarm.panelId,
        panelName: alarm.panelName,
        dashboardId: alarm.dashboardId,
        zone: alarm.zone,
        value: alarm.value,
        unit: alarm.unit,
        threshold: alarm.threshold,
        message: alarm.message,
        color: alarm.color,
        timestamp: alarm.timestamp,
        topic: panelObj?.topic,
        jsonPath: panelObj?.tripJsonPath || panelObj?.jsonPath
      });
    });

    // 2. Detect cleared alarms and record resolution in Historian Engine
    const currentAlarmKeys = newAlarmsList.map(a => a.alarmKey);
    const clearedKeys = prevAlarmKeysRef.current.filter(k => !currentAlarmKeys.includes(k));
    clearedKeys.forEach(key => {
      recordAlarmResolvedEvent(key);
    });

    // Check if new alarm triggered or alarm count changed
    const newKeysFound = currentAlarmKeys.filter(k => !prevAlarmKeysRef.current.includes(k));
    const countChanged = newAlarmsList.length !== prevAlarmCountRef.current;

    if (newKeysFound.length > 0 || (countChanged && newAlarmsList.length > prevAlarmCountRef.current)) {
      const newestAlarm = newAlarmsList.find(a => newKeysFound.includes(a.alarmKey)) || newAlarmsList[newAlarmsList.length - 1];
      if (newestAlarm) {
        setLatestAlarmTriggered(newestAlarm);
      }

      // Automatically open alarm pop-up modal IF auto-popup is enabled
      if (isAutoPopupEnabled) {
        setIsAlarmModalOpen(true);
      }
    }

    prevAlarmKeysRef.current = currentAlarmKeys;
    prevAlarmCountRef.current = newAlarmsList.length;
  }, [latestValues, panels, acknowledgedAlarms, isAutoPopupEnabled]);

  // Dedicated 5-Second Recurring Mobile Haptic & Industrial Alarm Sound Siren Loop
  useEffect(() => {
    const unackAlarmsCount = activeAlarms.filter(a => !a.acknowledged).length;

    if (unackAlarmsCount === 0 || typeof window === 'undefined') {
      stopHaptic();
      return;
    }

    const triggerHapticAndSound = () => {
      // 1. Mobile Haptic Vibration (Industrial dual-pulse pattern across 5s if enabled)
      if (isVibrateEnabled) {
        triggerHaptic([400, 150, 400, 150, 400]);
      }

      // 2. Web Audio Dual-Tone Industrial Alarm Siren Sound Pulse (if sound enabled)
      if (isSoundEnabled) {
        try {
          const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            const ctx = new AudioContextClass();
            if (ctx.state === 'suspended') {
              ctx.resume();
            }
            const now = ctx.currentTime;
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();

            osc.type = 'sawtooth';
            osc.frequency.setValueAtTime(880, now);
            osc.frequency.setValueAtTime(660, now + 0.15);
            osc.frequency.setValueAtTime(880, now + 0.30);

            gain.gain.setValueAtTime(0.15, now);
            gain.gain.exponentialRampToValueAtTime(0.001, now + 0.45);

            osc.connect(gain);
            gain.connect(ctx.destination);
            osc.start(now);
            osc.stop(now + 0.45);
          }
        } catch {}
      }
    };

    triggerHapticAndSound();
    const hapticInterval = setInterval(triggerHapticAndSound, 5000);

    return () => {
      clearInterval(hapticInterval);
      stopHaptic();
    };
  }, [activeAlarms, isVibrateEnabled, isSoundEnabled]);

  const handleAcknowledgeAlarm = (alarmKey: string) => {
    triggerAckHaptic();
    setAcknowledgedAlarms(prev => ({ ...prev, [alarmKey]: true }));
    recordAlarmAckEvent(alarmKey);
  };

  const handleAcknowledgeAllAlarms = () => {
    triggerAckHaptic();
    const updated: Record<string, boolean> = {};
    activeAlarms.forEach(a => {
      updated[a.alarmKey] = true;
      recordAlarmAckEvent(a.alarmKey);
    });
    setAcknowledgedAlarms(prev => ({ ...prev, ...updated }));
  };

  return {
    activeAlarms,
    acknowledgedAlarms,
    latestAlarmTriggered,
    isAlarmModalOpen,
    setIsAlarmModalOpen,
    isAlarmHistorianModalOpen,
    setIsAlarmHistorianModalOpen,
    isFddModalOpen,
    setIsFddModalOpen,
    isVibrateEnabled,
    setIsVibrateEnabled,
    isSoundEnabled,
    setIsSoundEnabled,
    isAutoPopupEnabled,
    setIsAutoPopupEnabled,
    handleAcknowledgeAlarm,
    handleAcknowledgeAllAlarms
  };
}
