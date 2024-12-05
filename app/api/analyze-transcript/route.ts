import { HUMAN_PREPROMPT, STRUCTURED_ZOD_FORMAT, SYSTEM_PROMPT } from '@/langchain.config';
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

    // const openai_key = process.env.OPENAI_API_KEY;

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

    // const llm = new ChatOpenAI({
    //   model: 'gpt-3.5-turbo',
    //   temperature: 0,
    //   openAIApiKey: openai_key,
    // });

    const structuredLLM = llm.withStructuredOutput(STRUCTURED_ZOD_FORMAT, {
      method: 'json_mode',
      name: 'extract-beds-events',
    });

    const generateHumanMessage = (transcript: string) => HUMAN_PREPROMPT + transcript;

    const prompt = ChatPromptTemplate.fromMessages([
      ['system', SYSTEM_PROMPT],
      ['human', generateHumanMessage(transcript)],
    ]);

    const chain = prompt.pipe(structuredLLM);

    const extractedInformation = await chain.invoke({ transcript: transcript });

    // const outputParser = StructuredOutputParser.fromZodSchema(STRUCTURED_ZOD_FORMAT);

    // const extractedInformation = await chain.invoke({
    //   transcript: transcript,
    //   format_instructions: outputParser.getFormatInstructions(),
    // });

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
