import { createClient } from '@supabase/supabase-js';
import { NextResponse } from 'next/server';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  try {
    // Get the request body
    const { id, fk_transcriptions } = await request.json();

    // Validate required fields
    if (!id || fk_transcriptions === undefined) {
      return NextResponse.json(
        { error: 'Missing required fields: id and fk_transcriptions' },
        { status: 400 }
      );
    }

    // Update the call record
    const { data, error } = await supabase
      .from('calls')
      .update({ fk_transcriptions })
      .eq('id', id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({
      message: 'Call updated successfully',
      data,
    });
  } catch (error) {
    return NextResponse.json({ error: `Internal server error: ${error}` }, { status: 500 });
  }
}
