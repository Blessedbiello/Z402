import nodemailer from 'nodemailer';
import sendgrid from '@sendgrid/mail';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { config } from '../config';
import { logger } from '../utils/logger';

export type EmailProvider = 'sendgrid' | 'aws-ses' | 'smtp' | 'console';

export interface EmailOptions {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  from?: string;
  replyTo?: string;
  attachments?: Array<{
    filename: string;
    content: Buffer | string;
    contentType?: string;
  }>;
}

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  private static provider: EmailProvider;
  private static transporter: nodemailer.Transporter | null = null;
  private static sesClient: SESClient | null = null;
  private static initialized = false;

  /**
   * Initialize email service with the configured provider
   */
  static initialize() {
    if (this.initialized) {
      return;
    }

    this.provider = (config.email.provider as EmailProvider) || 'console';

    switch (this.provider) {
      case 'sendgrid':
        if (!config.email.sendgrid?.apiKey) {
          throw new Error('SendGrid API key is required when using SendGrid provider');
        }
        sendgrid.setApiKey(config.email.sendgrid.apiKey);
        logger.info('Email service initialized with SendGrid');
        break;

      case 'aws-ses':
        if (!config.email.awsSes?.region) {
          throw new Error('AWS SES region is required when using AWS SES provider');
        }
        this.sesClient = new SESClient({
          region: config.email.awsSes.region,
          credentials: config.email.awsSes.accessKeyId && config.email.awsSes.secretAccessKey
            ? {
                accessKeyId: config.email.awsSes.accessKeyId,
                secretAccessKey: config.email.awsSes.secretAccessKey,
              }
            : undefined, // Use default credential chain if not provided
        });
        logger.info('Email service initialized with AWS SES');
        break;

      case 'smtp':
        if (!config.email.smtp?.host) {
          throw new Error('SMTP host is required when using SMTP provider');
        }
        this.transporter = nodemailer.createTransport({
          host: config.email.smtp.host,
          port: config.email.smtp.port || 587,
          secure: config.email.smtp.secure || false,
          auth: config.email.smtp.user && config.email.smtp.password
            ? {
                user: config.email.smtp.user,
                pass: config.email.smtp.password,
              }
            : undefined,
        });
        logger.info('Email service initialized with SMTP');
        break;

      case 'console':
        logger.warn('Email service using console mode (emails will be logged, not sent)');
        break;

      default:
        throw new Error(`Unsupported email provider: ${this.provider}`);
    }

    this.initialized = true;
  }

  /**
   * Send an email using the configured provider
   */
  static async send(options: EmailOptions): Promise<void> {
    if (!this.initialized) {
      this.initialize();
    }

    const from = options.from || config.email.fromAddress;
    const fromName = config.email.fromName;
    const fromEmail = fromName ? `${fromName} <${from}>` : from;

    try {
      switch (this.provider) {
        case 'sendgrid':
          await this.sendViaSendGrid({ ...options, from: fromEmail });
          break;

        case 'aws-ses':
          await this.sendViaAwsSes({ ...options, from: fromEmail });
          break;

        case 'smtp':
          await this.sendViaSmtp({ ...options, from: fromEmail });
          break;

        case 'console':
          this.sendViaConsole({ ...options, from: fromEmail });
          break;
      }

      logger.info('Email sent successfully', {
        provider: this.provider,
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
      });
    } catch (error) {
      logger.error('Failed to send email', {
        provider: this.provider,
        error: error instanceof Error ? error.message : 'Unknown error',
        to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
        subject: options.subject,
      });
      throw error;
    }
  }

  /**
   * Send email via SendGrid
   */
  private static async sendViaSendGrid(options: EmailOptions): Promise<void> {
    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    await sendgrid.send({
      to: recipients,
      from: options.from!,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments?.map(att => ({
        filename: att.filename,
        content: att.content.toString('base64'),
        type: att.contentType,
        disposition: 'attachment',
      })),
    });
  }

  /**
   * Send email via AWS SES
   */
  private static async sendViaAwsSes(options: EmailOptions): Promise<void> {
    if (!this.sesClient) {
      throw new Error('AWS SES client not initialized');
    }

    const recipients = Array.isArray(options.to) ? options.to : [options.to];

    const command = new SendEmailCommand({
      Source: options.from!,
      Destination: {
        ToAddresses: recipients,
      },
      Message: {
        Subject: {
          Data: options.subject,
          Charset: 'UTF-8',
        },
        Body: {
          Html: {
            Data: options.html,
            Charset: 'UTF-8',
          },
          Text: options.text
            ? {
                Data: options.text,
                Charset: 'UTF-8',
              }
            : undefined,
        },
      },
      ReplyToAddresses: options.replyTo ? [options.replyTo] : undefined,
    });

    await this.sesClient.send(command);
  }

  /**
   * Send email via SMTP
   */
  private static async sendViaSmtp(options: EmailOptions): Promise<void> {
    if (!this.transporter) {
      throw new Error('SMTP transporter not initialized');
    }

    await this.transporter.sendMail({
      from: options.from!,
      to: Array.isArray(options.to) ? options.to.join(', ') : options.to,
      replyTo: options.replyTo,
      subject: options.subject,
      html: options.html,
      text: options.text,
      attachments: options.attachments,
    });
  }

  /**
   * Log email to console (development mode)
   */
  private static sendViaConsole(options: EmailOptions): void {
    console.log('\n' + '='.repeat(80));
    console.log('📧 EMAIL (Console Mode)');
    console.log('='.repeat(80));
    console.log(`From: ${options.from}`);
    console.log(`To: ${Array.isArray(options.to) ? options.to.join(', ') : options.to}`);
    console.log(`Subject: ${options.subject}`);
    console.log('-'.repeat(80));
    console.log('HTML Content:');
    console.log(options.html);
    if (options.text) {
      console.log('-'.repeat(80));
      console.log('Text Content:');
      console.log(options.text);
    }
    console.log('='.repeat(80) + '\n');
  }

  /**
   * Send email verification email
   */
  static async sendVerificationEmail(email: string, token: string): Promise<void> {
    const verificationUrl = `${config.frontendUrl}/verify-email?token=${token}`;
    const expiresInHours = 24;

    const template = this.getVerificationEmailTemplate(verificationUrl, expiresInHours);

    await this.send({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, token: string): Promise<void> {
    const resetUrl = `${config.frontendUrl}/reset-password?token=${token}`;
    const expiresInMinutes = 30;

    const template = this.getPasswordResetEmailTemplate(resetUrl, expiresInMinutes);

    await this.send({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send monthly analytics report
   */
  static async sendMonthlyReport(
    email: string,
    merchantName: string,
    reportData: {
      totalRevenue: string;
      totalTransactions: number;
      successRate: number;
      topResources: Array<{ resource: string; revenue: string; count: number }>;
      period: string;
    }
  ): Promise<void> {
    const template = this.getMonthlyReportEmailTemplate(merchantName, reportData);

    await this.send({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send webhook configuration confirmation
   */
  static async sendWebhookConfiguredEmail(
    email: string,
    webhookUrl: string,
    events: string[]
  ): Promise<void> {
    const template = this.getWebhookConfiguredEmailTemplate(webhookUrl, events);

    await this.send({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Send payment notification email
   */
  static async sendPaymentNotification(
    email: string,
    paymentData: {
      amount: string;
      resource: string;
      status: string;
      transactionId?: string;
      paidAt: Date;
    }
  ): Promise<void> {
    const template = this.getPaymentNotificationEmailTemplate(paymentData);

    await this.send({
      to: email,
      subject: template.subject,
      html: template.html,
      text: template.text,
    });
  }

  /**
   * Get verification email template
   */
  private static getVerificationEmailTemplate(
    verificationUrl: string,
    expiresInHours: number
  ): EmailTemplate {
    const subject = 'Verify Your Z402 Account';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Z402</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Zcash Payment Platform</p>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Verify Your Email Address</h2>

    <p>Thank you for signing up with Z402! To complete your registration, please verify your email address by clicking the button below:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${verificationUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Verify Email Address</a>
    </div>

    <p>Or copy and paste this link into your browser:</p>
    <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #666;">
      ${verificationUrl}
    </p>

    <p style="color: #999; font-size: 14px; margin-top: 30px;">
      This link will expire in <strong>${expiresInHours} hours</strong>.
    </p>

    <p style="color: #999; font-size: 14px;">
      If you didn't create a Z402 account, you can safely ignore this email.
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Z402. All rights reserved.</p>
    <p>Secure Zcash payments for the modern web.</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Verify Your Z402 Account

Thank you for signing up with Z402! To complete your registration, please verify your email address by visiting this link:

${verificationUrl}

This link will expire in ${expiresInHours} hours.

If you didn't create a Z402 account, you can safely ignore this email.

---
© ${new Date().getFullYear()} Z402. All rights reserved.
Secure Zcash payments for the modern web.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Get password reset email template
   */
  private static getPasswordResetEmailTemplate(
    resetUrl: string,
    expiresInMinutes: number
  ): EmailTemplate {
    const subject = 'Reset Your Z402 Password';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Z402</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Zcash Payment Platform</p>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Reset Your Password</h2>

    <p>We received a request to reset your Z402 password. Click the button below to create a new password:</p>

    <div style="text-align: center; margin: 30px 0;">
      <a href="${resetUrl}" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 14px 30px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">Reset Password</a>
    </div>

    <p>Or copy and paste this link into your browser:</p>
    <p style="background: #f5f5f5; padding: 12px; border-radius: 4px; word-break: break-all; font-size: 14px; color: #666;">
      ${resetUrl}
    </p>

    <p style="color: #999; font-size: 14px; margin-top: 30px;">
      This link will expire in <strong>${expiresInMinutes} minutes</strong>.
    </p>

    <p style="color: #999; font-size: 14px;">
      If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Z402. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Reset Your Z402 Password

We received a request to reset your Z402 password. Visit this link to create a new password:

${resetUrl}

This link will expire in ${expiresInMinutes} minutes.

If you didn't request a password reset, you can safely ignore this email. Your password will not be changed.

---
© ${new Date().getFullYear()} Z402. All rights reserved.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Get monthly report email template
   */
  private static getMonthlyReportEmailTemplate(
    merchantName: string,
    reportData: {
      totalRevenue: string;
      totalTransactions: number;
      successRate: number;
      topResources: Array<{ resource: string; revenue: string; count: number }>;
      period: string;
    }
  ): EmailTemplate {
    const subject = `Your Z402 Monthly Report - ${reportData.period}`;

    const topResourcesHtml = reportData.topResources
      .map(
        (r, i) => `
      <tr>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${i + 1}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0;">${r.resource}</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${r.revenue} ZEC</td>
        <td style="padding: 8px; border-bottom: 1px solid #e0e0e0; text-align: right;">${r.count}</td>
      </tr>
    `
      )
      .join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Z402</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Monthly Analytics Report</p>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Hi ${merchantName},</h2>

    <p>Here's your Z402 performance summary for <strong>${reportData.period}</strong>:</p>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
        <div>
          <p style="margin: 0; color: #666; font-size: 14px;">Total Revenue</p>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 600; color: #667eea;">${reportData.totalRevenue} ZEC</p>
        </div>
        <div>
          <p style="margin: 0; color: #666; font-size: 14px;">Transactions</p>
          <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 600; color: #667eea;">${reportData.totalTransactions}</p>
        </div>
      </div>
      <div style="margin-top: 15px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Success Rate</p>
        <p style="margin: 5px 0 0 0; font-size: 24px; font-weight: 600; color: #10b981;">${(reportData.successRate * 100).toFixed(1)}%</p>
      </div>
    </div>

    <h3 style="color: #333; margin-top: 30px;">Top Resources</h3>
    <table style="width: 100%; border-collapse: collapse; margin-top: 15px;">
      <thead>
        <tr style="background: #f5f5f5;">
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e0e0e0;">#</th>
          <th style="padding: 10px; text-align: left; border-bottom: 2px solid #e0e0e0;">Resource</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e0e0e0;">Revenue</th>
          <th style="padding: 10px; text-align: right; border-bottom: 2px solid #e0e0e0;">Count</th>
        </tr>
      </thead>
      <tbody>
        ${topResourcesHtml}
      </tbody>
    </table>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${config.frontendUrl}/dashboard/analytics" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Full Dashboard</a>
    </div>

    <p style="color: #999; font-size: 14px; margin-top: 30px;">
      Keep up the great work! 🚀
    </p>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Z402. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();

    const topResourcesText = reportData.topResources
      .map((r, i) => `${i + 1}. ${r.resource}: ${r.revenue} ZEC (${r.count} transactions)`)
      .join('\n');

    const text = `
Your Z402 Monthly Report - ${reportData.period}

Hi ${merchantName},

Here's your Z402 performance summary for ${reportData.period}:

Total Revenue: ${reportData.totalRevenue} ZEC
Transactions: ${reportData.totalTransactions}
Success Rate: ${(reportData.successRate * 100).toFixed(1)}%

Top Resources:
${topResourcesText}

View your full dashboard: ${config.frontendUrl}/dashboard/analytics

Keep up the great work! 🚀

---
© ${new Date().getFullYear()} Z402. All rights reserved.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Get webhook configured email template
   */
  private static getWebhookConfiguredEmailTemplate(
    webhookUrl: string,
    events: string[]
  ): EmailTemplate {
    const subject = 'Webhook Configuration Updated - Z402';

    const eventsHtml = events.map(e => `<li style="margin: 5px 0;">${e}</li>`).join('');

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Z402</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Webhook Configuration Updated</p>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Webhook Configuration Updated</h2>

    <p>Your webhook configuration has been successfully updated.</p>

    <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; margin: 20px 0;">
      <p style="margin: 0 0 10px 0; font-weight: 600; color: #333;">Webhook URL:</p>
      <p style="margin: 0; word-break: break-all; font-family: monospace; font-size: 14px; color: #667eea;">
        ${webhookUrl}
      </p>
    </div>

    <p style="font-weight: 600; margin-top: 20px;">Subscribed Events:</p>
    <ul style="list-style: none; padding: 0; margin: 10px 0;">
      ${eventsHtml}
    </ul>

    <p style="color: #999; font-size: 14px; margin-top: 30px;">
      You will now receive webhook notifications for the events listed above. Make sure your endpoint is ready to receive and verify webhook payloads.
    </p>

    <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin-top: 20px; border-radius: 4px;">
      <p style="margin: 0; color: #856404; font-size: 14px;">
        <strong>Security Reminder:</strong> Always verify webhook signatures to ensure requests are coming from Z402.
      </p>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Z402. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();

    const eventsText = events.map(e => `- ${e}`).join('\n');

    const text = `
Webhook Configuration Updated - Z402

Your webhook configuration has been successfully updated.

Webhook URL:
${webhookUrl}

Subscribed Events:
${eventsText}

You will now receive webhook notifications for the events listed above. Make sure your endpoint is ready to receive and verify webhook payloads.

Security Reminder: Always verify webhook signatures to ensure requests are coming from Z402.

---
© ${new Date().getFullYear()} Z402. All rights reserved.
    `.trim();

    return { subject, html, text };
  }

  /**
   * Get payment notification email template
   */
  private static getPaymentNotificationEmailTemplate(paymentData: {
    amount: string;
    resource: string;
    status: string;
    transactionId?: string;
    paidAt: Date;
  }): EmailTemplate {
    const subject = `Payment ${paymentData.status} - ${paymentData.amount} ZEC`;

    const statusColor =
      paymentData.status === 'verified' || paymentData.status === 'settled'
        ? '#10b981'
        : paymentData.status === 'failed'
        ? '#ef4444'
        : '#f59e0b';

    const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px; text-align: center; border-radius: 8px 8px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 28px;">Z402</h1>
    <p style="color: rgba(255, 255, 255, 0.9); margin: 10px 0 0 0;">Payment Notification</p>
  </div>

  <div style="background: #ffffff; padding: 40px 30px; border: 1px solid #e0e0e0; border-top: none; border-radius: 0 0 8px 8px;">
    <h2 style="color: #333; margin-top: 0;">Payment ${paymentData.status}</h2>

    <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin: 20px 0;">
      <div style="margin-bottom: 15px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Amount</p>
        <p style="margin: 5px 0 0 0; font-size: 28px; font-weight: 600; color: #667eea;">${paymentData.amount} ZEC</p>
      </div>
      <div style="margin-bottom: 15px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Resource</p>
        <p style="margin: 5px 0 0 0; font-weight: 500;">${paymentData.resource}</p>
      </div>
      <div style="margin-bottom: 15px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Status</p>
        <p style="margin: 5px 0 0 0; font-weight: 600; color: ${statusColor}; text-transform: uppercase;">${paymentData.status}</p>
      </div>
      ${
        paymentData.transactionId
          ? `
      <div style="margin-bottom: 15px;">
        <p style="margin: 0; color: #666; font-size: 14px;">Transaction ID</p>
        <p style="margin: 5px 0 0 0; font-family: monospace; font-size: 12px; word-break: break-all;">${paymentData.transactionId}</p>
      </div>
      `
          : ''
      }
      <div>
        <p style="margin: 0; color: #666; font-size: 14px;">Date</p>
        <p style="margin: 5px 0 0 0;">${paymentData.paidAt.toLocaleString()}</p>
      </div>
    </div>

    <div style="text-align: center; margin-top: 30px;">
      <a href="${config.frontendUrl}/dashboard/transactions" style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;">View Transaction</a>
    </div>
  </div>

  <div style="text-align: center; margin-top: 20px; color: #999; font-size: 12px;">
    <p>© ${new Date().getFullYear()} Z402. All rights reserved.</p>
  </div>
</body>
</html>
    `.trim();

    const text = `
Payment ${paymentData.status}

Amount: ${paymentData.amount} ZEC
Resource: ${paymentData.resource}
Status: ${paymentData.status}
${paymentData.transactionId ? `Transaction ID: ${paymentData.transactionId}\n` : ''}Date: ${paymentData.paidAt.toLocaleString()}

View Transaction: ${config.frontendUrl}/dashboard/transactions

---
© ${new Date().getFullYear()} Z402. All rights reserved.
    `.trim();

    return { subject, html, text };
  }
}
