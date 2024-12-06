import { Database } from '@/database.types';
import { ExtractedEvent } from '@/utils/dataExtraction/handleAnalysis';
import { createClient } from '@supabase/supabase-js';

export type OtherInfo = {
  [key: string]: string;
};

interface StoreAnalysisRequestBody {
  num_beds: number;
  events: ExtractedEvent[];
  other: OtherInfo;
  callUUID: number;
}

export async function POST(request: Request) {
  console.log('🔵 /api/store-analysis API route called');

  try {
    const { num_beds, events, other, callUUID }: StoreAnalysisRequestBody = await request.json();

    console.log('📥 Received num_beds:', num_beds);
    console.log('📥 Received events:', events);
    console.log('📥 Received other:', other);
    console.log('📥 Received callUUID:', callUUID);

    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !serviceKey) {
      console.error('❌ Missing Supabase credentials');
      return new Response('Missing Supabase credentials', { status: 500 });
    }

    console.log('🔑 Initializing Supabase client with URL:', url);
    const supabase = createClient<Database>(url, serviceKey);

    // Insert into analysis table and get the ID
    const { data: analysisData, error: analysisError } = await supabase
      .from('analysis')
      .insert({
        created_at: new Date().toISOString(),
        extracted_events: events,
        extracted_num_beds: num_beds,
        additional_data: other, // This will now be a JSON object
      })
      .select('id')
      .single();

    if (analysisError) {
      console.error('❌ Supabase analysis insert error:', analysisError);
      return new Response(JSON.stringify({ error: analysisError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    if (!analysisData) {
      console.error('❌ No data returned from insert to analysis table');
      return new Response(JSON.stringify({ error: 'Failed to insert analysis data' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    console.log('✅ Successfully stored data in Supabase');
    console.log('📬 Sending foreign key for update in calls table...');

    // Update the calls table with the analysis ID
    const { error: updateError } = await supabase
      .from('calls')
      .update({ fk_analysis: analysisData.id })
      .eq('id', callUUID);

    if (updateError) {
      console.error('❌ Supabase calls update error:', updateError);
      return new Response(JSON.stringify({ error: updateError.message }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ result: 'Success' }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    console.error('❌ Unexpected error:', error);
    return new Response(JSON.stringify({ error: 'Internal server error' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
