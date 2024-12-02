// app/api/transcribe/route.ts
import { createClient, UrlSource } from '@deepgram/sdk';
import { NextRequest } from 'next/server';

// Define types for query parameters
type DeepgramQueryParams = {
  url: UrlSource;
  callback?: string;
  callback_method?: 'put' | 'post';
  channels?: number;
  custom_intent?: string;
  custom_topic?: string;
  custom_intent_mode?: 'strict' | 'extended';
  custom_topic_mode?: 'strict' | 'extended';
  detect_language?: boolean;
  detect_entities?: boolean;
  detect_topics?: boolean;
  diarize?: boolean;
  dictation?: boolean;
  diarize_version?: string;
  encoding?: string;
  extra?: string;
  filler_words?: boolean;
  intents?: boolean;
  keywords?: string[];
  language?: string;
  measurements?: boolean;
  model?: string;
  multichannel?: boolean;
  numerals?: boolean;
  paragraphs?: boolean;
  profanity_filter?: boolean;
  punctuate?: boolean;
  redact?: string[];
  replace?: string[];
  sample_rate?: number;
  search?: string[];
  sentiment?: boolean;
  smart_format?: boolean;
  summarize?: string;
  tag?: string;
  topics?: boolean;
  utterances?: boolean;
  utt_split?: number;
  version?: string;
};

//TODO: handle params other than just URL

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const key = process.env.DEEPGRAM_KEY;
    if (!key) {
      return new Response(JSON.stringify({ error: 'Deepgram API key not configured' }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Get URL and parameters from request
    const body = await request.json();
    const { url } = body as DeepgramQueryParams;

    if (!url) {
      return new Response(JSON.stringify({ error: 'URL is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Initialize Deepgram client
    const deepgram = createClient(key);

    // Prepare transcription options
    // const options = {
    //   url,
    //   ...params,
    // };

    // Special handling for array parameters that might come as single strings
    // if (params.keywords) options.keywords = Array.isArray(params.keywords) ? params.keywords : [params.keywords];
    // if (params.redact) options.redact = Array.isArray(params.redact) ? params.redact : [params.redact];
    // if (params.replace) options.replace = Array.isArray(params.replace) ? params.replace : [params.replace];
    // if (params.search) options.search = Array.isArray(params.search) ? params.search : [params.search];

    // Convert boolean strings to actual booleans
    // const booleanFields = [
    //   'detect_language', 'detect_entities', 'detect_topics', 'diarize',
    //   'dictation', 'filler_words', 'intents', 'measurements', 'multichannel',
    //   'numerals', 'paragraphs', 'profanity_filter', 'punctuate', 'sentiment',
    //   'smart_format', 'topics', 'utterances'
    // ];

    // booleanFields.forEach(field => {
    //   if (field in options) {
    //     options[field] = options[field] === 'true' || options[field] === true;
    //   }
    // });

    // Convert numeric strings to numbers
    // const numericFields = ['channels', 'sample_rate', 'utt_split'];
    // numericFields.forEach(field => {
    //   if (field in options) {
    //     options[field] = Number(options[field]);
    //   }
    // });

    // Make the API call
    const { result, error } = await deepgram.listen.prerecorded.transcribeUrl({ url: url.url });

    if (error) {
      return new Response(JSON.stringify({ error: 'Deepgram API error', details: error }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Return successful response
    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: 'Internal server error', details: err }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}
