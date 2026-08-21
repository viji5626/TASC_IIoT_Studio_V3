/**
 * TASC IIoT Studio — Background Report Scheduler Engine
 *
 * Provides resilient, single-tab scheduled report execution:
 *  - Supports Daily, Weekly, Monthly, and Interval schedules
 *  - Single-tab leader lock to prevent multi-tab duplicate execution
 *  - Missed-run catch-up recovery upon tab wakeup or page load
 *  - Silent execution with History logging & unread notification badges (no download popups)
 *  - Dispatches 'tasc_scheduled_report_event' for live UI updates
 */

import { ReportSchedule, ReportTemplate } from '../types';
import { getAllTemplateMetas, saveTemplateMeta, generateTemplateReport } from './templateReportEngine';
import { getReportHistory } from './reportEngine';

const SCHEDULER_CHECK_INTERVAL_MS = 30000; // Check every 30 seconds
const LEADER_LOCK_KEY = 'tasc_scheduler_leader_lock';
const LEADER_LOCK_TIMEOUT_MS = 45000;
const TAB_ID = `tab_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

let schedulerTimer: number | null = null;
let isInitialized = false;

/**
 * Calculates the next execution timestamp (ISO string) for a given schedule configuration.
 */
export function calculateNextRunTime(schedule: ReportSchedule, fromTimeMs = Date.now()): string {
  const fromDate = new Date(fromTimeMs);
  const targetHour = schedule.hour ?? 6;
  const targetMinute = schedule.minute ?? 0;

  if (schedule.frequency === 'interval') {
    const mins = Math.max(1, schedule.intervalMinutes ?? 60);
    return new Date(fromTimeMs + mins * 60000).toISOString();
  }

  if (schedule.frequency === 'daily') {
    const next = new Date(fromDate);
    next.setHours(targetHour, targetMinute, 0, 0);
    if (next.getTime() <= fromTimeMs) {
      next.setDate(next.getDate() + 1);
    }
    return next.toISOString();
  }

  if (schedule.frequency === 'weekly') {
    const targetWeekday = schedule.weekday ?? 1; // 1 = Monday default
    const next = new Date(fromDate);
    next.setHours(targetHour, targetMinute, 0, 0);

    const currentWeekday = next.getDay();
    let daysUntil = (targetWeekday - currentWeekday + 7) % 7;
    if (daysUntil === 0 && next.getTime() <= fromTimeMs) {
      daysUntil = 7;
    }
    next.setDate(next.getDate() + daysUntil);
    return next.toISOString();
  }

  if (schedule.frequency === 'monthly') {
    const targetDay = schedule.dayOfMonth ?? 1;
    const next = new Date(fromDate);
    next.setDate(targetDay);
    next.setHours(targetHour, targetMinute, 0, 0);
    if (next.getTime() <= fromTimeMs) {
      next.setMonth(next.getMonth() + 1);
      next.setDate(targetDay);
    }
    return next.toISOString();
  }

  // 'once' or fallback
  return new Date(fromTimeMs + 86400000).toISOString();
}

/**
 * Acquires single-tab leader lock to prevent multi-tab execution conflict.
 */
function tryAcquireLeaderLock(): boolean {
  try {
    const raw = localStorage.getItem(LEADER_LOCK_KEY);
    const now = Date.now();
    if (raw) {
      const lock = JSON.parse(raw);
      if (lock.tabId !== TAB_ID && now - lock.timestamp < LEADER_LOCK_TIMEOUT_MS) {
        return false; // Another tab holds an active lock
      }
    }
    localStorage.setItem(LEADER_LOCK_KEY, JSON.stringify({ tabId: TAB_ID, timestamp: now }));
    return true;
  } catch {
    return true;
  }
}

/**
 * Executes due scheduled reports across all templates.
 */
export async function checkAndExecuteScheduledReports(): Promise<number> {
  if (!tryAcquireLeaderLock()) {
    return 0; // Not the leader tab
  }

  const templates = getAllTemplateMetas();
  const now = Date.now();
  let executedCount = 0;

  for (const template of templates) {
    const schedule = template.schedule;
    if (!schedule || !schedule.enabled) continue;

    // Initialize nextRunAt if missing
    if (!schedule.nextRunAt) {
      schedule.nextRunAt = calculateNextRunTime(schedule, now);
      saveTemplateMeta(template);
      continue;
    }

    const nextRunMs = new Date(schedule.nextRunAt).getTime();
    if (nextRunMs <= now) {
      // Due for execution!
      const lookbackHours = schedule.lookbackHours || (schedule.frequency === 'weekly' ? 168 : schedule.frequency === 'monthly' ? 720 : 24);
      const toMs = now;
      const fromMs = toMs - lookbackHours * 3600000;

      try {
        const result = await generateTemplateReport(template, fromMs, toMs, false, {
          autoDownload: Boolean(schedule.autoDownload),
          isScheduled: true,
          unread: true
        });

        if (result.success) {
          executedCount++;
          schedule.lastRunAt = new Date().toISOString();
          schedule.nextRunAt = calculateNextRunTime(schedule, now);
          saveTemplateMeta({
            ...template,
            schedule,
            lastGeneratedAt: new Date().toISOString()
          });

          // Dispatch window event for live UI update
          window.dispatchEvent(new CustomEvent('tasc_scheduled_report_event', {
            detail: { templateId: template.templateId, title: template.templateName, rowsWritten: result.rowsWritten }
          }));
        }
      } catch (err) {
        console.error(`[Scheduler] Failed executing scheduled report "${template.templateName}":`, err);
      }
    }
  }

  return executedCount;
}

/**
 * Initializes the background report scheduler service.
 * Safe to call multiple times (idempotent).
 */
export function initReportScheduler(): void {
  if (isInitialized) return;
  isInitialized = true;

  // Run initial check upon startup
  checkAndExecuteScheduledReports().catch(() => {});

  // Setup interval ticker
  schedulerTimer = window.setInterval(() => {
    checkAndExecuteScheduledReports().catch(() => {});
  }, SCHEDULER_CHECK_INTERVAL_MS);

  // Setup visibility/focus catch-up listeners (waking up from background tab sleep)
  const onWakeup = () => {
    checkAndExecuteScheduledReports().catch(() => {});
  };

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') onWakeup();
  });
  window.addEventListener('focus', onWakeup);
}

/**
 * Returns the count of unread/new scheduled reports.
 */
export function getUnreadScheduledCount(): number {
  try {
    const history = getReportHistory();
    return history.filter(j => j.isScheduled && j.unread).length;
  } catch {
    return 0;
  }
}

/**
 * Marks all scheduled reports as read.
 */
export function markScheduledReportsRead(): void {
  try {
    const history = getReportHistory();
    let changed = false;
    history.forEach(j => {
      if (j.isScheduled && j.unread) {
        j.unread = false;
        changed = true;
      }
    });
    if (changed) {
      localStorage.setItem('tasc_report_history', JSON.stringify(history));
      window.dispatchEvent(new CustomEvent('tasc_scheduled_report_event', { detail: { markedRead: true } }));
    }
  } catch {}
}
