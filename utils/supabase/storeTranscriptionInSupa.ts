export interface ModelDetails {
  name: string;
  version: string;
  arch: string;
}

export interface ModelInfo {
  '96a295ec-6336-43d5-b1cb-1e48b5e6d9a4': ModelDetails;
}

export interface Word {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

export interface Alternative {
  transcript: string;
  confidence: number;
  words: Word[];
}

export interface Channel {
  alternatives: Alternative[];
}

export interface Results {
  channels: Channel[];
}

export interface Metadata {
  transaction_key: string;
  request_id: string;
  sha256: string;
  created: string;
  duration: number;
  channels: number;
  models: string[];
  model_info: ModelInfo;
}

export interface RawTranscription {
  metadata: Metadata;
  results: Results;
}

export interface TranscriptionRequest {
  duration: number;
  full_transcript: string;
  individual_words: Array<{
    word: string;
    start: number;
    end: number;
    confidence: number;
  }>;
}

export type UploadType = 'bot' | 'cbo' | 'full';

export const prepareTranscriptionData = (
  rawTranscription: RawTranscription
): TranscriptionRequest => {
  return {
    duration: rawTranscription.metadata.duration,
    full_transcript: rawTranscription.results.channels[0].alternatives[0].transcript,
    individual_words: rawTranscription.results.channels[0].alternatives[0].words,
  };
};

const storeTranscription = async (
  rawTranscription: RawTranscription,
  uploadType: UploadType
): Promise<number> => {
  console.log('🔵 storeTranscription helper function called');

  // prep the body of req
  const transcript_data: TranscriptionRequest = prepareTranscriptionData(rawTranscription);

  try {
    // POST req
    console.log('🚀 Sending POST request to /api/store-transcript-in-supa');
    const response = await fetch('/api/store-transcript-in-supa', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ transcript_data, uploadType }),
    });

    // handle error res
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    // return uuid as number
    const data = await response.json();
    return data.id;
  } catch (error) {
    console.error('❌ Error when calling store-transcript-in-supa:', error);
    throw error;
  }
};

export const getCallUUID = async (room_url: string): Promise<number> => {
  try {
    // GET req
    console.log('🚀 Sending GET request to /api/get-call-uuid');
    const res = await fetch('/api/get-call-uuid', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ room_url }),
    });

    // handle error res
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error);
    }

    // return uuid as number
    const data = await res.json();
    return data.id;
  } catch (error) {
    console.error('❌ Error when calling get-supa-uuid:', error);
    throw error;
  }
};

const updateCalls = async (transcriptUUID: number, callUUID: number, uploadType: UploadType) => {
  try {
    console.log('🚀 Sending GET request to /api/update-with-transcript');
    const res = await fetch('/api/update-with-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        id: callUUID,
        transcriptUUID: transcriptUUID,
        uploadType: uploadType,
      }),
    });
    return res;
  } catch (error) {
    console.error('❌ Error when calling get-supa-uuid:', error);
    throw error;
  }
};

export const handleTranscriptUpload = async (
  rawTranscription: RawTranscription,
  room_url: string,
  uploadType: UploadType
) => {
  const transcriptUUID = await storeTranscription(rawTranscription, uploadType);
  console.log(`✅ ${uploadType} transcript is stored with uuid: `, transcriptUUID);
  const callUUID = await getCallUUID(room_url);
  console.log('✅ Fetched call uuid: ', callUUID);
  const updateRes = await updateCalls(transcriptUUID, callUUID, uploadType);
  console.log(
    updateRes.ok
      ? `🏁 ${uploadType} transcript uploaded and linked to calls table`
      : `❌ Error occurred when uploading the ${uploadType} transcript id to the calls table`
  );
};
