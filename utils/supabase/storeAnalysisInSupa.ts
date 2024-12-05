import { BedsAndEventsOutput } from '../dataExtraction/handleAnalysis';

export type ExtractedEvent = {
  event_title: string;
  start_date_time: string;
  end_date_time: string;
  isAllDay: boolean;
  event_description: string;
};

export const storeAnalysisInSupa = async (extractedData: BedsAndEventsOutput, callUUID: number) => {
  const { num_beds, extracted_events, other_info } = extractedData;

  // First store the overall analysis
  const analysisResult = await fetch('/api/store-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      num_beds,
      events: extracted_events,
      other: other_info,
      callUUID,
    }),
  });

  if (!analysisResult.ok) {
    throw new Error('❌ Failed to store analysis');
  }
  console.log(`✅ Call analysis stored in supabase`);

  // Then store each event individually
  const eventPromises = extracted_events.map(async (event) => {
    const eventDetails = {
      event_title: event.event_title,
      event_start: event.start_date_time,
      event_end: event.end_date_time,
      event_desc: event.event_description,
      isAllDay: event.isAllDay,
      isRecurring: false,
      fk_call: callUUID,
    };

    const eventResult = await fetch('/api/store-events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(eventDetails),
    });

    if (!eventResult.ok) {
      throw new Error(`Failed to store event: ${event.event_title}`);
    }
    console.log(`✅ ${event.event_title} stored in supabase`);
    return eventResult;
  });

  // Wait for all event storage operations to complete
  await Promise.all(eventPromises);
};
