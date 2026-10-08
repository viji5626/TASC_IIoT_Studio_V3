import fs from 'fs';
import path from 'path';
import { serverEmailService } from '../email/ServerEmailService';
import { operatorAuthService } from '../auth/operatorAuthService';
import { resolveCarrierGatewayEmail } from './carrierGateways';
import { ServerAlarm } from '../alarms/ServerAlarmEngine';
import type { SmtpServerConfig } from '../../types/reporting';

export interface SmsRecipient {
  id: string;
  name: string;
  phone: string;
  carrier: string;
  enabled: boolean;
  severities?: ('critical' | 'high' | 'medium' | 'low')[];
}

export interface SmsConfig {
  enabled: boolean;
  providerType: 'carrier_gateway' | 'libresms' | 'httpsms' | 'webhook';
  minSeverity: 'CRITICAL_ONLY' | 'HIGH_AND_CRITICAL' | 'ALL';
  debounceSeconds: number;             // Per-tag debounce window (default 180s)
  alarmStormThreshold: number;         // Trigger storm summary if > N alarms (default 5)
  alarmStormWindowSeconds: number;     // Window for storm detection (default 60s)
  customFromEmail?: string;            // Optional dedicated sender address
  webhookUrl?: string;                 // Optional secondary webhook/SMS API
  useSecondarySmtp?: boolean;          // Whether to use dedicated secondary SMTP
  secondarySmtp?: SmtpServerConfig;    // Dedicated secondary SMTP server config
  libreSmsUrl?: string;                // Local Android phone IP (e.g. http://192.168.1.50:8686)
  recipients: SmsRecipient[];
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'tasc_sms_config.json');

export class ServerSmsEngine {
  private static instance: ServerSmsEngine;
  private config: SmsConfig;

  // Debouncing: tagId -> timestamp (ms) of last dispatched SMS
  private tagLastSentMap: Map<string, number> = new Map();

  // Alarm storm detection: array of alarm trigger timestamps (ms)
  private recentAlarmTimestamps: number[] = [];
  private lastStormSummarySent = 0;

  private constructor() {
    this.config = this.loadConfig();
  }

  public static getInstance(): ServerSmsEngine {
    if (!ServerSmsEngine.instance) {
      ServerSmsEngine.instance = new ServerSmsEngine();
    }
    return ServerSmsEngine.instance;
  }

  private getDefaultConfig(): SmsConfig {
    return {
      enabled: false,
      providerType: 'carrier_gateway',
      minSeverity: 'HIGH_AND_CRITICAL',
      debounceSeconds: 180,
      alarmStormThreshold: 5,
      alarmStormWindowSeconds: 60,
      recipients: []
    };
  }

