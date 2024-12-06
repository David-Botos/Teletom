'use client';
import { Calendar, dateFnsLocalizer } from 'react-big-calendar';
import withDragAndDrop, { withDragAndDropProps } from 'react-big-calendar/lib/addons/dragAndDrop';
import { format, parse, startOfWeek, getDay } from 'date-fns';
import { enUS } from 'date-fns/locale/en-US';
import 'react-big-calendar/lib/addons/dragAndDrop/styles.css';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import { CalendarEvent, useCalendar } from '@/context/CalendarContext';

const locales = {
  'en-US': enUS,
};

const localizer = dateFnsLocalizer({
  format,
  parse,
  startOfWeek,
  getDay,
  locales,
});

const DnDCalendar = withDragAndDrop(Calendar);

export const CalendarComponent = () => {
  const { events, handleEventResize, handleEventDrop } = useCalendar();

  const onEventResize: withDragAndDropProps['onEventResize'] = (data) => {
    const { start, end } = data;
    if (start && end) {
      handleEventResize(start, end);
    }
  };

  const onEventDrop: withDragAndDropProps['onEventDrop'] = (data) => {
    const { start, end, event } = data;
    if (start && end && event && event.start && event.end) {
      const calendarEvent: CalendarEvent = {
        ...event,
        start: new Date(event.start),
        end: new Date(event.end),
      };
      handleEventDrop(start, end, calendarEvent);
    }
  };

  return (
    <DnDCalendar
      defaultView="week"
      events={events}
      localizer={localizer}
      onEventDrop={onEventDrop}
      onEventResize={onEventResize}
      resizable
      style={{ height: '100%', width: '100%' }}
    />
  );
};
