import * as hub from 'langchain/hub';
import { ChatPromptTemplate } from '@langchain/core/prompts';
import { NextRequest } from 'next/server';
import { ChatGoogleGenerativeAI } from '@langchain/google-genai';

// Helper function to extract useful error information
const formatError = (error: any) => {
  return {
    message: error.message,
    name: error.name,
    stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    cause: error.cause,
    // Add specific LangChain error properties if they exist
    status: error.status,
    response: error.response,
    // If it's a network error, include more details
    statusCode: error.statusCode,
    statusText: error.statusText,
  };
};

export async function POST(request: NextRequest) {
  try {
    // Validate API key
    const lang_key = process.env.LANGCHAIN_KEY;
    const google_key = process.env.GOOGLE_API_KEY;
    if (!lang_key || !google_key) {
      throw new Error('LangChain / Google API key not configured');
    }

    // Get URL and parameters from request
    const { transcript } = await request.json();
    if (!transcript) {
      throw new Error('Transcript is required');
    }

    const promptTemplate: ChatPromptTemplate = await hub.pull('extract_beds_and_events', {
      apiKey: process.env.LANGCHAIN_KEY,
      apiUrl: 'https://api.smith.langchain.com/',
      includeModel: false,
    });

    const llm = new ChatGoogleGenerativeAI({
      model: 'gemini-1.5-pro',
      temperature: 0.3,
      maxRetries: 2,
      apiKey: google_key,
    });

    const chain = promptTemplate.pipe(llm);

    const extractedInformation = await chain.invoke({
      transcript: transcript,
    });

    // Return successful response
    return new Response(JSON.stringify(extractedInformation), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('API Error:', err); // Log error for debugging

    const errorDetails = formatError(err);

    return new Response(
      JSON.stringify({
        error: err.message || 'Internal server error',
        details: errorDetails,
        timestamp: new Date().toISOString(),
        path: request.url,
      }),
      {
        status: err.status || 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
