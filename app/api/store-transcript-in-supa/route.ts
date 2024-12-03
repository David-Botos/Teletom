import { Database } from '@/database.types';
import { TranscriptionRequest } from '@/utils/supabase/storeTranscriptionInSupa';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    const transcriptionData: TranscriptionRequest = await request.json();
    console.log('📥 Received transcriptionData:', transcriptionData);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !serviceKey) {
      console.error('❌ Missing Supabase credentials');
      return new Response('Missing Supabase credentials', { status: 500 });
    }

    console.log('🔑 Initializing Supabase client with URL:', url);
    const supabase = createClient<Database>(url, serviceKey);

    console.log('💾 Attempting to insert data into Supabase');
    const { data, error } = await supabase
      .from('transcriptions')
      .insert({
        duration: transcriptionData.duration,
        full_transcript: transcriptionData.full_transcript,
        individual_words: transcriptionData.individual_words,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    console.log('✅ Successfully stored data in Supabase');
    return new Response(JSON.stringify({ id: data.id }), {
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
