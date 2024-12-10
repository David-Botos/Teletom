export interface UrlSource {
  url: string;
}

interface S3File {
  key: string;
  size: number;
  lastModified: Date;
}

interface ListFilesResponse {
  files: S3File[];
  error?: string;
}

interface SignedUrlResponse {
  url: string;
  error?: string;
}

type FetchType = 'bot' | 'cbo' | 'full';

export async function fetchRecording(
  prefix: string,
  fetchType: FetchType = 'full'
): Promise<UrlSource> {
  console.log(`🔵 Starting to fetch ${fetchType} recording`);
  // First, list the files in the directory
  const listResponse = await fetch(`/api/list-s3-files?prefix=${encodeURIComponent(prefix)}`);
  const listData: ListFilesResponse = await listResponse.json();
  console.log(
    '📥 These are the files that are listed in the s3 directory: ',
    JSON.stringify(listData.files)
  );

  if (!listResponse.ok) {
    throw new Error(listData.error || 'Failed to list files');
  }

  if (!listData.files || listData.files.length === 0) {
    throw new Error('No files found in directory');
  }

  let selectedFile;

  if (fetchType === 'full') {
    selectedFile = listData.files[0];
    if (!selectedFile?.key) {
      throw new Error(`Unable to find ${fetchType} recording file`);
    }
    console.log('👉 This is the file that was selected: ', JSON.stringify(selectedFile));
  } else {
    // Select first or second file based on returnBot parameter
    // TODO: The order of bot vs cbo recordings might not be definite -- for now I am defaulting to a full cloud recording
    selectedFile = fetchType === 'bot' ? listData.files[0] : listData.files[1];
    if (!selectedFile?.key) {
      throw new Error(`Unable to find ${fetchType} recording file`);
    }
    console.log('👉 This is the file that was selected: ', JSON.stringify(selectedFile));
  }

  // Get signed URL for the selected file
  const urlResponse = await fetch(
    `/api/get-s3-signed-url?key=${encodeURIComponent(selectedFile.key)}`
  );
  const urlData: SignedUrlResponse = await urlResponse.json();

  if (!urlResponse.ok) {
    throw new Error(urlData.error || 'Failed to generate signed URL');
  }

  return { url: urlData.url };
}

const MAX_RETRIES = 10;
const RETRY_DELAY = 5000; // 5 seconds

// handle polling for bot and cbo recording
export async function attemptFetchRecordings(
  s3_prefix: string,
  retryCount = 0
): Promise<[UrlSource | null, UrlSource | null]> {
  try {
    const [cboRecording, botRecording] = await Promise.all([
      fetchRecording(s3_prefix, 'cbo'),
      fetchRecording(s3_prefix, 'bot'),
    ]);

    if (cboRecording && botRecording) {
      console.log('📬 Both recordings fetched successfully');
      return [cboRecording, botRecording];
    }

    throw new Error('One or both recordings not found');
  } catch (error) {
    console.log(`❌ Attempt ${retryCount + 1}/${MAX_RETRIES} failed to fetch recordings:`, error);

    if (retryCount >= MAX_RETRIES - 1) {
      console.log('❌ Max retries reached. Failed to fetch recordings.');
      throw new Error('Failed to fetch recordings after maximum retry attempts');
    }

    console.log(`⏳ Waiting ${RETRY_DELAY / 1000} seconds before retry ${retryCount + 1}...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    return attemptFetchRecordings(s3_prefix, retryCount + 1);
  }
}

// handle polling for just full recording
export async function attemptFetchFullRecording(
  s3_prefix: string,
  retryCount = 0
): Promise<UrlSource> {
  try {
    const fullRecording = await fetchRecording(s3_prefix, 'full');
    console.log('📬 Full recording fetched successfully');
    return fullRecording;
  } catch (error) {
    console.log(`❌ Attempt ${retryCount + 1}/${MAX_RETRIES} failed to fetch recording:`, error);

    if (retryCount >= MAX_RETRIES - 1) {
      console.log('❌ Max retries reached. Failed to fetch recording.');
      throw new Error('Failed to fetch recording after maximum retry attempts');
    }

    console.log(`⏳ Waiting ${RETRY_DELAY / 1000} seconds before retry ${retryCount + 1}...`);
    await new Promise((resolve) => setTimeout(resolve, RETRY_DELAY));
    return attemptFetchFullRecording(s3_prefix, retryCount + 1);
  }
}
