import fs from 'fs';
import path from 'path';
import nodemailer from 'nodemailer';
import type { SmtpServerConfig } from '../../types/reporting';

export interface EmailAttachment {
  filename: string;
  content: Buffer;
  contentType?: string;
}

export interface SendEmailOptions {
  recipients: string[];
  cc?: string[];
  bcc?: string[];
  subject: string;
  html: string;
  attachments?: EmailAttachment[];
}

export interface EmailSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

const CONFIG_FILE = path.join(process.cwd(), 'data', 'tasc_smtp_config.json');

export class ServerEmailService {
  private config: SmtpServerConfig | null = null;

  constructor() {
    this.loadConfig();
  }

  private loadConfig(): void {
    try {
      if (fs.existsSync(CONFIG_FILE)) {
        const raw = fs.readFileSync(CONFIG_FILE, 'utf8');
        this.config = JSON.parse(raw);
      }
    } catch (err: any) {
      console.error('[ServerEmailService] Failed to load SMTP config:', err.message);
    }
  }

  public getMaskedConfig(): SmtpServerConfig | null {
    if (!this.config) return null;
    return {
      ...this.config,
      password: this.config.password ? '******' : ''
    };
  }

  public saveConfig(newConfig: SmtpServerConfig): void {
    const dataDir = path.join(process.cwd(), 'data');
    if (!fs.existsSync(dataDir)) {
      fs.mkdirSync(dataDir, { recursive: true });
    }

    // Preserve existing password if placeholder was sent
    let passwordToSave = newConfig.password;
    if (passwordToSave === '******' && this.config?.password) {
      passwordToSave = this.config.password;
    }

    this.config = {
      ...newConfig,
      password: passwordToSave
    };

    fs.writeFileSync(CONFIG_FILE, JSON.stringify(this.config, null, 2), 'utf8');
  }

  private createTransporter(customConfig?: SmtpServerConfig) {
    const cfg = customConfig || this.config;
    if (!cfg || !cfg.host) {
      throw new Error('SMTP configuration is not set.');
    }

    const isSecure = Boolean(cfg.secure);
    const transportOptions: any = {
      host: cfg.host,
      port: Number(cfg.port) || 587,
      secure: isSecure,
      tls: {
        rejectUnauthorized: false // Allow self-signed certs in industrial OT networks
      }
    };

    if (cfg.authType !== 'anonymous' && cfg.user) {
      transportOptions.auth = {
        user: cfg.user,
        pass: cfg.password || ''
      };
    }

    return nodemailer.createTransport(transportOptions);
  }

  public async testConnection(customConfig?: SmtpServerConfig, targetEmail?: string): Promise<EmailSendResult> {
    try {
      const cfg = customConfig || this.config;
      if (!cfg || !cfg.host) {
        return { success: false, error: 'SMTP Host is required.' };
      }

      const transporter = this.createTransporter(cfg);
      await transporter.verify();

      if (targetEmail && targetEmail.trim()) {
        const fromAddr = cfg.fromEmail || cfg.user || 'tasc-noreply@local.scada';
        const fromName = cfg.fromName || 'TASC IIoT Studio';

        const info = await transporter.sendMail({
          from: `"${fromName}" <${fromAddr}>`,
          to: targetEmail.trim(),
          subject: '[TASC IIoT Studio] SMTP Test Connection Successful',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; padding: 20px; border: 1px solid #e2e8f0; border-radius: 8px;">
              <h2 style="color: #0284c7; margin-top: 0;">SMTP Test Connection Successful</h2>
              <p>This is a test notification from <strong>TASC IIoT Studio</strong>.</p>
              <p>Your server is properly configured to dispatch automated SCADA reports and trigger-based alerts.</p>
              <hr style="border: none; border-top: 1px solid #e2e8f0; margin: 20px 0;" />
              <small style="color: #64748b;">Host: ${cfg.host}:${cfg.port} | Timestamp: ${new Date().toLocaleString()}</small>
            </div>
          `
        });

        return { success: true, messageId: info.messageId };
      }

      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message || String(err) };
    }
  }

  public async sendReportEmail(
    options: SendEmailOptions,
    context?: Record<string, string | number>,
    customConfig?: SmtpServerConfig
  ): Promise<EmailSendResult> {
    try {
      const cfg = customConfig || this.config;
      if (!cfg || !cfg.host) {
        return { success: false, error: 'SMTP server is not configured.' };
      }

      const transporter = this.createTransporter(cfg);
      const fromAddr = cfg.fromEmail || cfg.user || 'tasc-noreply@local.scada';
      const fromName = cfg.fromName || 'TASC IIoT Studio';

      // Replace placeholders in subject and body
      let subject = options.subject;
      let html = options.html;

      if (context) {
        for (const [key, val] of Object.entries(context)) {
          const regex = new RegExp(`{{${key}}}`, 'g');
          subject = subject.replace(regex, String(val));
          html = html.replace(regex, String(val));
        }
      }

      // 20MB attachment safety check
      const totalBytes = (options.attachments || []).reduce((acc, att) => acc + (att.content?.length || 0), 0);
      if (totalBytes > 20 * 1024 * 1024) {
        console.warn(`[ServerEmailService] Warning: Total attachment size (${(totalBytes / 1048576).toFixed(1)} MB) exceeds 20MB safety limit.`);
      }

      const mailOptions: any = {
        from: `"${fromName}" <${fromAddr}>`,
        to: options.recipients.join(', '),
        subject,
        html,
        attachments: (options.attachments || []).map(att => ({
          filename: att.filename,
          content: att.content,
          contentType: att.contentType
        }))
      };

      if (options.cc && options.cc.length > 0) mailOptions.cc = options.cc.join(', ');
      if (options.bcc && options.bcc.length > 0) mailOptions.bcc = options.bcc.join(', ');

      const info = await transporter.sendMail(mailOptions);
      return { success: true, messageId: info.messageId };
    } catch (err: any) {
      console.error('[ServerEmailService] Failed to send email:', err.message);
      return { success: false, error: err.message || String(err) };
    }
  }
}

export const serverEmailService = new ServerEmailService();
