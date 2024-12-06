// localhost/api/dialout [POST]

import {
  defaultBotProfile,
  defaultConfig,
  defaultMaxDuration,
  defaultServices,
  recordingSettings,
} from './../../../rtvi.config';

export interface DialOutReqBody {
  dialout_data: [{ phoneNumber: string }];
  services: {
    [key: string]: any;
  };
  config: any[];
  rtvi_client_version: string;
  bot_profile?:
    | 'voice_2024_10'
    | 'voice_2024_08'
    | 'vision_2024_10'
    | 'vision_2024_08'
    | 'openai_realtime_beta_2024_10'
    | 'natural_conversation_2024_11'
    | 'twilio_ws_voice_2024_09';
  service_options?: {
    [serviceName: string]: object | object[];
  };
  recording_settings?: {
    [key: string]: any;
  };
  max_duration?: number;
  api_keys?: {
    [serviceName: string]: string;
  };
  dialin_settings?: {
    [key: string]: any;
  };
  webhook_tools?: {
    [key: string]: any;
  };
}

export async function POST(request: Request) {
  const { services, config, rtvi_client_version, dialout_data } = await request.json();

  if (!dialout_data) {
    return new Response(`dialout_data or phoneNumber not found on request body`, {
      status: 400,
    });
  }

  const payload = {
    bot_profile: defaultBotProfile,
    services: { ...defaultServices, ...services },
    max_duration: defaultMaxDuration,
    // api_keys: {
    // TODO: model specificity
    // },
    recording_settings: recordingSettings,
    config: [...config],
    dialout_settings: dialout_data,
    rtvi_client_version,
  };

  const req = await fetch('https://api.daily.co/v1/bots/start', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${process.env.DAILY_BOTS_API_KEY}`,
    },
    body: JSON.stringify(payload),
  });

  const res = await req.json();

  if (req.status !== 200) {
    return Response.json(res, { status: req.status });
  }

  return Response.json(res);
}
