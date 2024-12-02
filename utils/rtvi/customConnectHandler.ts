import { RTVIClientParams } from 'realtime-ai';
import { storeS3DataInSupa } from '@/utils/supabase/storeS3DataInSupa';
import { DailyTransportAuthBundle } from '@daily-co/realtime-ai-daily';
import { MutableRefObject } from 'react';

export const customConnectHandler = async (
  params: RTVIClientParams,
  timeout: ReturnType<typeof setTimeout> | undefined,
  abortController: AbortController,
  authBundleRef: MutableRefObject<DailyTransportAuthBundle | null>
): Promise<void> => {
  try {
    console.log('🔵 customConnectHandler has been called');
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
    console.log('customConnectHandler.ts is returning this authBundle: ', responseData);
    authBundleRef.current = responseData;
    console.log('📥 authBundleRef received the value: ', authBundleRef.current);

    // store the room_url & the s3_folder_directory
    await storeS3DataInSupa(responseData.room_url);

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
