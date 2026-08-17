import nodemailer, { Transporter } from 'nodemailer';
import { config } from '@/config/environment';
import logger from '@/core/logger/logger';

/**
 * Email service for sending emails
 * Can be integrated with SMTP, SendGrid, Mailgun, AWS SES, etc.
 */
export class EmailService {
  private static transporter: Transporter | null | undefined;

  /** True once SMTP_USER/SMTP_PASS are actually set -- SMTP_HOST always has a
   * non-empty default, so it can't be used as the "is email configured" check. */
  private static isConfigured(): boolean {
    return Boolean(config.SMTP_USER && config.SMTP_PASS);
  }

  private static getTransporter(): Transporter | null {
    if (!this.isConfigured()) return null;
    if (this.transporter === undefined) {
      this.transporter = nodemailer.createTransport({
        host: config.SMTP_HOST,
        port: config.SMTP_PORT,
        secure: config.SMTP_PORT === 465,
        auth: { user: config.SMTP_USER, pass: config.SMTP_PASS },
        // Without these, a stuck TCP handshake to an unreachable SMTP host
        // falls back to the OS-level default (~120s) before nodemailer
        // gives up -- on an unauthenticated endpoint like forgot-password
        // that's a cheap way to tie up server connections. 10s is generous
        // for a real mail server and still fails fast for a dead one.
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 10_000,
      });
    }
    return this.transporter;
  }

  /**
   * Send account setup email -- used both for a member an admin creates
   * manually, and (once Stripe is wired up) for a member's first-ever
   * subscription confirmation. Reuses the same password-reset token
   * mechanism as "forgot password": the recipient lands on the same
   * set-password page either way, just with different framing copy.
   */
  static async sendAccountSetupEmail(email: string, fullName: string, setupToken: string): Promise<boolean> {
    const setupUrl = `${config.FRONTEND_URL}/set-password?token=${setupToken}&mode=setup`;
    const subject = 'Set up your Property Business Training account';
    const htmlContent = `
      <h2>Welcome to Property Business Training, ${fullName}!</h2>
      <p>An account has been created for you. Set your password to log in for the first time:</p>
      <a href="${setupUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Set Up My Account
      </a>
      <p>Or copy this link: ${setupUrl}</p>
      <p>This link expires in 24 hours.</p>
    `;

    const sent = await this.sendEmail(email, subject, htmlContent);
    if (sent) logger.info(`[EmailService] Account setup email sent to ${email}`);
    return sent;
  }

  /**
   * Send email verification
   */
  static async sendVerificationEmail(email: string, verificationToken: string): Promise<void> {
    const verificationUrl = `${config.FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const subject = 'Email Verification - Property Business Training';
    const htmlContent = `
      <h2>Welcome to Property Business Training</h2>
      <p>Please verify your email address by clicking the link below:</p>
      <a href="${verificationUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Verify Email
      </a>
      <p>Or copy this link: ${verificationUrl}</p>
      <p>This link expires in 24 hours.</p>
    `;

    const sent = await this.sendEmail(email, subject, htmlContent);
    if (sent) logger.info(`[EmailService] Verification email sent to ${email}`);
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset - Property Business Training';
    const htmlContent = `
      <h2>Password Reset Request</h2>
      <p>You requested a password reset. Click the link below to reset your password:</p>
      <a href="${resetUrl}" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        Reset Password
      </a>
      <p>Or copy this link: ${resetUrl}</p>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, please ignore this email.</p>
    `;

    const sent = await this.sendEmail(email, subject, htmlContent);
    if (sent) logger.info(`[EmailService] Password reset email sent to ${email}`);
  }

  /**
   * Send welcome email
   */
  static async sendWelcomeEmail(
    email: string,
    firstName: string,
    membershipTier: string
  ): Promise<void> {
    const subject = `Welcome to Property Business Training, ${firstName}!`;
    const htmlContent = `
      <h2>Welcome to PBT Community!</h2>
      <p>Hi ${firstName},</p>
      <p>Your ${membershipTier} membership is now active. You can now access:</p>
      <ul>
        <li>Exclusive training modules</li>
        <li>Community discussions</li>
        <li>Networking events</li>
        <li>Resource library</li>
      </ul>
      <p>Start your learning journey: <a href="${config.FRONTEND_URL}/dashboard">Go to Dashboard</a></p>
    `;

    const sent = await this.sendEmail(email, subject, htmlContent);
    if (sent) logger.info(`[EmailService] Welcome email sent to ${email}`);
  }

  /**
   * Send event reminder email
   */
  static async sendEventReminder(
    email: string,
    eventName: string,
    eventDate: string,
    eventUrl: string
  ): Promise<void> {
    const subject = `Reminder: ${eventName} - ${eventDate}`;
    const htmlContent = `
      <h2>Event Reminder</h2>
      <p>This is a reminder about the upcoming event:</p>
      <h3>${eventName}</h3>
      <p><strong>Date & Time:</strong> ${eventDate}</p>
      <a href="${eventUrl}" style="background-color: #28a745; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">
        View Event Details
      </a>
    `;

    const sent = await this.sendEmail(email, subject, htmlContent);
    if (sent) logger.info(`[EmailService] Event reminder sent to ${email}`);
  }

  /**
   * Send subscription confirmation email
   */
  static async sendSubscriptionConfirmation(
    email: string,
    firstName: string,
    tier: string,
    amount: number,
    billingCycle: string
  ): Promise<void> {
    const subject = 'Subscription Confirmed - Property Business Training';
    const htmlContent = `
      <h2>Subscription Confirmed</h2>
      <p>Hi ${firstName},</p>
      <p>Your subscription to the <strong>${tier}</strong> tier has been confirmed.</p>
      <p><strong>Amount:</strong> $${(amount / 100).toFixed(2)}/${billingCycle}</p>
      <p>You can manage your subscription: <a href="${config.FRONTEND_URL}/subscription">Manage Subscription</a></p>
    `;

    const sent = await this.sendEmail(email, subject, htmlContent);
    if (sent) logger.info(`[EmailService] Subscription confirmation sent to ${email}`);
  }

  /**
   * Generic email sender. Returns whether the email was actually sent --
   * callers use this to decide what to log, rather than this method
   * throwing, so a downstream SMTP failure (bad creds, network blip)
   * never fails the action that triggered the email (member creation,
   * password reset, etc). Returning false instead of just swallowing the
   * error is what lets callers avoid logging a false "sent" -- previously
   * every wrapper below logged success unconditionally after awaiting
   * this, even when it had just logged its own failure.
   */
  private static async sendEmail(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<boolean> {
    const transporter = this.getTransporter();

    if (!transporter) {
      // No SMTP_USER/SMTP_PASS configured -- log instead of sending.
      logger.warn(`[EmailService] SMTP not configured -- would send email to ${to}: "${subject}"`);
      return false;
    }

    try {
      await transporter.sendMail({
        from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM}>`,
        to,
        subject,
        html: htmlContent,
      });
      return true;
    } catch (error) {
      logger.error(`[EmailService] Failed to send email to ${to}`, error);
      return false;
    }
  }

  /**
   * Send bulk emails
   */
  static async sendBulkEmails(
    recipients: string[],
    subject: string,
    htmlContent: string
  ): Promise<void> {
    const results = await Promise.all(recipients.map((email) => this.sendEmail(email, subject, htmlContent)));
    const sentCount = results.filter(Boolean).length;
    logger.info(`[EmailService] Bulk email sent to ${sentCount}/${recipients.length} recipients`);
  }
}
