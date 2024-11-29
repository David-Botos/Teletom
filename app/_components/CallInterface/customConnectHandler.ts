import { RTVIClientParams } from 'realtime-ai';
import { storeRoomURL } from '@/utils/supabase/storeRoomURL';

export const customConnectHandler = async (
  params: RTVIClientParams,
  timeout: ReturnType<typeof setTimeout> | undefined,
  abortController: AbortController
): Promise<void> => {
  try {
    const response = await fetch(params.baseUrl + '/connect', {
      method: 'POST',
      mode: 'cors',
      headers: new Headers({
        'Content-Type': 'application/json',
        ...Object.fromEntries((params.headers ?? new Headers()).entries()),
      }),
      body: JSON.stringify({
        ...params.requestData,
      }),
      signal: abortController.signal,
    });

    if (!response.ok) {
      throw new Error(`Connection failed: ${response.status}`);
    }

    const responseData = await response.json();
    await storeRoomURL(responseData.room_url);

    if (timeout) {
      clearTimeout(timeout);
    }

    return responseData;
  } catch (error) {
    if (timeout) {
      clearTimeout(timeout);
    }
    
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    throw error;
  }
};