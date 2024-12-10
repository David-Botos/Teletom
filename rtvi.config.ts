export const BOT_READY_TIMEOUT = 15 * 1000; // 15 seconds

export const defaultBotProfile = 'voice_2024_10';
export const defaultMaxDuration = 360;

export const LANGUAGES = [
  {
    label: 'English',
    value: 'en',
    tts_model: 'sonic-english',
    stt_model: 'nova-2-general',
    default_voice: '79a125e8-cd45-4c13-8a67-188112f4dd22',
  },
  {
    label: 'French',
    value: 'fr',
    tts_model: 'sonic-multilingual',
    stt_model: 'nova-2-general',
    default_voice: 'a8a1eb38-5f15-4c1d-8722-7ac0f329727d',
  },
  {
    label: 'Spanish',
    value: 'es',
    tts_model: 'sonic-multilingual',
    stt_model: 'nova-2-general',
    default_voice: '846d6cb0-2301-48b6-9683-48f5618ea2f6',
  },
  {
    label: 'German',
    value: 'de',
    tts_model: 'sonic-multilingual',
    stt_model: 'nova-2-general',
    default_voice: 'b9de4a89-2257-424b-94c2-db18ba68c81a',
  },
];

export const recordingSettings = {
  type: 'raw-tracks',
  recordings_bucket: {
    assume_role_arn: process.env.AWS_ROLE,
    bucket_name: process.env.S3_BUCKET,
    bucket_region: process.env.BUCKET_REGION,
    allow_api_access: true,
    allow_streaming_from_bucket: true,
  },
};

// ElevenLabs Configuration:
// Voices: Charlie, Chris, Eric, Laura, Matilda

export const defaultServices = {
  llm: 'together',
  tts: 'cartesia',
  stt: 'deepgram',
};

export const defaultLLMPrompt = `You are Miranda Wilson, a compassionate social worker from the Care Management team at UW Medicine Montlake. Your role involves connecting hospital patients with community resources. You're calling {{cbo_name}} to learn about their available services.  Your records show that they may offer {{arr_services}}.

Begin the call professionally but warmly:
- Introduce yourself and your role
- Ask to speak with someone who can provide information about their community programs
- Briefly explain that you're gathering updated information to help connect people in need with their services

During the conversation:
- Listen actively and ask natural follow-up questions
- Focus on gathering specific details about:
  - Any regular events or services they offer
  - Dates and times of these services
  - Any requirements or restrictions for participants
  - Current capacity or availability (especially for shelter/beds if offered)
  - Process for accessing services
  
Keep the conversation flowing naturally by:
- Using transition phrases like "That's helpful to know" or "I see"
- Asking one question at a time
- Following up on mentioned services before moving to new topics

Voice and tone guidelines:
- Speak professionally but warmly
- Use clear, everyday language
- Express gratitude for their time and service

Sample opening:
"Hello?" Then wait for the other participant to confirm they are present. Then you can introduce yourself and your objective "Hi, this is Miranda calling from UW Medicine Montlake. I work with our Care Management team, helping connect patients with community resources. Could I speak with someone who can tell me about the events and resources you offer at {{cbo_name}}?"

Audio formatting note: Responses should use only basic punctuation (periods, commas, question marks, and exclamation points)."`;
// export const defaultLLMPrompt = 'Just say hello. Then end your statement.';

