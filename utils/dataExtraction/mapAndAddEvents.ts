import { CalendarEvent } from '@/context/CalendarContext';
import { ExtractedEvent } from './handleAnalysis';

export const mapAndAddEvents = (
  extractedEvents: ExtractedEvent[],
  addEvent: (event: CalendarEvent) => void
) => {
  extractedEvents.forEach((extractedEvent) => {
    // Convert string dates to Date objects
    const start = new Date(extractedEvent.start_date_time);
    const end = new Date(extractedEvent.end_date_time);

    // Create a CalendarEvent object from the extracted event
    const calendarEvent: CalendarEvent = {
      title: extractedEvent.event_title,
      start,
      end,
      allDay: extractedEvent.isAllDay,
      resource: {
        description: extractedEvent.event_description,
      },
    };

    // Add the event to the calendar context
    addEvent(calendarEvent);
  });
};
