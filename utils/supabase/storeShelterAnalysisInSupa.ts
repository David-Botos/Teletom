import { Database } from '@/database.types';
import { ShelterAnalysisOutput } from '../dataExtraction/handleAnalysis';

type ShelterAnalysisInsert = Database['public']['Tables']['shelter_analysis']['Insert'];

export const storeShelterAnalysisInSupa = async (
  extractedData: ShelterAnalysisOutput,
  callUUID: number
) => {
  const currentTime = new Date().toISOString();
  // Store the complete analysis
  const analysisData: ShelterAnalysisInsert = {
    correctness: extractedData.correctness,
    timestamp: currentTime,
    shelter_name: extractedData.shelter_name,
    capacity: extractedData.capacity,
    access_type: extractedData.access_type,
    intake_process: extractedData.intake_process,
    population_served: extractedData.population_served,
    services: extractedData.services,
    referral_process: extractedData.referral_process,
    contacts: extractedData.contacts,
    extracted_events: extractedData.extracted_events,
    other_info: extractedData.other_info,
    vulnerability_criteria: extractedData.vulnerability_criteria,
    alternative_resources: extractedData.alternative_resources,
  };

  const analysisResult = await fetch('/api/store-shelter-analysis', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(analysisData),
  });

  if (!analysisResult.ok) {
    const errorData = await analysisResult.json();
    throw new Error(`❌ Failed to store analysis: ${errorData.error}`);
  }
  console.log(`✅ Complete shelter analysis stored in supabase`);

  // Store events separately using the existing events table structure
  if (extractedData.extracted_events && extractedData.extracted_events.length >= 1) {
    const eventPromises = extractedData.extracted_events.map(async (event) => {
      const eventDetails: Database['public']['Tables']['events']['Insert'] = {
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
      console.log(`✅ Event "${event.event_title}" stored in supabase`);
      return eventResult;
    });

    // Wait for all storage operations to complete
    await Promise.all(eventPromises);
  }
};
