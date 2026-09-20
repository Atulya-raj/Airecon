"use client";

import React from "react";
import { AppShell } from "../components/AppShell";
import { ForecastChart } from "../components/ForecastChart";
import type { ForecastResult } from "@/lib/recon/types";

interface ForecastClientProps {
  initialForecast: ForecastResult;
  anomalousCount: number;
  orgId: string;
}

export function ForecastClient({
  initialForecast,
  anomalousCount,
  orgId,
}: ForecastClientProps) {
  return (
    <AppShell orgName={orgId} anomalousCount={anomalousCount}>
      <div className="space-y-6 animate-fade-in">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-primary)] tracking-tight">
            Cash Flow Forecast
          </h1>
          <p className="mt-1 text-sm text-[var(--text-secondary)]">
            Projections based on your confirmed reconciliation data with 95% confidence intervals.
          </p>
        </div>
        <ForecastChart initialForecast={initialForecast} />
      </div>
    </AppShell>
  );
}
