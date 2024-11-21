import WebRTCClient from "./_components/CallInterface/webRTCClient";
import { CalendarComponent } from "./_components/dndCalendar";

export default function Home() {
  return (
    <div className="flex flex-col h-screen overflow-clip">
      <div className="flex justify-between bg-slate-50 py-4 px-6">
        <div>
          <p>TAPN Demo</p>
        </div>
        <div>
          <p className="text-blue-600 font-bold">Start Call</p>
        </div>
      </div>
      {/* calendar / call interface */}
      <div className="h-full flex gap-5 mx-10">
        <div className="overflow-hidden h-4/5 w-3/5 mt-10">
          <CalendarComponent />
        </div>
        <div className="w-2/5 h-full">
          <WebRTCClient />
        </div>
      </div>
    </div>
  );
}
