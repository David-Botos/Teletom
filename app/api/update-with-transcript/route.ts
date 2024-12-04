import { Database } from '@/database.types';
import { createClient } from '@supabase/supabase-js';

interface UpdateTableWithUUIDReqBody {
  id: number;
  transcriptUUID: number;
  isBot: boolean;
}

export async function POST(request: Request) {
  try {
    // Get the request body
    const { id, transcriptUUID, isBot }: UpdateTableWithUUIDReqBody = await request.json();
    console.log('📥 Received id:', id);
    console.log('📥 Received fk_transcriptions:', transcriptUUID);
    console.log('📥 Received isBot:', isBot);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !serviceKey) {
      console.error('❌ Missing Supabase credentials');
      return new Response('Missing Supabase credentials', { status: 500 });
    }

    console.log('🔑 Initializing Supabase client with URL:', url);
    const supabase = createClient<Database>(url, serviceKey);

    console.log('💾 Attempting to update data into Supabase');

    // Update the call record
    const { data, error } = await supabase
      .from('calls')
      .update({
        [isBot ? 'fk_transcription_bot' : 'fk_transcription_cbo']: transcriptUUID,
      })
      .eq('id', id)
      .select();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    console.log('✅ Successfully stored data in Supabase');
    return new Response(JSON.stringify({ data }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('❌ Error in API route:', error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: {
          'Content-Type': 'application/json',
        },
      }
    );
  }
}
