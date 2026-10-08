import fs from 'fs';
import path from 'path';
import { serverEmailService } from '../email/ServerEmailService';
import type { SmtpServerConfig } from '../../types/reporting';
import type { ServerAlarm } from './ServerAlarmEngine';

export interface AlarmEmailRecipient {
  id: string;
  name: string;
  email: string;
  enabled: boolean;
  severities?: ('critical' | 'high' | 'medium' | 'low')[];
}

export interface AlarmEmailConfig {
  enabled: boolean;
  minSeverity: 'CRITICAL_ONLY' | 'HIGH_AND_CRITICAL' | 'ALL';
  debounceSeconds: number;
  alarmStormThreshold: number;
  alarmStormWindowSeconds: number;
  smtp: SmtpServerConfig;
  recipients: AlarmEmailRecipient[];
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'tasc_alarm_email_config.json');

const DEFAULT_CONFIG: AlarmEmailConfig = {
  enabled: true,
  minSeverity: 'HIGH_AND_CRITICAL',
  debounceSeconds: 120,
  alarmStormThreshold: 5,
  alarmStormWindowSeconds: 60,
  smtp: {
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    authType: 'login',
    user: 'vijay.bsas@gmail.com',
    password: 'txwkulwklpqxcunk',
    fromEmail: 'vijay.bsas@gmail.com',
    fromName: 'TASC Alarm Alerts'
  },
  recipients: [
    {
      id: 'rec_email_1',
      name: 'Vijay TASC',
      email: 'vijay.bsas@gmail.com',
      enabled: true,
      severities: ['critical', 'high']
    }
  ]
};

export class ServerAlarmEmailEngine {
  private static instance: ServerAlarmEmailEngine;
  private config: AlarmEmailConfig = DEFAULT_CONFIG;
  private tagLastSentMap: Map<string, number> = new Map();
  private recentAlarmTimestamps: number[] = [];
  private lastStormSummarySent: number = 0;

  private constructor() {
    this.loadConfig();
  }

