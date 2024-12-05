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
  } catch (error) {
    throw error;
  }
};
