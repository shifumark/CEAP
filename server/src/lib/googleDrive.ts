import { google, drive_v3 } from 'googleapis';

// Service accounts have no Drive storage quota of their own on a personal
// (non-Workspace) Google account, so this uses standard OAuth 2.0 with a
// long-lived refresh token from the account that completed the one-time
// consent flow, scoped to drive.file only — the app can only ever see
// files it created itself, never anything else in that Drive.
//
// Multiple accounts can be configured for overflow storage: uploads try
// GOOGLE_REFRESH_TOKEN first, then GOOGLE_REFRESH_TOKEN_2, and so on,
// picking whichever configured account actually has room (checked via
// live quota, not a locally tracked counter — see
// selectDriveAccountForUpload). GOOGLE_CLIENT_ID/SECRET are shared across
// every account since they identify the OAuth app, not the consenting
// user.

export interface DriveAccount {
  id: number;
  drive: drive_v3.Drive;
  folderId?: string;
}

function buildAccount(id: number, refreshToken: string | undefined, folderId: string | undefined): DriveAccount | null {
  if (!refreshToken) return null;
  const oauth2Client = new google.auth.OAuth2(process.env.GOOGLE_CLIENT_ID, process.env.GOOGLE_CLIENT_SECRET);
  oauth2Client.setCredentials({ refresh_token: refreshToken });
  return { id, drive: google.drive({ version: 'v3', auth: oauth2Client }), folderId };
}

// Add a 3rd/4th account the same way if ever needed: GOOGLE_REFRESH_TOKEN_3 / GOOGLE_DRIVE_FOLDER_ID_3, etc.
const configuredAccounts = [
  buildAccount(1, process.env.GOOGLE_REFRESH_TOKEN, process.env.GOOGLE_DRIVE_FOLDER_ID),
  buildAccount(2, process.env.GOOGLE_REFRESH_TOKEN_2, process.env.GOOGLE_DRIVE_FOLDER_ID_2)
];

export const DRIVE_ACCOUNTS: DriveAccount[] = configuredAccounts.filter((a): a is DriveAccount => a !== null);

if (DRIVE_ACCOUNTS.length === 0) {
  throw new Error('No Google Drive accounts configured — set at least GOOGLE_REFRESH_TOKEN.');
}

export function getDriveAccount(id: number): DriveAccount {
  const account = DRIVE_ACCOUNTS.find((a) => a.id === id);
  if (!account) {
    throw new Error(`Document references Drive account ${id}, which isn't configured on this server.`);
  }
  return account;
}

// Headroom kept free on an account before treating it as "full" — an
// upload landing exactly at the byte limit would fail partway through,
// and the quota check and the actual upload aren't atomic, so leaving
// slack absorbs anything that changed on the account in between (e.g.
// an email attachment arriving, since Gmail/Drive/Photos share one quota).
const SAFETY_MARGIN_BYTES = 50 * 1024 * 1024;

/**
 * Picks the first configured Drive account with enough free space for
 * this upload, checking real-time quota (which reflects the whole
 * account's Gmail + Drive + Photos usage, not just this app's uploads).
 * Falls through in configuration order — GOOGLE_REFRESH_TOKEN's account
 * is preferred whenever it has room, GOOGLE_REFRESH_TOKEN_2 only takes
 * over once that fills up.
 */
export async function selectDriveAccountForUpload(fileSize: number): Promise<DriveAccount> {
  for (const account of DRIVE_ACCOUNTS) {
    try {
      const { data } = await account.drive.about.get({ fields: 'storageQuota' });
      const limit = data.storageQuota?.limit ? Number(data.storageQuota.limit) : undefined;
      const usage = data.storageQuota?.usage ? Number(data.storageQuota.usage) : 0;
      // No limit reported at all (e.g. some Workspace plans) reads as unlimited.
      if (limit === undefined || limit - usage > fileSize + SAFETY_MARGIN_BYTES) {
        return account;
      }
    } catch (error) {
      // A quota-check failure on one account shouldn't block uploads
      // entirely — skip it and let the next configured account take it.
      console.error(`[googleDrive] Failed to check quota for account ${account.id}`, error);
    }
  }
  throw new Error('Storage is full across every configured Drive account — please contact the system administrator.');
}
