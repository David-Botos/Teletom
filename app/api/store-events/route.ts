import { Database } from '@/database.types';
import { createClient } from '@supabase/supabase-js';

interface StoreEventRequestBody {
  event_title: string | null;
  event_start: string | null;
  event_end: string | null;
  event_desc: string | null;
  isAllDay: boolean | null;
  isRecurring: boolean | null;
  fk_call: number | null;
}

export async function POST(request: Request) {
  try {
    const eventData: StoreEventRequestBody = await request.json();
    console.log('📥 Received event data:', eventData);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !serviceKey) {
      console.error('❌ Missing Supabase credentials');
      return new Response('Missing Supabase credentials', { status: 500 });
    }

    console.log('🔑 Initializing Supabase client with URL:', url);
    const supabase = createClient<Database>(url, serviceKey);

    console.log('💾 Attempting to insert event into Supabase');
    const insertData: Database['public']['Tables']['events']['Insert'] = {
      event_title: eventData.event_title,
      event_start: eventData.event_start,
      event_end: eventData.event_end,
      event_desc: eventData.event_desc,
      isAllDay: eventData.isAllDay,
      isRecurring: eventData.isRecurring,
      fk_call: eventData.fk_call,
      created_at: new Date().toISOString(),
    };

    const { data, error } = await supabase.from('events').insert(insertData).select('id').single();

    if (error) {
      console.error('❌ Supabase insert error:', error);
      throw error;
    }

    if (!data) {
      throw new Error('No data returned from insert');
    }

    console.log('✅ Successfully stored event in Supabase');
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
