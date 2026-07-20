import { transporter, emailEnabled, EMAIL_FROM } from '../lib/email.js';

// Frontend origin never includes a path (CORS Origin headers are always
// scheme+host+port), so the GitHub Pages base path is appended here.
const APP_URL = `${process.env.CORS_ORIGIN || 'http://localhost:5173'}/CEAP`;

// Gmail SMTP (regular, non-Workspace account) enforces roughly 500
// recipients per message and ~500 messages/recipients per rolling 24h
// window. These stay comfortably under both — a genuinely large,
// same-day broadcast (thousands of recipients) still can't fully clear
// Gmail's daily cap in one day; a dedicated bulk provider (e.g. Resend)
// would be needed for that. This just keeps a broadcast from silently
// failing or getting the account flagged instead of degrading gracefully.
const BCC_BATCH_SIZE = 400;
const GMAIL_DAILY_LIMIT = 500;
const BATCH_DELAY_MS = 2000;

// In-memory only — resets on process restart as well as at UTC midnight.
// A durable cross-restart counter would need its own DB table; not worth
// the complexity for a safeguard whose job is just "don't blow past
// Gmail's limit in a single broadcast call," not perfect daily accounting.
let sentToday = 0;
let sentDateKey = '';

function reserveDailyQuota(count: number): number {
  const today = new Date().toISOString().slice(0, 10);
  if (today !== sentDateKey) {
    sentDateKey = today;
    sentToday = 0;
  }
  const remaining = Math.max(0, GMAIL_DAILY_LIMIT - sentToday);
  const allowed = Math.min(count, remaining);
  sentToday += allowed;
  return allowed;
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

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
  private async send(to: string, subject: string, html: string, bcc?: string[]): Promise<boolean> {
    if (!emailEnabled || !transporter) {
      console.warn('[EmailService] Email not configured — skipping send to', to);
      return false;
    }
    try {
      await transporter.sendMail({ from: EMAIL_FROM, to, bcc, subject, html: wrap(html) });
      return true;
    } catch (error) {
      console.error('[EmailService] Failed to send email to', to, error);
      return false;
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

  /**
   * Broadcasts to every recipient, chunked into BCC batches (recipients
   * never see each other's addresses) and throttled against Gmail's daily
   * send cap. Recipients beyond today's remaining quota are skipped and
   * logged rather than attempted — they simply won't get this broadcast
   * today, which is the honest outcome for a list this size on Gmail SMTP.
   */
  async sendNewProgramAnnouncement(recipients: string[], programName: string): Promise<void> {
    if (recipients.length === 0) return;
    if (!emailEnabled || !transporter) {
      console.warn('[EmailService] Email not configured — skipping new program broadcast to', recipients.length, 'recipients');
      return;
    }

    const batches: string[][] = [];
    for (let i = 0; i < recipients.length; i += BCC_BATCH_SIZE) {
      batches.push(recipients.slice(i, i + BCC_BATCH_SIZE));
    }

    let sent = 0;
    let skipped = 0;

    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      const allowed = reserveDailyQuota(batch.length);
      const toSend = batch.slice(0, allowed);
      skipped += batch.length - toSend.length;

      if (toSend.length > 0) {
        const ok = await this.send(
          EMAIL_FROM!,
          'New Scholarship Program Available - CEAP',
          `<p>A new scholarship program, <strong>${programName}</strong>, is now open for applications.</p>
           <p><a href="${APP_URL}/programs">View the program</a></p>`,
          toSend
        );
        if (ok) sent += toSend.length;
        else skipped += toSend.length;
      }

      if (i < batches.length - 1) await sleep(BATCH_DELAY_MS);
    }

    if (skipped > 0) {
      console.warn(
        `[EmailService] New program broadcast: sent to ${sent}, skipped ${skipped} ` +
          `(Gmail's ~${GMAIL_DAILY_LIMIT}/day sending limit reached or a batch failed). ` +
          `Skipped recipients were not emailed today — for lists this size, consider a dedicated bulk email provider.`
      );
    } else {
      console.log(`[EmailService] New program broadcast sent to ${sent} recipients across ${batches.length} batch(es).`);
    }
  }
}
