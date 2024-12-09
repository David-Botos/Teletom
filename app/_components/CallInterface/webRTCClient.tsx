'use client';

import { DailyTransport, DailyTransportAuthBundle } from '@daily-co/realtime-ai-daily';
import { TooltipProvider } from '@radix-ui/react-tooltip';
import { MutableRefObject, useEffect, useRef, useState } from 'react';
import { LLMHelper, RTVIClient } from 'realtime-ai';
import { RTVIClientAudio, RTVIClientProvider } from 'realtime-ai-react';

import CallUI from './callClient';
import { AppProvider } from './context';
import Header from './Header';
import Splash from './Splash';
import { BOT_READY_TIMEOUT, defaultConfig, defaultServices } from '../../../rtvi.config';
import {
  customConnectHandlerDialOut,
  // customConnectHandlerWeb,
} from '../../../utils/rtvi/customConnectHandler';
import { CommunityServices, generateConfig } from '@/utils/conversation/generatePrompt';

export default function WebRTCClient() {
  const [showSplash, setShowSplash] = useState(true);
  const voiceClientRef = useRef<RTVIClient | null>(null);
  const authBundleRef: MutableRefObject<DailyTransportAuthBundle | null> =
    useRef<DailyTransportAuthBundle | null>(null);

  useEffect(() => {
    if (!showSplash || voiceClientRef.current) {
      return;
    }

    const transportObject: DailyTransport = new DailyTransport();

    // Customize the CBO and its services here
    const newConfig = generateConfig(defaultConfig, {
      cbo_name: 'Bethany Presbyterian',
      arr_services: [
        CommunityServices.FOOD_RESOURCES,
        CommunityServices.SHELTER,
        CommunityServices.MENTAL_HEALTH,
      ],
    });

    console.log('newConfig', newConfig);

    const voiceClient = new RTVIClient({
      transport: transportObject,
      params: {
        baseUrl: '/api',
        requestData: {
          services: defaultServices,
          config: newConfig,
        },
      },
      timeout: BOT_READY_TIMEOUT,
      customConnectHandler: (params, timeout, abortController) =>
        customConnectHandlerDialOut(params, timeout, abortController, authBundleRef, [
          { phoneNumber: '+16304277199' },
        ]),
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
              <CallUI authBundleRef={authBundleRef} />
            </div>
          </main>
          <aside id="tray" />
        </TooltipProvider>
      </AppProvider>
      <RTVIClientAudio />
    </RTVIClientProvider>
  );
}
