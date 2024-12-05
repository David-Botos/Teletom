export type ExtractedEvent = {
  event_title: string;
  start_date_time: string;
  end_date_time: string;
  isAllDay: boolean;
  event_description: string;
};

export type BedsAndEventsOutput = {
  correctness: boolean;
  num_beds: number;
  other_info: string[];
  extracted_events: ExtractedEvent[];
};

export const handleAnalysis = async (transcript: string): Promise<BedsAndEventsOutput> => {
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
