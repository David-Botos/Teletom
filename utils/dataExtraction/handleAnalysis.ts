export const handleAnalysis = async (transcript: string) => {
  try {
    const response = await fetch('/api/analyze-transcript', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        transcript: transcript,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error, { cause: errorData.details });
    }

    const extractedInformation = await response.json();
    return extractedInformation;
  } catch (error: any) {
    // Re-throw with more context if it's a network error
    if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
      throw new Error('Network error: Unable to connect to the analysis service', {
        cause: error,
      });
    }
    throw error; // Re-throw other errors
  }
};
