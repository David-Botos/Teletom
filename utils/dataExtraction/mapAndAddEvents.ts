import { CalendarEvent } from '@/context/CalendarContext';
import { ExtractedEvent } from './handleAnalysis';

/**
 * Maps extracted events to calendar events and adds them to the calendar
 * @param extractedEvents - Array of events extracted from source
 * @param addEvent - Function to add event to calendar context
 * @returns void
 * @throws Error if date parsing or event addition fails
 */
export const mapAndAddEvents = (
  extractedEvents: ExtractedEvent[],
  addEvent: (event: CalendarEvent) => void
): void => {
  console.log('🔵 Starting mapAndAddEvents function');

  if (!Array.isArray(extractedEvents)) {
    const error = new Error('extractedEvents must be an array');
    console.error('❌ Invalid input:', error.message);
    throw error;
  }

  console.log(`📥 Received ${extractedEvents.length} events to process`);
  let successCount = 0;
  let errorCount = 0;

  extractedEvents.forEach((extractedEvent, index) => {
    try {
      // Validate required fields
      if (
        !extractedEvent.start_date_time ||
        !extractedEvent.end_date_time ||
        !extractedEvent.event_title
      ) {
        throw new Error(`Missing required fields in event at index ${index}`);
      }

      // Convert string dates to Date objects with validation
      const start = new Date(extractedEvent.start_date_time);
      const end = new Date(extractedEvent.end_date_time);

      if (isNaN(start.getTime())) {
        throw new Error(`Invalid start date: ${extractedEvent.start_date_time}`);
      }
      if (isNaN(end.getTime())) {
        throw new Error(`Invalid end date: ${extractedEvent.end_date_time}`);
      }
      if (end < start) {
        throw new Error(`End date ${end} is before start date ${start}`);
      }

      console.log('🕐 Processing event:', {
        title: extractedEvent.event_title,
        start: start.toISOString(),
        end: end.toISOString(),
      });

      // Create a CalendarEvent object from the extracted event
      const calendarEvent: CalendarEvent = {
        title: extractedEvent.event_title,
        start,
        end,
        allDay: extractedEvent.isAllDay,
        resource: {
          description: extractedEvent.event_description || '', // Provide default for optional field
        },
      };

      // Add the event to the calendar context
      addEvent(calendarEvent);
      successCount++;

      console.log(`✅ Added event: ${extractedEvent.event_title}`);
    } catch (error) {
      errorCount++;
      console.error('❌ Failed to process event:', {
        index,
        error: error instanceof Error ? error.message : 'Unknown error',
        eventTitle: extractedEvent.event_title || 'Untitled',
      });
      // Don't throw here to allow processing of remaining events
    }
  });

  if (successCount === extractedEvents.length) {
    console.log(`🎉 Successfully processed all ${successCount} events!`);
  } else if (successCount > 0) {
    console.warn(`⚠️ Partially completed: ${successCount} succeeded, ${errorCount} failed`);
  } else if (extractedEvents.length > 0) {
    const error = new Error(
      `Failed to process any events out of ${extractedEvents.length} total events`
    );
    console.error('❌ Complete failure:', error.message);
    throw error;
  }

  console.log('🏁 Finished processing events');
};
