import { Book, Info } from "lucide-react";
import React from "react";

import { Button } from "./ui/button";

type SplashProps = {
  handleReady: () => void;
};

export const Splash: React.FC<SplashProps> = ({ handleReady }) => {
  return (
    <main className="w-full h-full flex items-center justify-center p-4 bg-[length:auto_50%] lg:bg-auto bg-colorWash bg-no-repeat bg-right-top">
      <div className="flex flex-col gap-8 lg:gap-12 items-center w-full">
        <h1 className="scroll-m-20 text-4xl font-extrabold tracking-tight lg:text-5xl text-balance text-center">
          TAPN: Teletom Demo
        </h1>

        <p>
          Making a system that meets CBOs where they are at to help save badass
          social workers tons of time when they are helping people
        </p>

        <Button onClick={() => handleReady()}>Try Demo</Button>

        <div className="h-[1px] bg-primary-300 w-full" />

        <footer className="flex flex-col lg:gap-2 w-full">
          <Button variant="light" asChild className="w-full flex h-fit">
            <a
              href="https://search.wa211.org/"
              className="text-indigo-600 flex"
            >
              <Info className="size-6" />
              <p className="flex w-full text-wrap">
                Washington 211 - A System to Help that Needs Some Help
              </p>
            </a>
          </Button>

          <Button variant="light" asChild>
            <a
              href="https://github.com/daily-demos/daily-bots-web-demo"
              className="text-indigo-600 w-full flex h-fit"
            >
              <Book className="size-6" />
              <p className="flex w-full text-wrap">
                Starter code to make your own web based demo
              </p>
            </a>
          </Button>
        </footer>
      </div>
    </main>
  );
};

export default Splash;
