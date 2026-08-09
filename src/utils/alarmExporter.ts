import { HistorianAlarmEntry } from '../types';

/**
 * Converts array of HistorianAlarmEntry to CSV string
 */
export function convertAlarmHistoryToCSV(entries: HistorianAlarmEntry[]): string {
  const headers = [
    'ID',
    'Equipment / Panel Name',
    'Category',
    'MQTT Topic / Read Tag',
    'Trigger Value',
    'Threshold Limit',
    'Unit',
    'Alarm Message',
    'Trigger Time (ISO)',
    'Trigger Time (Local)',
    'Ack Time (ISO)',
    'Resolved Time (ISO)',
    'Duration',
    'Status'
  ];

  const escapeCSV = (str: any) => {
    if (str === null || str === undefined) return '""';
    const val = String(str).replace(/"/g, '""');
    return `"${val}"`;
  };

  const rows = entries.map(e => [
    escapeCSV(e.id),
    escapeCSV(e.panelName),
    escapeCSV(e.category),
    escapeCSV(e.tagTopic),
    escapeCSV(e.triggerValue),
    escapeCSV(e.threshold !== undefined ? e.threshold : ''),
    escapeCSV(e.unit || ''),
    escapeCSV(e.message),
    escapeCSV(e.triggerTime),
    escapeCSV(new Date(e.triggerTime).toLocaleString()),
    escapeCSV(e.ackTime ? new Date(e.ackTime).toLocaleString() : '-'),
    escapeCSV(e.resolvedTime ? new Date(e.resolvedTime).toLocaleString() : '-'),
    escapeCSV(e.duration || 'ACTIVE'),
    escapeCSV(e.status)
  ]);

  return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
}

/**
 * Triggers browser download of CSV file
 */
export function exportAlarmHistoryCSV(entries: HistorianAlarmEntry[], filenamePrefix = 'tasc_alarm_history'): void {
  const csvContent = convertAlarmHistoryToCSV(entries);
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${dateStr}.csv`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Triggers browser download of JSON file
 */
export function exportAlarmHistoryJSON(entries: HistorianAlarmEntry[], filenamePrefix = 'tasc_alarm_history'): void {
  const jsonContent = JSON.stringify(entries, null, 2);
  const blob = new Blob([jsonContent], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);

  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `${filenamePrefix}_${dateStr}.json`;

  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
