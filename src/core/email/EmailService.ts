import { config } from '@/config/environment';
import { logger } from '@/core/logger/logger';

/**
 * Email service for sending emails
 * Can be integrated with SMTP, SendGrid, Mailgun, AWS SES, etc.
 */
export class EmailService {
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

    await this.sendEmail(email, subject, htmlContent);
    logger.info(`[EmailService] Verification email sent to ${email}`);
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

    await this.sendEmail(email, subject, htmlContent);
    logger.info(`[EmailService] Password reset email sent to ${email}`);
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

    await this.sendEmail(email, subject, htmlContent);
    logger.info(`[EmailService] Welcome email sent to ${email}`);
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

    await this.sendEmail(email, subject, htmlContent);
    logger.info(`[EmailService] Event reminder sent to ${email}`);
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

    await this.sendEmail(email, subject, htmlContent);
    logger.info(`[EmailService] Subscription confirmation sent to ${email}`);
  }

  /**
   * Generic email sender
   * Replace with actual implementation (nodemailer, SendGrid, etc.)
   */
  private static async sendEmail(
    to: string,
    subject: string,
    htmlContent: string
  ): Promise<void> {
    try {
      // TODO: Integrate with actual email service
      // For now, just log the email
      logger.info(`[EmailService] Would send email to ${to}: ${subject}`);

      // Example with nodemailer (uncomment and configure when ready):
      // const transporter = nodemailer.createTransport({
      //   host: config.SMTP_HOST,
      //   port: config.SMTP_PORT,
      //   secure: true,
      //   auth: {
      //     user: config.SMTP_USER,
      //     pass: config.SMTP_PASS,
      //   },
      // });

      // await transporter.sendMail({
      //   from: config.SMTP_FROM,
      //   to,
      //   subject,
      //   html: htmlContent,
      // });
    } catch (error) {
      logger.error('[EmailService] Error sending email', error);
      throw error;
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
    const promises = recipients.map((email) => this.sendEmail(email, subject, htmlContent));
    await Promise.all(promises);
    logger.info(`[EmailService] Bulk email sent to ${recipients.length} recipients`);
  }
}