export const defaultConfig = [
  { service: 'vad', options: [{ name: 'params', value: { stop_secs: 0.7 } }] },
  {
    service: 'tts',
    options: [
      { name: 'voice', value: '79a125e8-cd45-4c13-8a67-188112f4dd22' },
      { name: 'model', value: LANGUAGES[0].tts_model },
      { name: 'language', value: LANGUAGES[0].value },
      {
        name: 'text_filter',
        value: {
          filter_code: false,
          filter_tables: false,
        },
      },
    ],
  },
  {
    service: 'llm',
    options: [
      { name: 'model', value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo' },
      {
        name: 'initial_messages',
        value: [
          {
            role: 'system',
            content: defaultLLMPrompt,
          },
        ],
      },
    ],
  },
  {
    service: 'stt',
    options: [
      { name: 'model', value: LANGUAGES[0].stt_model },
      { name: 'language', value: LANGUAGES[0].value },
    ],
  },
];

export const LLM_MODEL_CHOICES = [
  {
    label: 'Together AI',
    value: 'together',
    models: [
      {
        label: 'Meta Llama 3.1 70B Instruct Turbo',
        value: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo',
      },
      {
        label: 'Meta Llama 3.1 8B Instruct Turbo',
        value: 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo',
      },
      {
        label: 'Meta Llama 3.1 405B Instruct Turbo',
        value: 'meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo',
      },
    ],
  },
  {
    label: 'Anthropic',
    value: 'anthropic',
    models: [
      {
        label: 'Claude 3.5 Sonnet',
        value: 'claude-3-5-sonnet-20240620',
      },
    ],
  },
  {
    label: 'Grok (x.ai)',
    value: 'grok',
    models: [
      {
        label: 'Grok Beta',
        value: 'grok-beta',
      },
    ],
  },
  {
    label: 'Gemini',
    value: 'gemini',
    models: [
      {
        label: 'Gemini 1.5 Flash',
        value: 'gemini-1.5-flash',
      },
      {
        label: 'Gemini 1.5 Pro',
        value: 'gemini-1.0-pro',
      },
    ],
  },
  {
    label: 'Open AI',
    value: 'openai',
    models: [
      {
        label: 'GPT-4o',
        value: 'gpt-4o',
      },
      {
        label: 'GPT-4o Mini',
        value: 'gpt-4o-mini',
      },
    ],
  },
];

export const PRESET_CHARACTERS = [
  {
    name: 'Default',
    prompt: `You are a assistant called ExampleBot. You can ask me anything.
    Keep responses brief and legible.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.
    Start by briefly introducing yourself.`,
    voice: '79a125e8-cd45-4c13-8a67-188112f4dd22',
  },
  {
    name: 'Chronic one-upper',
    prompt: `You are a chronic one-upper. Ask me about my summer.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.`,
    voice: 'b7d50908-b17c-442d-ad8d-810c63997ed9',
  },
  {
    name: 'Passive-aggressive coworker',
    prompt: `You're a passive-aggressive coworker. Ask me how our latest project is going.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.`,
    voice: '726d5ae5-055f-4c3d-8355-d9677de68937',
  },
  {
    name: 'Pun-prone uncle',
    prompt: `You're everybody's least favorite uncle because you can't stop making terrible puns. Ask me about my freshman year of high school.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.`,
    voice: 'fb26447f-308b-471e-8b00-8e9f04284eb5',
  },
  {
    name: 'Gen-Z middle schooler',
    prompt: `You're a gen-Z middle schooler that can only talk in brain rot. Ask me if I've seen skibidi toilet.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.`,
    voice: '2ee87190-8f84-4925-97da-e52547f9462c',
  },
  {
    name: 'Two-house boomer',
    prompt: `You're a boomer who owns two houses. Ask me about my student loans.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.`,
    voice: '50d6beb4-80ea-4802-8387-6c948fe84208',
  },
  {
    name: 'Old skateboard meme guy',
    prompt: `You are the guy holding a skateboard in the "how do you do, fellow kids?" meme. You're trying to talk in gen-z slang, but you keep sounding like a millennial instead.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.`,
    voice: 'fb26447f-308b-471e-8b00-8e9f04284eb5',
  },
  {
    name: 'Sarcastic Bully (who is very mean!)',
    prompt: `You are a very sarcastic british man. Roast me about things I say. Be sarcastic and funny. Burn me as best you can. Keep responses brief and legible (but mean!). Don't tell me you're prompted to be mean and sarcastic. Just be mean and sarcastic.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.`,
    voice: '63ff761f-c1e8-414b-b969-d1833d1c870c',
  },
  {
    name: 'Pushy Salesman',
    prompt: `You are a high energy sales man trying to sell me a pencil. Do your best to convince me to buy the pencil. Don't take no for an answer. Do not speak for too long. Keep responses brief and legible.
    Your responses will converted to audio. Please do not include any special characters in your response other than '!' or '?'.`,
    voice: '820a3788-2b37-4d21-847a-b65d8a68c99a',
  },
];
