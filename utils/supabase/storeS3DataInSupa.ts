export const storeS3DataInSupa = async (roomUrl: string): Promise<string> => {
  console.log('🔵 storeS3DataInSupa client function called');
  console.log('🔍 Received roomUrl:', roomUrl);

  try {
    console.log('🚀 Sending POST request to /api/store-s3-data');
    const response = await fetch('/api/store-s3-data', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ roomUrl }),
    });

    console.log('📨 Response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Server responded with error:', response.status, errorText);
      throw new Error(`Failed to store room URL: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    console.log('✅ Successfully stored S3 data with ID:', data.id);
    return data.id;

  } catch (error) {
    console.error('❌ Error in storeS3DataInSupa:', error);
    throw error;
  }
};