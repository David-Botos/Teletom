import { TranscriptionRequest } from '@/utils/supabase/storeTranscriptionInSupa';
import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    const transcriptionData: TranscriptionRequest = await request.json();

    const { data, error } = await supabase
      .from('transcriptions')
      .insert({
        ...transcriptionData,
        created_at: new Date().toISOString(),
      })
      .select('id')
      .single();

    if (error) {
      return NextResponse.json(
        { error: `Failed to store transcription: ${error.message}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ id: data.id }, { status: 201 });
  } catch (error) {
    console.error('Error storing transcription:', error);
    return NextResponse.json({ error: 'Failed to process transcription request' }, { status: 400 });
  }
}
