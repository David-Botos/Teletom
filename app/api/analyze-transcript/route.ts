import {
  JSON_SHELTER_CALL_SCHEMA,
  // HUMAN_PREPROMPT,
  SHELTER_ANALYSIS_PROMPT_v2,
  // SHELTER_CALL_SCHEMA,
  // STRUCTURED_ZOD_FORMAT,
  // SYSTEM_PROMPT,
} from '@/langchain.config';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { NextRequest } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';
// import { ChatOpenAI } from '@langchain/openai';
// import { StructuredOutputParser } from 'langchain/output_parsers';

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const google_key = process.env.GOOGLE_API_KEY;
    if (!google_key) {
      throw new Error('LangChain / Google API key not configured');
    }

    // Get URL and parameters from request
    const { transcript } = await request.json();
    if (!transcript) {
      throw new Error('Transcript is required');
    }

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-pro',
      temperature: 0.3,
      maxRetries: 2,
      apiKey: google_key,
    });

    const shelterStructuredLLM = llm.withStructuredOutput(JSON_SHELTER_CALL_SCHEMA, {
      method: 'json_mode',
      name: 'shelter-data-extraction',
    });

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SHELTER_ANALYSIS_PROMPT_v2],
      ['human', transcript],
    ]);

    const chain = prompt.pipe(shelterStructuredLLM);

    const extractedInformation = await chain.invoke({ transcript: transcript });

    // Return successful response
    return new Response(JSON.stringify(extractedInformation), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
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
