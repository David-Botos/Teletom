'use client';

import { DailyTransport } from '@daily-co/realtime-ai-daily';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { useEffect, useRef, useState } from 'react';
import { LLMHelper, RTVIClient } from 'realtime-ai';
import { RTVIClientAudio, RTVIClientProvider } from 'realtime-ai-react';

import CallUI from './callClient';
import { AppProvider } from './context';
import Header from './Header';
import Splash from './Splash';
import { BOT_READY_TIMEOUT, defaultConfig, defaultServices } from '../../../rtvi.config';

export default function WebRTCClient() {
  const [showSplash, setShowSplash] = useState(true);
  const voiceClientRef = useRef<RTVIClient | null>(null);

  useEffect(() => {
    if (!showSplash || voiceClientRef.current) {
      return;
    }

    const voiceClient = new RTVIClient({
      transport: new DailyTransport(),
      params: {
        baseUrl: '/api',
        requestData: {
          services: defaultServices,
          config: defaultConfig,
        },
      },
      timeout: BOT_READY_TIMEOUT,
    });

    const llmHelper = new LLMHelper({});
    voiceClient.registerHelper('llm', llmHelper);

    voiceClientRef.current = voiceClient;
  }, [showSplash]);

  if (showSplash) {
    return <Splash handleReady={() => setShowSplash(false)} />;
  }

  return (
    <RTVIClientProvider client={voiceClientRef.current!}>
      <AppProvider>
        <TooltipProvider>
          <main className="flex flex-col h-full">
            <Header />
            <div id="CallUI" className="h-full flex justify-center text-black">
              <CallUI />
            </div>
          </main>
          <aside id="tray" />
        </TooltipProvider>
      </AppProvider>
      <RTVIClientAudio />
    </RTVIClientProvider>
  );
}
