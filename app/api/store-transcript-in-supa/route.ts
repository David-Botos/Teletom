import { Database } from '@/database.types';
import { TranscriptionRequest, UploadType } from '@/utils/supabase/storeTranscriptionInSupa';
import { createClient } from '@supabase/supabase-js';

interface UploadTranscriptReqBody {
  transcript_data: TranscriptionRequest;
  uploadType: UploadType;
}

export async function POST(request: Request) {
  try {
    const { transcript_data, uploadType }: UploadTranscriptReqBody = await request.json();
    console.log('📥 Received transcript_data:', transcript_data);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !serviceKey) {
      console.error('❌ Missing Supabase credentials');
      return new Response('Missing Supabase credentials', { status: 500 });
    }

    console.log('🔑 Initializing Supabase client with URL:', url);
    const supabase = createClient<Database>(url, serviceKey);

    console.log('💾 Attempting to insert data into Supabase');
    const insertData: Database['public']['Tables']['transcriptions']['Insert'] = {
      duration: transcript_data.duration,
      full_transcript: transcript_data.full_transcript,
      individual_words: transcript_data.individual_words,
      call_type: uploadType,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('transcriptions')
      .insert(insertData)
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
