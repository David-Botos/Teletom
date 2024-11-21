import WebRTCClient from "./_components/CallInterface/webRTCClient";
import { CalendarComponent } from "./_components/dndCalendar";

export default function Home() {
  return (
    <div className="flex flex-col h-screen">
      {/* <div className="flex justify-between bg-slate-50 py-4 px-6">
        <div>
          <p>TAPN Demo</p>
        </div>
        <div>
          <p className="text-blue-600 font-bold">Start Call</p>
        </div>
      </div> */}
      {/* calendar / call interface */}
      <div className="flex h-full gap-5 m-10">
        <div className="h-full w-3/5 flex items-center">
          <div className="flex overflow-hidden w-full h-5/6">
            <CalendarComponent />
          </div>
        </div>
        <div className="w-2/5 h-full">
          <WebRTCClient />
        </div>
      </div>
    </div>
  );
}
