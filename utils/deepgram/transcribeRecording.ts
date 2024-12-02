// TODO: optimize by using callbacks to parallelize work and not hang the program
import { UrlSource } from '@deepgram/sdk';
export const transcribeURL = async (urlSource: UrlSource) => {
  const response = await fetch('/api/transcribe', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      url: urlSource,
      // ... any other Deepgram parameters (TODO: UNIMPLEMENTED)
    }),
  });

  const result = await response.json();
  return result;
};
