'use client';
import { useRef } from 'react';
import WebRTCClient from './_components/callInterface/webRTCClient';
import { CalendarComponent } from './_components/dndCalendar';
import { useAvailableHeight } from './_hooks/useAvailableHeight';
import { CalendarProvider } from '@/context/CalendarContext';

export default function Home() {
  const navRef = useRef<HTMLDivElement>(null);
  const availableHeight = useAvailableHeight(navRef);

  return (
    <CalendarProvider>
      <div className="flex flex-col h-screen bg-white">
        <div className="flex justify-between bg-slate-400 py-4 px-6" ref={navRef}>
          <div>
            <p className="text-white font-bold">TAPN Demo</p>
          </div>
          <div>{/* <p className="text-blue-600 font-bold">Start Call</p> */}</div>
        </div>
        {/* calendar / call interface */}
        <div className="flex gap-5 p-10" style={{ height: availableHeight }}>
          <div className="h-full w-3/5 flex items-center">
            <div className="flex overflow-hidden w-full h-full">
              <CalendarComponent />
            </div>
          </div>
          <div className="w-2/5 h-full">
            <WebRTCClient />
          </div>
        </div>
      </div>
    </CalendarProvider>
  );
}
