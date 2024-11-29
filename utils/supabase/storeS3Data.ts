import { createClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';
import { constructS3Directory } from './constructS3Directory';

export const storeS3Data = async (roomUrl: string): Promise<void> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  const s3_directory = constructS3Directory(roomUrl);

  const supabase = createClient<Database>(url, key);

  const { error } = await supabase.from('calls').insert({
    room_url: roomUrl,
    s3_folder_dir: s3_directory,
    created_at: new Date().toISOString(),
  });

  if (error) {
    throw new Error(`Failed to store room URL: ${error.message}`);
  }
};
