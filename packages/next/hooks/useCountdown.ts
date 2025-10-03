"use client";

import { useEffect, useMemo, useState } from "react";

import type { RoundStruct } from "@/hooks/useRound";

export type Countdown = {
  secondsRemaining: number;
  isExpired: boolean;
};

export function useCountdown(round?: RoundStruct) {
  const endTime = round?.endTime ? Number(round.endTime) : 0;

  const [now, setNow] = useState(() => Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!endTime) return;
    const interval = setInterval(() => setNow(Math.floor(Date.now() / 1000)), 1000);
    return () => clearInterval(interval);
  }, [endTime]);

  return useMemo<Countdown>(() => {
    if (!endTime) {
      return {
        secondsRemaining: 0,
        isExpired: false
      };
    }
    const secondsRemaining = Math.max(0, endTime - now);
    return {
      secondsRemaining,
      isExpired: secondsRemaining === 0
    };
  }, [endTime, now]);
}
