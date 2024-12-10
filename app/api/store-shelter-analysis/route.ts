import { Database } from '@/database.types';
import { createClient } from '@supabase/supabase-js';
import { NextRequest } from 'next/server';

// Type for the expected request body
type ShelterAnalysisInsert = Database['public']['Tables']['shelter_analysis']['Insert'];

// Logger utility
const logger = {
  info: (message: string, meta?: Record<string, unknown>) => {
    console.log(`ℹ️ ${message}`, meta ? JSON.stringify(meta) : '');
  },
  error: (message: string, error: unknown, meta?: Record<string, unknown>) => {
    console.error(`❌ ${message}`, error, meta ? JSON.stringify(meta) : '');
  },
  success: (message: string, meta?: Record<string, unknown>) => {
    console.log(`✅ ${message}`, meta ? JSON.stringify(meta) : '');
  },
};

// Custom error class for better error handling
class ApiError extends Error {
  constructor(public statusCode: number, message: string, public details?: unknown) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function POST(request: NextRequest) {
  const requestId = crypto.randomUUID();
  logger.info('Received shelter analysis storage request', { requestId });

  try {
    // Validate environment variables
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!url || !serviceKey) {
      throw new ApiError(500, 'Missing Supabase credentials');
    }

    // Parse and validate request body
    const rawData: ShelterAnalysisInsert = await request.json();

    // Initialize Supabase client
    logger.info('Initializing Supabase client', { requestId, url });
    const supabase = createClient<Database>(url, serviceKey);

    // Store the analysis data
    logger.info('Storing shelter analysis data', {
      requestId,
      shelterName: rawData.shelter_name,
    });

    const { data: insertedData, error } = await supabase
      .from('shelter_analysis')
      .insert([rawData])
      .select()
      .single();

    if (error) {
      throw new ApiError(500, 'Database insertion failed', error);
    }

    logger.success('Successfully stored shelter analysis', {
      requestId,
      analysisId: insertedData.id,
    });

    return new Response(JSON.stringify(insertedData), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (error) {
    if (error instanceof ApiError) {
      logger.error(error.message, error.details, { requestId });
      return new Response(
        JSON.stringify({
          error: error.message,
          details: error.details,
        }),
        {
          status: error.statusCode,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    logger.error('Unexpected error during shelter analysis storage', error, { requestId });
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
