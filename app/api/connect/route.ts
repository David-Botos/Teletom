// [POST] /api
import {
  defaultBotProfile,
  defaultMaxDuration,
  defaultServices,
  recordingSettings,
} from '../../../rtvi.config';

export async function POST(request: Request) {
  const { services, config, rtvi_client_version } = await request.json();

  if (!services || !config) {
    return new Response(`Services or config not found on request body`, {
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
