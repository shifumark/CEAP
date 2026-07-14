import { google } from 'googleapis';

// Service accounts have no Drive storage quota of their own on a personal
// (non-Workspace) Google account, so this uses standard OAuth 2.0 with a
// long-lived refresh token from the account that completed the one-time
// consent flow, scoped to drive.file only — the app can only ever see
// files it created itself, never anything else in that Drive.
const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);

oauth2Client.setCredentials({ refresh_token: process.env.GOOGLE_REFRESH_TOKEN });

export const drive = google.drive({ version: 'v3', auth: oauth2Client });

export const DRIVE_FOLDER_ID = process.env.GOOGLE_DRIVE_FOLDER_ID || undefined;
