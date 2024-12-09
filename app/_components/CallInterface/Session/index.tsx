import { LineChart, Loader2, LogOut, Settings, StopCircle } from "lucide-react";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  PipecatMetricsData,
  RTVIClientConfigOption,
  RTVIEvent,
  TransportState,
} from "realtime-ai";
import { useRTVIClient, useRTVIClientEvent } from "realtime-ai-react";

import StatsAggregator from "../_utils/stats_aggregator";
import { Configure } from "../Setup";
import { Button } from "../ui/button";
import * as Card from "../ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "../ui/tooltip";

import Agent from "./Agent";
import Stats from "./Stats";
import UserMicBubble from "./UserMicBubble";

let stats_aggregator: StatsAggregator;

interface SessionProps {
  state: TransportState;
  onLeave: () => void;
  openMic?: boolean;
  startAudioOff?: boolean;
}

export const Session = React.memo(
  ({ state, onLeave, startAudioOff = false }: SessionProps) => {
    const voiceClient = useRTVIClient()!;
    const [hasStarted, setHasStarted] = useState<boolean>(false);
    const [showConfig, setShowConfig] = useState<boolean>(false);
    const [showStats, setShowStats] = useState<boolean>(false);
    const [muted, setMuted] = useState(startAudioOff);
    // TODO: Check out the purpose of this
    const [runtimeConfigUpdate, setRuntimeConfigUpdate] = useState<
      RTVIClientConfigOption[] | null
    >(null);
    const [updatingConfig, setUpdatingConfig] = useState<boolean>(false);

    const modalRef = useRef<HTMLDialogElement>(null);
    //const bingSoundRef = useRef<HTMLAudioElement>(null);
    //const bongSoundRef = useRef<HTMLAudioElement>(null);

    // ---- Voice Client Events

    useRTVIClientEvent(
      RTVIEvent.Metrics,
      useCallback((metrics: PipecatMetricsData) => {
        metrics?.ttfb?.map((m: { processor: string; value: number }) => {
          stats_aggregator.addStat([m.processor, "ttfb", m.value, Date.now()]);
        });
      }, [])
    );

    useRTVIClientEvent(
      RTVIEvent.BotStoppedSpeaking,
      useCallback(() => {
        if (hasStarted) return;

        /*if (bingSoundRef.current) {
          bingSoundRef.current.volume = 0.5;
          bingSoundRef.current.play();
        }*/
        setHasStarted(true);
      }, [hasStarted])
    );

    useRTVIClientEvent(
      RTVIEvent.UserStoppedSpeaking,
      useCallback(() => {
        /*if (bongSoundRef.current) {
          bongSoundRef.current.volume = 0.5;
          bongSoundRef.current.play();
        }*/

        if (hasStarted) return;
        setHasStarted(true);
      }, [hasStarted])
    );

    useRTVIClientEvent(
      RTVIEvent.ParticipantLeft,
      onLeave
    );
    // ---- Effects

    useEffect(() => {
      // Reset started state on mount
      setHasStarted(false);
    }, []);

    useEffect(() => {
      // If we joined unmuted, enable the mic once in ready state
      if (!hasStarted || startAudioOff) return;
      voiceClient.enableMic(true);
    }, [voiceClient, startAudioOff, hasStarted]);

    useEffect(() => {
      // Create new stats aggregator on mount (removes stats from previous session)
      stats_aggregator = new StatsAggregator();
    }, []);

    useEffect(() => {
      // Leave the meeting if there is an error
      if (state === "error") {
        onLeave();
      }
    }, [state, onLeave]);

    useEffect(() => {
      // Modal effect
      // Note: backdrop doesn't currently work with dialog open, so we use setModal instead
      const current = modalRef.current;

      if (current && showConfig) {
        current.inert = true;
        current.showModal();
        current.inert = false;
      }
      return () => current?.close();
    }, [showConfig]);

    function toggleMute() {
      voiceClient.enableMic(muted);
      setMuted(!muted);
    }

    return (
      <div className="flex h-full flex-col justify-between">
        <dialog ref={modalRef}>
          <Card.Card className="w-svw max-w-full md:max-w-md lg:max-w-lg">
            <Card.CardHeader>
              <Card.CardTitle>Configuration</Card.CardTitle>
            </Card.CardHeader>
            <Card.CardContent>
              <Configure state={state} inSession={true} />
            </Card.CardContent>
            <Card.CardFooter isButtonArray>
              <Button variant="outline" onClick={() => setShowConfig(false)}>
                Cancel
              </Button>
              <Button
                variant="success"
                disabled={updatingConfig}
                onClick={async () => {
                  const config: RTVIClientConfigOption[] = (
                    voiceClient.params.requestData as {
                      config: RTVIClientConfigOption[];
                    }
                  )?.config;
                  if (!config) return;

                  setUpdatingConfig(true);
                  await voiceClient.updateConfig(config);
                  // On update, reset state
                  setUpdatingConfig(false);
                  setShowConfig(false);
                }}
              >
                {updatingConfig && <Loader2 className="animate-spin" />}
                {updatingConfig ? "Updating..." : "Save Changes"}
              </Button>
            </Card.CardFooter>
          </Card.Card>
        </dialog>

        {showStats &&
          createPortal(
            <Stats
              statsAggregator={stats_aggregator}
              handleClose={() => setShowStats(false)}
            />,
            document.getElementById("tray")!
          )}

        <div className="flex flex-col items-center justify-center w-full gap-10">
          <Card.Card
            fullWidthMobile={false}
            className="w-full max-w-[320px] sm:max-w-[420px] mt-auto shadow-long"
          >
            <Agent
              isReady={state === "ready"}
              statsAggregator={stats_aggregator}
            />
          </Card.Card>
          <UserMicBubble
            active={hasStarted}
            muted={muted}
            handleMute={() => toggleMute()}
          />
        </div>

        <footer className="w-full flex flex-row self-center md:w-auto">
          <div className="flex flex-row justify-between gap-3 w-full">
            <Tooltip>
              <TooltipContent>Interrupt bot</TooltipContent>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => {
                    voiceClient.action({
                      service: "tts",
                      action: "interrupt",
                      arguments: [],
                    });
                  }}
                >
                  <StopCircle />
                </Button>
              </TooltipTrigger>
            </Tooltip>

            <Tooltip>
              <TooltipContent>Show bot statistics panel</TooltipContent>
              <TooltipTrigger asChild>
                <Button
                  variant={showStats ? "light" : "ghost"}
                  size="icon"
                  onClick={() => setShowStats(!showStats)}
                >
                  <LineChart />
                </Button>
              </TooltipTrigger>
            </Tooltip>
            <Tooltip>
              <TooltipContent>Configure</TooltipContent>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setShowConfig(true)}
                >
                  <Settings />
                </Button>
              </TooltipTrigger>
            </Tooltip>
            <Button onClick={() => onLeave()} className="ml-auto">
              <LogOut size={16} />
              End
            </Button>
          </div>
        </footer>
        {/*audio ref={bingSoundRef} src="/bing.wav" />
        <audio ref={bongSoundRef} src="/bong.wav" /> */}
      </div>
    );
  },
  (p, n) => p.state === n.state
);

Session.displayName = "Session";

export default Session;
