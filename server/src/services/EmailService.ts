import { transporter, emailEnabled, EMAIL_FROM } from '../lib/email.js';

// Frontend origin never includes a path (CORS Origin headers are always
// scheme+host+port), so the GitHub Pages base path is appended here.
const APP_URL = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/CEAP`;

function wrap(bodyHtml: string): string {
  return `
    <div style="font-family: Arial, sans-serif; color: #1F2937; max-width: 480px;">
      ${bodyHtml}
      <p style="margin-top: 1.5rem; font-size: 0.8rem; color: #6B7280;">
        Conner Educational Assistance Program (CEAP)
      </p>
    </div>
  `;
}

/**
 * Best-effort email sending — every method here swallows its own errors
 * and logs instead of throwing, so a failed/unconfigured email send never
 * breaks the request that triggered it (status update, program creation).
 */
export class EmailService {
  private async send(to: string, subject: string, html: string, bcc?: string[]) {
    if (!emailEnabled || !transporter) {
      console.warn('[EmailService] Email not configured — skipping send to', to);
      return;
    }
    try {
      await transporter.sendMail({ from: EMAIL_FROM, to, bcc, subject, html: wrap(html) });
    } catch (error) {
      console.error('[EmailService] Failed to send email to', to, error);
    }
  }

  async sendApplicationStatusUpdate(to: string, scholarshipName: string, status: string): Promise<void> {
    const readableStatus = status.replace(/_/g, ' ');
    await this.send(
      to,
      'Application Status Update - CEAP',
      `<p>Your application for <strong>${scholarshipName}</strong> is now <strong>${readableStatus}</strong>.</p>
       <p><a href="${APP_URL}/my-application">View your application</a></p>`
    );
  }

  async sendNewProgramAnnouncement(recipients: string[], programName: string): Promise<void> {
    if (recipients.length === 0 || !emailEnabled || !transporter) {
      if (recipients.length > 0) {
        console.warn('[EmailService] Email not configured — skipping new program broadcast to', recipients.length, 'recipients');
      }
      return;
    }
    // Sent to self with recipients BCC'd, so applicants never see each
    // other's addresses. Fine at this scale (a few hundred applicants at
    // most) — a genuinely large list would need real batching.
    await this.send(
      EMAIL_FROM!,
      'New Scholarship Program Available - CEAP',
      `<p>A new scholarship program, <strong>${programName}</strong>, is now open for applications.</p>
       <p><a href="${APP_URL}/programs">View the program</a></p>`,
      recipients
    );
  }
}
