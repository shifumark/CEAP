import nodemailer from 'nodemailer';

// Gmail SMTP via an App Password (not the account's real password) —
// requires 2-Step Verification enabled on the sending Google account.
// Optional: if unset, EmailService no-ops instead of crashing the server,
// same pattern as other best-effort integrations in this codebase.
const user = process.env.EMAIL_USER;
const appPassword = process.env.EMAIL_APP_PASSWORD;

export const emailEnabled = Boolean(user && appPassword);

export const transporter = emailEnabled
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: { user, pass: appPassword }
    })
  : undefined;

export const EMAIL_FROM = user ? `"CEAP Scholarship" <${user}>` : undefined;

if (!emailEnabled) {
  console.warn('[email] EMAIL_USER/EMAIL_APP_PASSWORD not set — email notifications are disabled.');
}
