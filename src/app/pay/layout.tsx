"use client";

import React from "react";
import { Web3Provider } from "@/components/providers/Web3Provider";
import { WrongNetworkBanner } from "@/components/layout/WrongNetworkBanner";

export default function PayLayout({ children }: { children: React.ReactNode }) {
  return (
    <Web3Provider>
      <WrongNetworkBanner />
      {children}
    </Web3Provider>
  );
}
