// context/CalendarContext.tsx
'use client';
import React, { createContext, useContext, useState } from 'react';
import { Event as RBCEvent, stringOrDate } from 'react-big-calendar';
import { addHours, startOfHour } from 'date-fns';

// Define a stricter event type that requires Date objects
export interface CalendarEvent extends Omit<RBCEvent, 'start' | 'end'> {
  start: Date;
  end: Date;
}

interface CalendarContextType {
  events: CalendarEvent[];
  addEvent: (event: CalendarEvent) => void;
  updateEvent: (event: CalendarEvent) => void;
  handleEventResize: (start: stringOrDate, end: stringOrDate) => void;
  handleEventDrop: (start: stringOrDate, end: stringOrDate, event: CalendarEvent) => void;
}

const CalendarContext = createContext<CalendarContextType | undefined>(undefined);

// Helper functions
const endOfHour = (date: Date): Date => addHours(startOfHour(date), 1);
const now = new Date();
const start = endOfHour(now);
const end = addHours(start, 2);

export const CalendarProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [events, setEvents] = useState<CalendarEvent[]>([
    {
      title: 'Learn cool stuff',
      start,
      end,
    },
  ]);

  const addEvent = (event: CalendarEvent) => {
    setEvents((current) => [...current, event]);
  };

  const updateEvent = (updatedEvent: CalendarEvent) => {
    setEvents((current) =>
      current.map((event) => (event.start === updatedEvent.start ? updatedEvent : event))
    );
  };

  const handleEventResize = (start: stringOrDate, end: stringOrDate) => {
    setEvents((current) => {
      const newEvent: CalendarEvent = {
        title: 'New Event',
        start: new Date(start),
        end: new Date(end),
      };
      return [...current, newEvent];
    });
  };

  const handleEventDrop = (start: stringOrDate, end: stringOrDate, event: CalendarEvent) => {
    setEvents((current) =>
      current.map((existingEvent) =>
        existingEvent === event
          ? { ...existingEvent, start: new Date(start), end: new Date(end) }
          : existingEvent
      )
    );
  };

  return (
    <CalendarContext.Provider
      value={{
        events,
        addEvent,
        updateEvent,
        handleEventResize,
        handleEventDrop,
      }}
    >
      {children}
    </CalendarContext.Provider>
  );
};

export const useCalendar = () => {
  const context = useContext(CalendarContext);
  if (context === undefined) {
    throw new Error('useCalendar must be used within a CalendarProvider');
  }
  return context;
};
