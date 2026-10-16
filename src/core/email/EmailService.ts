import nodemailer, { Transporter } from 'nodemailer';
import { config } from '@/config/environment';
import logger from '@/core/logger/logger';
import { renderEmailLayout, emailParagraph, emailButton, emailNote, escapeHtml, getEmailLogoAttachment, LOGO_CID } from '@/core/email/emailTemplate';

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
  /** The single place the account-setup link is built -- used by the email AND the admin "copy link" action, so they can never drift apart. */
  static buildAccountSetupUrl(setupToken: string): string {
    return `${config.FRONTEND_URL}/set-password?token=${setupToken}&mode=setup`;
  }

  static async sendAccountSetupEmail(email: string, fullName: string, setupToken: string): Promise<boolean> {
    const setupUrl = this.buildAccountSetupUrl(setupToken);
    const subject = 'Set up your Property Business Training account';
    const htmlContent = renderEmailLayout({
      frontendUrl: config.FRONTEND_URL,
      preheader: 'Set your password to start using your PBT membership.',
      heading: `Welcome to PBT, ${fullName.split(' ')[0]}!`,
      fallbackUrl: setupUrl,
      bodyHtml:
        emailParagraph('Thank you for joining Property Business Training. Your membership account is ready -- the last step is to choose a password so you can sign in for the first time.') +
        emailButton('Set Up My Account', setupUrl) +
        emailNote('This link expires in <strong>24 hours</strong>. If it has expired, use <em>Forgot password</em> on the sign-in page to get a new one.'),
    });

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
    const htmlContent = renderEmailLayout({
      frontendUrl: config.FRONTEND_URL,
      preheader: 'Confirm your email address to finish setting up your account.',
      heading: 'Verify your email address',
      fallbackUrl: verificationUrl,
      bodyHtml:
        emailParagraph('Please confirm your email address to finish setting up your Property Business Training account.') +
        emailButton('Verify Email', verificationUrl) +
        emailNote('This link expires in <strong>24 hours</strong>.'),
    });

    const sent = await this.sendEmail(email, subject, htmlContent);
    if (sent) logger.info(`[EmailService] Verification email sent to ${email}`);
  }

  /**
   * Send password reset email
   */
  static async sendPasswordResetEmail(email: string, resetToken: string): Promise<void> {
    const resetUrl = `${config.FRONTEND_URL}/reset-password?token=${resetToken}`;
    const subject = 'Password Reset - Property Business Training';
    const htmlContent = renderEmailLayout({
      frontendUrl: config.FRONTEND_URL,
      preheader: 'Use this link to choose a new password.',
      heading: 'Reset your password',
      fallbackUrl: resetUrl,
      bodyHtml:
        emailParagraph('We received a request to reset the password for your PBT account. Click the button below to choose a new one.') +
        emailButton('Reset Password', resetUrl) +
        emailNote('This link expires in <strong>24 hours</strong>. If you didn\'t request this, you can safely ignore this email -- your password won\'t change.'),
    });

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
    const htmlContent = renderEmailLayout({
      frontendUrl: config.FRONTEND_URL,
      preheader: `Your ${membershipTier} membership is now active.`,
      heading: `Welcome to the PBT community, ${firstName}!`,
      bodyHtml:
        emailParagraph(`Your <strong>${escapeHtml(membershipTier)}</strong> membership is now active. You now have access to:`) +
        emailParagraph('&bull; Structured training modules<br />&bull; Community discussions and your Power Team<br />&bull; Live events and networking<br />&bull; The PBT resource library') +
        emailButton('Go to my dashboard', `${config.FRONTEND_URL}/dashboard`),
    });

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
    const htmlContent = renderEmailLayout({
      frontendUrl: config.FRONTEND_URL,
      preheader: `${eventName} -- ${eventDate}`,
      heading: 'Event reminder',
      bodyHtml:
        emailParagraph('This is a reminder about an upcoming PBT event:') +
        emailNote(`<strong style="font-size:16px;color:#1f2937;">${escapeHtml(eventName)}</strong><br />${escapeHtml(eventDate)}`) +
        emailButton('View event details', eventUrl),
    });

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
    const htmlContent = renderEmailLayout({
      frontendUrl: config.FRONTEND_URL,
      preheader: `Your ${tier} subscription is confirmed.`,
      heading: 'Subscription confirmed',
      bodyHtml:
        emailParagraph(`Hi ${escapeHtml(firstName)}, thank you -- your <strong>${escapeHtml(tier)}</strong> subscription is confirmed.`) +
        emailNote(`<strong>Amount:</strong> £${(amount / 100).toFixed(2)} / ${escapeHtml(billingCycle)}`) +
        emailButton('Manage subscription', `${config.FRONTEND_URL}/my-subscription`),
    });

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
      // Only attach the embedded logo to emails whose layout actually references it.
      const logo = htmlContent.includes(`cid:${LOGO_CID}`) ? getEmailLogoAttachment() : null;
      await transporter.sendMail({
        from: `"${config.SMTP_FROM_NAME}" <${config.SMTP_FROM}>`,
        to,
        subject,
        html: htmlContent,
        ...(logo ? { attachments: [logo] } : {}),
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
