import { createClient } from '@supabase/supabase-js';
import { Database } from '@/database.types';

export const storeRoomURL = async (roomUrl: string): Promise<void> => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  
  if (!url || !key) {
    throw new Error('Missing Supabase credentials');
  }

  const supabase = createClient<Database>(url, key);
  
  const { error } = await supabase
    .from('calls')
    .insert({
      room_url: roomUrl,
      created_at: new Date().toISOString()
    });

  if (error) {
    throw new Error(`Failed to store room URL: ${error.message}`);
  }
};