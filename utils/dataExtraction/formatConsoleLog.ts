import { BedsAndEventsOutput } from './handleAnalysis';

export const formatExtractedData = (data: BedsAndEventsOutput): string => {
  return `
  Extraction Results:
  ------------------
  Correctness: ${data.correctness}
  Number of Available Beds: ${data.num_avail_beds}
  Number of Total Beds: ${data.num_total_beds}
  
  Other Information:
  ${data.other_info.map((info) => `• ${info}`).join('\n')}
  
  Extracted Events:
  ${data.extracted_events
    .map(
      (event) => `
  • ${event.event_title}
    Start: ${new Date(event.start_date_time).toLocaleString()}
    End: ${new Date(event.end_date_time).toLocaleString()}
    All Day: ${event.isAllDay}
    Description: ${event.event_description}
  `
    )
    .join('\n')}
  `;
};
