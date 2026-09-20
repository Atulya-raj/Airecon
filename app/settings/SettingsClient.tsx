"use client";

import React from "react";
import { AppShell } from "../components/AppShell";
import { ConfigSettings } from "../components/ConfigSettings";
import type { ReconConfig } from "@/lib/recon/types";

interface SettingsClientProps {
  config: ReconConfig;
  anomalousCount: number;
}

export function SettingsClient({ config, anomalousCount }: SettingsClientProps) {
  return (
    <AppShell orgName={config.orgId} anomalousCount={anomalousCount}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Settings
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Configure the reconciliation engine parameters for your organization.
          </p>
        </div>
        <ConfigSettings config={config} />
      </div>
    </AppShell>
  );
}
