import 'dotenv/config';
import { supabaseAdmin, DOCUMENTS_BUCKET } from '../src/lib/supabase.js';

async function main() {
  const { data: buckets, error: listError } = await supabaseAdmin.storage.listBuckets();
  if (listError) {
    throw new Error(`Failed to list buckets: ${listError.message}`);
  }

  if (buckets.some((b) => b.name === DOCUMENTS_BUCKET)) {
    console.log(`Bucket "${DOCUMENTS_BUCKET}" already exists.`);
    return;
  }

  const { error: createError } = await supabaseAdmin.storage.createBucket(DOCUMENTS_BUCKET, {
    public: false,
    fileSizeLimit: '10MB',
    allowedMimeTypes: ['application/pdf', 'image/jpeg', 'image/png']
  });

  if (createError) {
    throw new Error(`Failed to create bucket: ${createError.message}`);
  }

  console.log(`Created private bucket "${DOCUMENTS_BUCKET}".`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
