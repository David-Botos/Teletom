import { RTVIClientParams } from "realtime-ai";

/**
 * Custom connection handler for RTVIClient
 * @param params - Client parameters including baseUrl and request data
 * @param timeout - Optional timeout handle for the connection attempt
 * @param abortController - Controller for aborting the connection attempt
 * @returns Promise resolving to the connection response
 */
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

    // Clear the timeout since connection was successful
    if (timeout) {
      clearTimeout(timeout);
    }

    return await response.json();
  } catch (error) {
    // If the error was due to abort signal, rethrow it
    if (error instanceof Error && error.name === 'AbortError') {
      throw error;
    }
    
    // Clear timeout and rethrow the error
    if (timeout) {
      clearTimeout(timeout);
    }
    throw error;
  }
};