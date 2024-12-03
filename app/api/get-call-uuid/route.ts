import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function GET(request: Request) {
  try {
    // Get room_url from URL parameters
    const { searchParams } = new URL(request.url);
    const room_url = searchParams.get('room_url');

    if (!room_url) {
      return new Response(JSON.stringify({ error: 'room_url parameter is required' }), {
        status: 400,
      });
    }

    // Query the database for the matching room_url
    const { data, error } = await supabase
      .from('calls')
      .select('id')
      .eq('room_url', room_url)
      .single();

    if (error) {
      console.error('Database error:', error);
      return new Response(JSON.stringify({ error: 'Failed to query database' }), { status: 500 });
    }

    if (!data) {
      return new Response(JSON.stringify({ error: 'No matching record found' }), { status: 404 });
    }

    // Return the id of the matching record
    return new Response(JSON.stringify({ id: data.id }), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
      },
    });
  } catch (error) {
    console.error('Server error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}
