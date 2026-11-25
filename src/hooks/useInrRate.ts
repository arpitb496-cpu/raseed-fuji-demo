"use client";

import { useEffect, useState } from "react";
import { RATE_CACHE_TTL_MS, parseFrankfurterRate } from "@/lib/rate";

interface InrRateState {
  rate: number | null;
  asOf: string | null;
}

/**
 * Fetches the cached USD/INR reference rate from /api/rate once per page load
 * and refreshes at most once every 10 minutes. Returns null on any failure so
 * callers hide the INR estimate without falling back to a hardcoded rate.
 */
export function useInrRate(): InrRateState {
  const [state, setState] = useState<InrRateState>({ rate: null, asOf: null });

  useEffect(() => {
    let cancelled = false;

    async function loadRate() {
      try {
        const res = await fetch("/api/rate");
        if (!res.ok) {
          if (!cancelled) setState({ rate: null, asOf: null });
          return;
        }
        const data: unknown = await res.json();
        const validRate = parseFrankfurterRate(data);
        const asOf =
          data && typeof data === "object" && typeof (data as Record<string, unknown>).asOf === "string"
            ? ((data as Record<string, unknown>).asOf as string)
            : null;

        if (!cancelled) {
          if (validRate !== null && asOf) {
            setState({ rate: validRate, asOf });
          } else {
            setState({ rate: null, asOf: null });
          }
        }
      } catch {
        if (!cancelled) setState({ rate: null, asOf: null });
      }
    }

    loadRate();
    const intervalId = setInterval(loadRate, RATE_CACHE_TTL_MS);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
    };
  }, []);

  return state;
}
