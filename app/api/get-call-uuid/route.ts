import { Database } from '@/database.types';
import { createClient } from '@supabase/supabase-js';

export async function POST(request: Request) {
  try {
    // Get room_url from URL parameters
    const { room_url } = await request.json();
    console.log('📥 Received room_url:', room_url);

    // Create client
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !serviceKey) {
      console.error('❌ Missing Supabase credentials');
      return new Response('Missing Supabase credentials', { status: 500 });
    }

    console.log('🔑 Initializing Supabase client with URL:', url);
    const supabase = createClient<Database>(url, serviceKey);

    // Query the database for the matching room_url
    console.log('📞 Attempting to fetch uuid from Supabase...');
    const { data, error } = await supabase
      .from('calls')
      .select('id')
      .eq('room_url', room_url)
      .single();

    if (error) {
      console.error('❌ Supabase fetch error:', error);
      return new Response(JSON.stringify({ error: 'Failed to query database' }), { status: 500 });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'No matching record found' }), { status: 404 });
    }

    console.log('✅ Successfully retrieved UUID: ', data.id);
    // Return the id of the matching record
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
