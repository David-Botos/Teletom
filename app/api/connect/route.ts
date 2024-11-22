// [POST] /api
import {
  defaultBotProfile,
  defaultMaxDuration,
  defaultServices,
  recordingSettings,
} from '../../../rtvi.config';

export async function POST(request: Request) {
  const { services, config, rtvi_client_version } = await request.json();

  // console.log(
  //   "services: ",
  //   services,
  //   " config: ",
  //   config,
  //   process.env.NODE_ENV
  // );
  // //config
  // console.log("config.vad:", JSON.stringify(config[0], null, 2));
  // console.log("config.tts:", JSON.stringify(config[1], null, 2));
  // console.log("config.llm:", JSON.stringify(config[2], null, 2));
  // console.log("config.stt:", JSON.stringify(config[3], null, 2));

  if (!services || !config || !process.env.DAILY_BOTS_URL) {
    return new Response(`Services or config not found on request body`, {
      status: 400,
    });
  }

  const payload = {
    bot_profile: defaultBotProfile,
    services: { ...defaultServices, ...services },
    max_duration: defaultMaxDuration,
    // api_keys: {
    // openai: process.env.OPENAI_API_KEY,
    // grok: process.env.GROK_API_KEY,
    // gemini: process.env.GEMINI_API_KEY,
    // },
    recording_settings: {
      recordingSettings,
    },
    config: [...config],
    rtvi_client_version,
  };
  ``;

  // const options = {
  //   method: 'POST',
  //   headers: {Authorization: 'Bearer <token>', 'Content-Type': 'application/json'},
  //   body: '{
  //   "bot_profile":"voice_2024_10",
  //   "services":{"stt":"deepgram","llm":"anthropic","tts":"cartesia"},
  //   "service_options":{},
  //   "recording_settings":{
  //   "type":"cloud",
  //   "recordings_bucket":{"allow_api_access":true,"allow_streaming_from_bucket":true,"assume_role_arn":"<string>","bucket_name":"<string>","bucket_region":"<string>"}},
  //   "max_duration":200,
  ///  "config":["<any>"],
  //   "api_keys":{},
  ///  "dialin_settings":{"call_id":"<string>","call_domain":"<string>"},
  //   "dialout_settings":{},
  //   "webhook_tools":{}}'
  // };

  // fetch('https://api.daily.co/v1/bots/start', options)
  //   .then(response => response.json())
  //   .then(response => console.log(response))
  //   .catch(err => console.error(err));

  const req = await fetch(process.env.DAILY_BOTS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_BOTS_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const res = await req.json();

  if (req.status !== 200) {
    console.log('gang');
    console.log(res.json());
    return Response.json(res, { status: req.status });
  }

  return Response.json(res);
}
