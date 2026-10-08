export interface ActiveAlarm {
  alarmKey: string; // `${panelId}_${zone}`
  panelId: string;
  panelName: string;
  panelTitle?: string;
  dashboardId: string;
  zone: 'LOW' | 'MID' | 'HIGH' | 'TRIP' | 'FAULT';
  alarmType?: string;
  value: number;
  currentValue?: number | string;
  unit?: string;
  threshold: number;
  limitThreshold?: number | string;
  message: string;
  color: string;
  timestamp: string;
  triggeredAt?: string | number;
  topic?: string;
  tagId?: string;
  driverTagId?: string;
  acknowledged?: boolean;
}

export interface HistorianAlarmEntry {
  id: string; // Unique GUID/timestamp ID
  alarmKey: string; // Unique key (`${panelId}_${zone}`)
  panelId: string;
  panelName: string;
  dashboardId: string;
  category: 'TRIP' | 'FAULT' | 'HIGH' | 'MID' | 'LOW';
  tagTopic: string; // Topic & JSONPath
  triggerValue: any;
  threshold?: number;
  unit?: string;
  message: string;
  color: string;
  triggerTime: string; // ISO / Local timestamp
  ackTime?: string | null;
  resolvedTime?: string | null;
  duration?: string; // Active duration (e.g. 00:04:12 or 'ACTIVE')
  status: 'ACTIVE_UNACK' | 'ACTIVE_ACK' | 'RESOLVED_UNACK' | 'RESOLVED_ACK';
}
