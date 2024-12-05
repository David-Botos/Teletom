import { BedsAndEventsOutput } from '../dataExtraction/handleAnalysis';

export const storeAnalysisInSupa = async (extractedData: BedsAndEventsOutput, callUUID: number) => {
  const num_beds = extractedData.num_beds;
  const events = extractedData.extracted_events;
  const other = extractedData.other_info;

  const analysisResult = await fetch('/api/store-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      num_beds: num_beds,
      events: events,
      other: other,
      callUUID: callUUID,
    }),
  });

  
};