  public loadConfig(): SmsConfig {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        return { ...this.getDefaultConfig(), ...JSON.parse(raw) };
      }
    } catch (err: any) {
      console.error('[ServerSmsEngine] Failed to load SMS config:', err.message);
    }
    return this.getDefaultConfig();
  }

  public saveConfig(newConfig: Partial<SmsConfig>, operatorUsername?: string, ip?: string): SmsConfig {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Preserve existing secondary password if placeholder '******' is submitted
    let secondarySmtpToSave = newConfig.secondarySmtp;
    if (secondarySmtpToSave) {
      if (secondarySmtpToSave.password === '******' && this.config.secondarySmtp?.password) {
        secondarySmtpToSave = {
          ...secondarySmtpToSave,
          password: this.config.secondarySmtp.password
        };
      }
    }

    this.config = {
      ...this.config,
      ...newConfig,
      secondarySmtp: secondarySmtpToSave !== undefined ? secondarySmtpToSave : this.config.secondarySmtp
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
    console.log('[ServerSmsEngine] SMS configuration saved successfully.');

    // Audit entry
    try {
      operatorAuthService.appendAuditEvent({
        username: operatorUsername || 'system',
        displayName: operatorUsername || 'System',
        action: 'system_setting_change' as any,
        success: true,
        ip: ip || null,
        details: { setting: 'sms_alert_config', enabled: this.config.enabled, recipientCount: this.config.recipients.length }
      });
    } catch (e) {
      // Ignore if audit service is not active
    }

    return this.getConfig();
  }

  public getConfig(): SmsConfig {
    if (!this.config.secondarySmtp) return this.config;
    return {
      ...this.config,
      secondarySmtp: {
        ...this.config.secondarySmtp,
        password: this.config.secondarySmtp.password ? '******' : ''
      }
    };
  }

  /**
   * Health check for LibreSMS local gateway on the Android phone.
   */
  public async checkLibreSmsHealth(customUrl?: string): Promise<{ success: boolean; message: string; latencyMs?: number }> {
    const targetUrl = (customUrl || this.config.libreSmsUrl || 'http://192.168.1.50:8686').replace(/\/+$/, '');
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${targetUrl}/health`, {
        method: 'GET',
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;
      if (res.ok) {
        return { success: true, message: `LibreSMS Phone Gateway Online (${latencyMs}ms)`, latencyMs };
      } else {
        return { success: false, message: `LibreSMS returned HTTP ${res.status}`, latencyMs };
      }
    } catch (err: any) {
      return { success: false, message: `Unreachable: ${err.message}. Ensure Android phone is on the same Wi-Fi and LibreSMS is started.` };
    }
  }

  /**
   * Dispatches a single test SMS to verify phone number and gateway delivery.
   */
  public async sendTestSms(
    phone: string,
    carrierId: string,
    customMsg?: string,
    operatorUsername?: string,
    ip?: string,
    customLibreSmsUrl?: string
  ): Promise<{ success: boolean; messageId?: string; error?: string; gatewayEmail?: string; provider?: string }> {
    const testText = customMsg?.trim() || `[TASC ALARM] TEST: Gateway verification at ${new Date().toLocaleTimeString()}. Reply not required.`;
    const cleanText = testText.slice(0, 160);

    // If provider is LibreSMS (Local Android Gateway) or carrierId is explicitly libresms
    const isLibre = carrierId === 'libresms' || this.config.providerType === 'libresms';
    if (isLibre) {
      const targetUrl = (customLibreSmsUrl || this.config.libreSmsUrl || 'http://192.168.1.50:8686').replace(/\/+$/, '');
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 12000);

        const res = await fetch(`${targetUrl}/sendsms`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            to: phone.trim(),
            phone: phone.trim(),
            message: cleanText
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data: any = await res.json().catch(() => ({}));
        if (res.ok && data.Success !== false && data.success !== false) {
          console.log(`[ServerSmsEngine] LibreSMS dispatched to ${phone} via ${targetUrl}`);
          return {
            success: true,
            messageId: `libresms_${Date.now()}`,
            provider: 'libresms'
          };
        } else {
          return {
            success: false,
            error: data.Message || data.message || `LibreSMS HTTP ${res.status}`,
            provider: 'libresms'
          };
        }
      } catch (err: any) {
        return {
          success: false,
          error: `LibreSMS Error (${targetUrl}): ${err.message}. Ensure phone is on the same Wi-Fi/Tailscale and the LibreSMS app gateway is started.`,
          provider: 'libresms'
        };
      }
    }

    const gatewayRes = resolveCarrierGatewayEmail(phone, carrierId);
    if (gatewayRes.error || !gatewayRes.email) {
      return { success: false, error: gatewayRes.error || 'Failed to resolve carrier gateway email.' };
    }

    try {
      const activeSmtp = (this.config.useSecondarySmtp && this.config.secondarySmtp?.host)
        ? this.config.secondarySmtp
        : undefined;

      const result = await serverEmailService.sendReportEmail(
        {
          recipients: [gatewayRes.email],
          subject: '[TASC TEST]',
          html: cleanText
        },
        undefined,
        activeSmtp
      );

      if (!result.success) {
        return {
          success: false,
          error: result.error || 'SMTP dispatch failed',
          gatewayEmail: gatewayRes.email,
          provider: 'carrier_gateway'
        };
      }

      console.log(`[ServerSmsEngine] Test SMS dispatched to ${gatewayRes.email} (MessageId: ${result.messageId})`);

      // Audit log
      try {
        operatorAuthService.appendAuditEvent({
          username: operatorUsername || 'admin',
          displayName: operatorUsername || 'Admin',
          action: 'system_setting_change' as any,
          success: true,
          ip: ip || null,
          details: { action: 'send_test_sms', phone: phone.replace(/.(?=.{4})/g, '*'), carrier: carrierId, gatewayEmail: gatewayRes.email }
        });
      } catch (e) { }

      return {
        success: true,
        messageId: result.messageId,
        gatewayEmail: gatewayRes.email,
        provider: 'carrier_gateway'
      };
    } catch (err: any) {
      console.error(`[ServerSmsEngine] Failed to dispatch test SMS to ${gatewayRes.email}:`, err.message);
      return {
        success: false,
        error: `SMTP Gateway Dispatch Error: ${err.message}`,
        gatewayEmail: gatewayRes.email,
        provider: 'carrier_gateway'
      };
    }
  }

  /**
   * Formats an alarm into a standardized, strict 160-character industrial SMS string.
   */
  public formatAlarmSms(alarm: ServerAlarm): string {
    const timeStr = new Date(alarm.triggerTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: false });
    const sev = alarm.severity.toUpperCase();
    const tag = alarm.tagName || alarm.tagId;
    const val = typeof alarm.triggerValue === 'number' ? alarm.triggerValue.toFixed(2) : alarm.triggerValue;
    const cat = alarm.category;
    const limit = typeof alarm.threshold === 'number' ? alarm.threshold.toFixed(2) : alarm.threshold;
    const detail = alarm.message ? `${alarm.message} [${val} / ${limit}]` : `${tag} = ${val} (${cat} ${limit})`;

    const msg = `[TASC] ${sev}: ${detail} at ${timeStr}. Check SCADA.`;
    return msg.slice(0, 160);
  }

  /**
   * Evaluates and dispatches SMS alerts for an active alarm transition.
   * Handles per-tag debounce and global alarm storm throttling.
   */
  public async sendAlarmAlert(alarm: ServerAlarm): Promise<{ dispatched: number; debounced: boolean; stormSuppressed: boolean }> {
    if (!this.config.enabled) {
      return { dispatched: 0, debounced: false, stormSuppressed: false };
    }

    const now = Date.now();

    // 1. Check severity qualification
    const sev = alarm.severity;
    if (this.config.minSeverity === 'CRITICAL_ONLY' && sev !== 'critical') {
      return { dispatched: 0, debounced: false, stormSuppressed: false };
    }
    if (this.config.minSeverity === 'HIGH_AND_CRITICAL' && sev !== 'critical' && sev !== 'high') {
      return { dispatched: 0, debounced: false, stormSuppressed: false };
    }

    // 2. Per-Alarm Debounce Check
    const debounceMs = (this.config.debounceSeconds || 180) * 1000;
    const lastSent = this.tagLastSentMap.get(alarm.tagId);
    if (lastSent && (now - lastSent) < debounceMs) {
      console.log(`[ServerSmsEngine] ⏸ SMS debounced for tag ${alarm.tagId} (sent ${(now - lastSent) / 1000}s ago, window is ${this.config.debounceSeconds}s)`);
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
        const stormMessage = `[TASC ALARM STORM] ⚠️ ${this.recentAlarmTimestamps.length} alarms triggered in last 60s! Check SCADA console immediately.`;
        await this.dispatchToRecipients(stormMessage, 'critical');
      }
      return { dispatched: 0, debounced: false, stormSuppressed: true };
    }

    // 4. Normal Dispatch
    const smsText = this.formatAlarmSms(alarm);
    const count = await this.dispatchToRecipients(smsText, alarm.severity);

    if (count > 0) {
      this.tagLastSentMap.set(alarm.tagId, now);
    }

    return { dispatched: count, debounced: false, stormSuppressed: false };
  }

  /**
   * Internal dispatcher across all enabled recipients.
   */
  private async dispatchToRecipients(message: string, severity: string): Promise<number> {
    const activeRecipients = this.config.recipients.filter(r => {
      if (!r.enabled) return false;
      if (r.severities && r.severities.length > 0 && !r.severities.includes(severity as any)) {
        return false;
      }
      return true;
    });

    let dispatchedCount = 0;

    if (this.config.providerType === 'libresms') {
      const targetUrl = (this.config.libreSmsUrl || 'http://192.168.1.50:8686').replace(/\/+$/, '');
      for (const recipient of activeRecipients) {
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 12000);

          const res = await fetch(`${targetUrl}/sendsms`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              to: recipient.phone.trim(),
              phone: recipient.phone.trim(),
              message
            }),
            signal: controller.signal
          });
          clearTimeout(timeoutId);

          const data: any = await res.json().catch(() => ({}));
          if (res.ok && data.Success !== false && data.success !== false) {
            dispatchedCount++;
            console.log(`[ServerSmsEngine] 📱 LibreSMS Alert dispatched to ${recipient.name} (${recipient.phone})`);
          } else {
            console.error(`[ServerSmsEngine] LibreSMS dispatch failed for ${recipient.phone}: ${data.Message || data.message || res.status}`);
          }
        } catch (sendErr: any) {
          console.error(`[ServerSmsEngine] Failed to dispatch LibreSMS to ${recipient.phone}:`, sendErr.message);
        }
      }
      return dispatchedCount;
    }

    for (const recipient of activeRecipients) {
      const res = resolveCarrierGatewayEmail(recipient.phone, recipient.carrier);
      if (res.error || !res.email) {
        console.warn(`[ServerSmsEngine] Skipping recipient ${recipient.name} (${recipient.phone}): ${res.error}`);
        continue;
      }

      try {
        const activeSmtp = (this.config.useSecondarySmtp && this.config.secondarySmtp?.host)
          ? this.config.secondarySmtp
          : undefined;

        const sendRes = await serverEmailService.sendReportEmail(
          {
            recipients: [res.email],
            subject: '[TASC ALARM]',
            html: message
          },
          undefined,
          activeSmtp
        );

        if (sendRes.success) {
          dispatchedCount++;
          console.log(`[ServerSmsEngine] 📱 SMS Alert dispatched to ${recipient.name} (${res.email})`);
        } else {
          console.error(`[ServerSmsEngine] Dispatch failed for ${res.email}:`, sendRes.error);
        }
      } catch (sendErr: any) {
        console.error(`[ServerSmsEngine] Failed to dispatch SMS to ${res.email}:`, sendErr.message);
      }
    }

    return dispatchedCount;
  }
}
