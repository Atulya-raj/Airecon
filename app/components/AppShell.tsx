"use client";

import React from "react";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

interface AppShellProps {
  orgName?: string;
  anomalousCount?: number;
  children: React.ReactNode;
}

export function AppShell({ orgName, anomalousCount = 0, children }: AppShellProps) {
  return (
    <div className="app-shell">
      <Sidebar orgName={orgName} anomalousCount={anomalousCount} />
      <main className="app-main pb-20 md:pb-0">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
          {children}
        </div>
      </main>
      <MobileNav anomalousCount={anomalousCount} />
    </div>
  );
}
