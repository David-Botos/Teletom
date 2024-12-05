'use client';

import { Ear, Loader2 } from 'lucide-react';
import { MutableRefObject, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { RTVIError, RTVIEvent, RTVIMessage } from 'realtime-ai';
import { useRTVIClient, useRTVIClientEvent, useRTVIClientTransportState } from 'realtime-ai-react';

import { AppContext } from './context';
import Session from './Session';
import { Configure } from './Setup';
import { Alert } from './ui/alert';
import { Button } from './ui/button';
import * as Card from './ui/card';
import { attemptFetchRecordings } from '@/utils/s3/fetchRecording';
import { DailyTransportAuthBundle } from '@daily-co/realtime-ai-daily';
import { constructS3Directory } from '@/utils/supabase/constructS3Directory';
import { transcribeURL } from '@/utils/deepgram/transcribeRecording';
import {
  getCallUUID,
  handleTranscriptUpload,
  RawTranscription,
} from '@/utils/supabase/storeTranscriptionInSupa';
import { BedsAndEventsOutput, handleAnalysis } from '@/utils/dataExtraction/handleAnalysis';
import { formatExtractedData } from '@/utils/dataExtraction/formatConsoleLog';
import { storeAnalysisInSupa } from '@/utils/supabase/storeAnalysisInSupa';

const status_text = {
  idle: 'Initializing...',
  initialized: 'Start',
  authenticating: 'Requesting bot...',
  connecting: 'Connecting...',
  disconnected: 'Start',
};

interface CallUIProps {
  authBundleRef: MutableRefObject<DailyTransportAuthBundle | null>;
}

export default function CallUI({ authBundleRef }: CallUIProps) {
  const voiceClient = useRTVIClient()!;
  const transportState = useRTVIClientTransportState();
  const [appState, setAppState] = useState<'idle' | 'ready' | 'connecting' | 'connected'>('idle');
  const [error, setError] = useState<string | null>(null);
  const [startAudioOff, setStartAudioOff] = useState<boolean>(false);
  const mountedRef = useRef<boolean>(false);
  const { clientParams } = useContext(AppContext);

  useRTVIClientEvent(
    RTVIEvent.Error,
    useCallback((message: RTVIMessage) => {
      const errorData = message.data as { error: string; fatal: boolean };
      if (!errorData.fatal) return;
      setError(errorData.error);
    }, [])
  );

  useEffect(() => {
    // Initialize local audio devices
    if (!voiceClient || mountedRef.current) return;
    mountedRef.current = true;
    voiceClient.initDevices();
  }, [appState, voiceClient]);

  useEffect(() => {
    voiceClient.params = {
      ...voiceClient.params,
      requestData: {
        ...voiceClient.params.requestData,
        ...clientParams,
      },
    };
  }, [voiceClient, appState, clientParams]);

  useEffect(() => {
    // Update app state based on voice client transport state.
    // We only need a subset of states to determine the ui state,
    // so this effect helps avoid excess inline conditionals.
    console.log(transportState);
    switch (transportState) {
      case 'initialized':
      case 'disconnected':
        setAppState('ready');
        break;
      case 'authenticating':
      case 'connecting':
        setAppState('connecting');
        break;
      case 'connected':
      case 'ready':
        setAppState('connected');
        break;
      default:
        setAppState('idle');
    }
  }, [transportState]);

  async function start() {
    if (!voiceClient) return;

    // Join the session
    try {
      // Disable the mic until the bot has joined
      // to avoid interrupting the bot's welcome message
      voiceClient.enableMic(false);
      const connectionPromise = new Promise<void>((resolve) => {
        voiceClient.on('connected', () => resolve());
      });
      await voiceClient.connect();
      await connectionPromise;
    } catch (e) {
      setError((e as RTVIError).message || 'Unknown error occured');
      voiceClient.disconnect();
    }
  }

  async function leave() {
    // Disconnect the voice client
    await voiceClient.disconnect();

    try {
      if (!authBundleRef.current) {
        throw new Error('❌ authBundleRef.current does not exist - callClient.tsx > leave()');
      }

      // Construct S3 directory
      const s3_prefix = constructS3Directory(authBundleRef.current.room_url);

      // Fetch recordings with polling mechanism
      console.log('🔄 Starting recording fetch attempts...');
      const [cboRecording, botRecording] = await attemptFetchRecordings(s3_prefix);

      if (!cboRecording || !botRecording) {
        throw new Error('Failed to fetch one or both recordings');
      }

      // Transcribe recordings with presigned s3 urls
      console.log('🛜 Starting transcription on CBO recording presigned url...');
      const cboTranscription: RawTranscription = await transcribeURL(cboRecording);
      console.log('📝 cboTranscription returned with the value: ', cboTranscription);
      console.log('🛜 Starting transcription on bot recording presigned url...');
      const botTranscription: RawTranscription = await transcribeURL(botRecording);
      console.log('📝 botTranscription returned with the value: ', botTranscription);

      // Store the transcripts
      console.log('🔵 Calling handleTranscriptUpload on cbo transcript...');
      handleTranscriptUpload(cboTranscription, authBundleRef.current.room_url, false);
      console.log('🔵 Calling handleTranscriptUpload on bot transcript...');
      handleTranscriptUpload(botTranscription, authBundleRef.current.room_url, true);

      // Analyze the recording
      const truncCBOTranscript = cboTranscription.results.channels[0].alternatives[0].transcript;
      console.log('📝 TruncCBOTranscript: ', truncCBOTranscript);
      // const truncBotTranscript = botTranscription.results.channels[0].alternatives[0].transcript;
      const extractedData: BedsAndEventsOutput = await handleAnalysis(truncCBOTranscript);
      console.log(formatExtractedData(extractedData));

      // Store the analysis
      const callUUID = await getCallUUID(authBundleRef.current.room_url);
      storeAnalysisInSupa(extractedData, callUUID);
      // for each event handle its upload to supa
    } catch (error) {
      console.error('❌ Error during the recording fetch and transcription process:', error);
      throw error;
    }
  }

  /**
   * UI States
   */

  // Error: show full screen message
  if (error) {
    return (
      <Alert intent="danger" title="An error occurred">
        {error}
      </Alert>
    );
  }

  // Connected: show session view
  if (appState === 'connected') {
    return <Session state={transportState} onLeave={() => leave()} startAudioOff={startAudioOff} />;
  }

  // Default: show setup view
  const isReady = appState === 'ready';

  return (
    <Card.Card shadow className="animate-appear max-w-lg">
      <Card.CardHeader>
        <Card.CardTitle>Configuration</Card.CardTitle>
      </Card.CardHeader>
      <Card.CardContent stack>
        <div className="flex flex-row gap-2 bg-primary-50 px-4 py-2 md:p-2 text-sm items-center justify-center rounded-md font-medium text-pretty">
          <Ear className="size-7 md:size-5 text-primary-400" />
          Works best in a quiet environment with a good internet.
        </div>
        <Configure
          startAudioOff={startAudioOff}
          handleStartAudioOff={() => setStartAudioOff(!startAudioOff)}
          state={appState}
        />
      </Card.CardContent>
      <Card.CardFooter isButtonArray>
        <Button key="start" onClick={() => start()} disabled={!isReady}>
          {!isReady && <Loader2 className="animate-spin" />}
          {status_text[transportState as keyof typeof status_text]}
        </Button>
      </Card.CardFooter>
    </Card.Card>
  );
}