  public static getInstance(): ServerAlarmEmailEngine {
    if (!ServerAlarmEmailEngine.instance) {
      ServerAlarmEmailEngine.instance = new ServerAlarmEmailEngine();
    }
    return ServerAlarmEmailEngine.instance;
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        const parsed = JSON.parse(raw);
        this.config = { ...DEFAULT_CONFIG, ...parsed };
      } else {
        // Save default config on first run
        this.saveConfigInternal(DEFAULT_CONFIG);
      }
    } catch (err: any) {
      console.error('[ServerAlarmEmailEngine] Failed to load config:', err.message);
      this.config = DEFAULT_CONFIG;
    }
  }

  private saveConfigInternal(cfg: AlarmEmailConfig): void {
    try {
      const dataDir = path.dirname(CONFIG_FILE);
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      fs.writeFileSync(CONFIG_FILE, JSON.stringify(cfg, null, 2), 'utf8');
    } catch (err: any) {
      console.error('[ServerAlarmEmailEngine] Failed to save config to disk:', err.message);
    }
  }

  public getConfig(): AlarmEmailConfig {
    return {
      ...this.config,
      smtp: {
        ...this.config.smtp,
        password: this.config.smtp.password ? '******' : ''
      }
    };
  }

  public getRawConfig(): AlarmEmailConfig {
    return this.config;
  }

  public saveConfig(newConfig: Partial<AlarmEmailConfig>, operator?: string, ip?: string): AlarmEmailConfig {
    let passwordToSave = newConfig.smtp?.password;
    if (passwordToSave === '******' || !passwordToSave) {
      passwordToSave = this.config.smtp.password;
    }

    this.config = {
      ...this.config,
      ...newConfig,
      smtp: {
        ...this.config.smtp,
        ...(newConfig.smtp || {}),
        password: passwordToSave
      },
      recipients: Array.isArray(newConfig.recipients) ? newConfig.recipients : this.config.recipients
    };

    this.saveConfigInternal(this.config);
    console.log(`[ServerAlarmEmailEngine] Configuration updated by ${operator || 'Admin'} from ${ip || 'local'}`);
    return this.getConfig();
  }

  /**
   * Dispatches a live test email alert to verify SMTP delivery.
   */
  public async sendTestEmail(targetEmail: string): Promise<{ success: boolean; messageId?: string; error?: string }> {
    if (!targetEmail || !targetEmail.trim()) {
      return { success: false, error: 'Recipient email address is required.' };
    }

    const testTime = new Date().toLocaleString();
    const htmlBody = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 12px; overflow: hidden; border: 1px solid #334155; color: #f8fafc;">
        <div style="background: linear-gradient(135deg, #0284c7 0%, #0369a1 100%); padding: 22px 24px; border-bottom: 2px solid #38bdf8;">
          <span style="background: rgba(255, 255, 255, 0.2); color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px;">
            VERIFICATION TEST
          </span>
          <h2 style="color: #ffffff; margin: 10px 0 4px 0; font-size: 20px; font-weight: 700;">
            TASC SCADA Alarm Email Gateway Verified
          </h2>
          <p style="color: #bae6fd; margin: 0; font-size: 13px;">
            Live dispatch test from TASC IIoT Studio Secondary SMTP Engine
          </p>
        </div>

        <div style="padding: 24px;">
          <p style="font-size: 14px; color: #cbd5e1; line-height: 1.5; margin-top: 0;">
            This is an automated verification test verifying that your real-time SCADA alarm notifications can successfully reach your mailbox without delay.
          </p>

          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin: 20px 0;">
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #1e293b;">SMTP Server:</td>
              <td style="padding: 10px 0; color: #38bdf8; font-weight: 600; font-family: monospace; border-bottom: 1px solid #1e293b; text-align: right;">${this.config.smtp.host}:${this.config.smtp.port}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #1e293b;">Sender Account:</td>
              <td style="padding: 10px 0; color: #f8fafc; font-weight: 600; border-bottom: 1px solid #1e293b; text-align: right;">${this.config.smtp.fromEmail || this.config.smtp.user}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #1e293b;">Verified Recipient:</td>
              <td style="padding: 10px 0; color: #10b981; font-weight: 700; border-bottom: 1px solid #1e293b; text-align: right;">${targetEmail.trim()}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8;">Dispatch Time:</td>
              <td style="padding: 10px 0; color: #cbd5e1; text-align: right;">${testTime}</td>
            </tr>
          </table>

          <div style="padding: 12px 16px; background: #1e293b; border-left: 4px solid #10b981; border-radius: 6px; font-size: 12px; color: #cbd5e1;">
            ✓ Real-time SCADA alarms will automatically trigger high-priority alerts to this email address when critical thresholds are breached.
          </div>
        </div>

        <div style="background: #020617; padding: 14px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
          TASC IIoT Studio &bull; Industrial Process Automation &bull; Automated Telemetry Service
        </div>
      </div>
    `;

    try {
      const res = await serverEmailService.sendReportEmail(
        {
          recipients: [targetEmail.trim()],
          subject: '[TASC SCADA] ✓ Alarm Email Alert Verification Successful',
          html: htmlBody
        },
        undefined,
        this.config.smtp
      );

      if (res.success) {
        console.log(`[ServerAlarmEmailEngine] Test email delivered to ${targetEmail} (MessageId: ${res.messageId})`);
        return { success: true, messageId: res.messageId };
      } else {
        console.error(`[ServerAlarmEmailEngine] Failed to dispatch test email:`, res.error);
        return { success: false, error: res.error || 'SMTP delivery failed' };
      }
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  }

  /**
   * Formats and dispatches an alarm email alert to all qualified recipients.
   */
  public async sendAlarmAlert(alarm: ServerAlarm): Promise<{ dispatched: number; debounced: boolean; stormSuppressed: boolean }> {
    if (!this.config.enabled) {
      return { dispatched: 0, debounced: false, stormSuppressed: false };
    }

    const now = Date.now();

    // 1. Severity Qualification
    const sev = alarm.severity;
    if (this.config.minSeverity === 'CRITICAL_ONLY' && sev !== 'critical') {
      return { dispatched: 0, debounced: false, stormSuppressed: false };
    }
    if (this.config.minSeverity === 'HIGH_AND_CRITICAL' && sev !== 'critical' && sev !== 'high') {
      return { dispatched: 0, debounced: false, stormSuppressed: false };
    }

    // 2. Per-Tag Debounce Check
    const debounceMs = (this.config.debounceSeconds || 120) * 1000;
    const lastSent = this.tagLastSentMap.get(alarm.tagId);
    if (lastSent && (now - lastSent) < debounceMs) {
      console.log(`[ServerAlarmEmailEngine] ⏸ Email debounced for tag ${alarm.tagId} (sent ${(now - lastSent) / 1000}s ago)`);
      return { dispatched: 0, debounced: true, stormSuppressed: false };
    }

    // 3. Alarm Storm Detection
    const windowMs = (this.config.alarmStormWindowSeconds || 60) * 1000;
    this.recentAlarmTimestamps = this.recentAlarmTimestamps.filter(t => (now - t) < windowMs);
    this.recentAlarmTimestamps.push(now);

    const stormThreshold = this.config.alarmStormThreshold || 5;
    if (this.recentAlarmTimestamps.length > stormThreshold) {
      if ((now - this.lastStormSummarySent) > windowMs) {
        this.lastStormSummarySent = now;
        await this.dispatchStormSummary(this.recentAlarmTimestamps.length);
      }
      return { dispatched: 0, debounced: false, stormSuppressed: true };
    }

    // 4. Dispatch Email to active recipients
    const activeRecipients = this.config.recipients.filter(r => {
      if (!r.enabled) return false;
      if (r.severities && r.severities.length > 0 && !r.severities.includes(alarm.severity as any)) {
        return false;
      }
      return Boolean(r.email && r.email.includes('@'));
    });

    if (activeRecipients.length === 0) {
      return { dispatched: 0, debounced: false, stormSuppressed: false };
    }

    const emailHtml = this.formatAlarmHtml(alarm);
    const subject = `[TASC ALARM] ${alarm.severity.toUpperCase()}: ${alarm.tagId} (${alarm.category}) breached threshold!`;

    const recipientEmails = activeRecipients.map(r => r.email.trim());

    try {
      const res = await serverEmailService.sendReportEmail(
        {
          recipients: recipientEmails,
          subject,
          html: emailHtml
        },
        undefined,
        this.config.smtp
      );

      if (res.success) {
        this.tagLastSentMap.set(alarm.tagId, now);
        console.log(`[ServerAlarmEmailEngine] 📧 Alarm Email dispatched to ${recipientEmails.join(', ')} (MessageId: ${res.messageId})`);
        return { dispatched: recipientEmails.length, debounced: false, stormSuppressed: false };
      } else {
        console.error(`[ServerAlarmEmailEngine] Email dispatch error:`, res.error);
        return { dispatched: 0, debounced: false, stormSuppressed: false };
      }
    } catch (err: any) {
      console.error(`[ServerAlarmEmailEngine] Dispatch exception:`, err.message);
      return { dispatched: 0, debounced: false, stormSuppressed: false };
    }
  }

  private async dispatchStormSummary(count: number): Promise<void> {
    const activeEmails = this.config.recipients.filter(r => r.enabled && r.email).map(r => r.email.trim());
    if (activeEmails.length === 0) return;

    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #450a0a; border-radius: 12px; padding: 24px; color: #fecdd3; border: 2px solid #f43f5e;">
        <h2 style="color: #ffffff; margin-top: 0;">⚠️ INDUSTRIAL ALARM STORM DETECTED</h2>
        <p style="font-size: 14px; color: #ffe4e6;">Over <strong>${count} telemetry alarms</strong> triggered within the last 60 seconds.</p>
        <p style="font-size: 13px;">Individual email notifications have been throttled to protect email infrastructure. Please access the TASC SCADA Telemetry Live Alarm Center immediately to inspect the active plant conditions.</p>
      </div>
    `;

    await serverEmailService.sendReportEmail(
      {
        recipients: activeEmails,
        subject: `[TASC URGENT] ⚠️ Alarm Storm Alert: ${count} alarms triggered in last 60s`,
        html
      },
      undefined,
      this.config.smtp
    ).catch(() => {});
  }

  private formatAlarmHtml(alarm: ServerAlarm): string {
    const isCritical = alarm.severity === 'critical';
    const accentColor = isCritical ? '#f43f5e' : '#f59e0b';
    const headerBg = isCritical
      ? 'linear-gradient(135deg, #1e1b4b 0%, #450a0a 100%)'
      : 'linear-gradient(135deg, #1e1b4b 0%, #451a03 100%)';
    const badgeBg = isCritical ? '#be123c' : '#b45309';

    const valStr = typeof alarm.triggerValue === 'number' ? alarm.triggerValue.toFixed(2) : alarm.triggerValue;
    const threshStr = typeof alarm.threshold === 'number' ? alarm.threshold.toFixed(2) : alarm.threshold;
    const timeStr = new Date(alarm.triggerTime).toLocaleString();

    return `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #0f172a; border-radius: 12px; overflow: hidden; border: 1px solid #334155; color: #f8fafc;">
        <div style="background: ${headerBg}; padding: 22px 24px; border-bottom: 3px solid ${accentColor};">
          <span style="background: ${badgeBg}; color: #ffffff; font-size: 11px; font-weight: 800; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase; letter-spacing: 1px;">
            🚨 ${alarm.severity.toUpperCase()} ALARM &bull; ${alarm.category}
          </span>
          <h2 style="color: #ffffff; margin: 10px 0 4px 0; font-size: 21px; font-weight: 700;">
            ${alarm.tagId}
          </h2>
          <p style="color: #cbd5e1; margin: 0; font-size: 13px;">
            ${alarm.message}
          </p>
        </div>

        <div style="padding: 24px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #1e293b;">Telemetry Tag:</td>
              <td style="padding: 10px 0; color: #38bdf8; font-weight: 700; font-family: monospace; font-size: 14px; border-bottom: 1px solid #1e293b; text-align: right;">${alarm.tagId}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #1e293b;">Breached Value:</td>
              <td style="padding: 10px 0; color: ${accentColor}; font-weight: 800; font-family: monospace; font-size: 16px; border-bottom: 1px solid #1e293b; text-align: right;">${valStr}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #1e293b;">Threshold Limit:</td>
              <td style="padding: 10px 0; color: #e2e8f0; font-weight: 700; font-family: monospace; border-bottom: 1px solid #1e293b; text-align: right;">${threshStr} (${alarm.category})</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8; border-bottom: 1px solid #1e293b;">Timestamp:</td>
              <td style="padding: 10px 0; color: #cbd5e1; border-bottom: 1px solid #1e293b; text-align: right;">${timeStr}</td>
            </tr>
            <tr>
              <td style="padding: 10px 0; color: #94a3b8;">Status:</td>
              <td style="padding: 10px 0; color: #fb7185; font-weight: 700; text-align: right;">ACTIVE / UNACKNOWLEDGED</td>
            </tr>
          </table>

          <div style="padding: 14px; background: #1e293b; border-left: 4px solid ${accentColor}; border-radius: 6px; font-size: 12px; color: #cbd5e1; line-height: 1.5;">
            <strong>Operator Action Required:</strong> Log in to the TASC SCADA console or mobile dashboard to inspect plant equipment, acknowledge the alarm, and apply corrective procedures.
          </div>
        </div>

        <div style="background: #020617; padding: 14px 24px; text-align: center; border-top: 1px solid #1e293b; font-size: 11px; color: #64748b;">
          TASC IIoT Studio &bull; Industrial Process Automation &bull; Automated Real-Time Alarm Dispatcher
        </div>
      </div>
    `;
  }
}
