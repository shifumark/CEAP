import { createClient } from '@supabase/supabase-js';

export const DOCUMENTS_BUCKET = 'documents';

// Server-side only — uses the service role key, which bypasses Row Level
// Security and must never be sent to the frontend. All access control for
// uploaded documents is enforced in DocumentService/routes, not by Supabase.
export const supabaseAdmin = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || '',
  {
    auth: { autoRefreshToken: false, persistSession: false }
  }
);
