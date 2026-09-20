"use client";

import React, { useState } from "react";
import type { ForecastResult } from "@/lib/recon/types";

interface ForecastChartProps {
  initialForecast: ForecastResult;
}

export function ForecastChart({ initialForecast }: ForecastChartProps) {
  const [horizon, setHorizon] = useState<number>(initialForecast.horizonDays);
  const [forecast, setForecast] = useState<ForecastResult>(initialForecast);
  const [loading, setLoading] = useState(false);

  const changeHorizon = async (newHorizon: number) => {
    if (newHorizon === horizon) return;
    setHorizon(newHorizon);
    setLoading(true);
    try {
      const res = await fetch(`/api/forecast?horizonDays=${newHorizon}`);
      if (res.ok) {
        const data = await res.json();
        if (data.forecast) setForecast(data.forecast);
      }
    } catch (err) {
      console.error("Failed to load forecast horizon:", err);
    } finally {
      setLoading(false);
    }
  };

  const historical = forecast.historicalPoints;
  const projected = forecast.projectedPoints;
  const allPoints = [...historical, ...projected];

  // SVG dimensions
  const svgWidth = 920;
  const svgHeight = 290;
  const padLeft = 80;
  const padRight = 35;
  const padTop = 35;
  const padBottom = 45;

  const chartW = svgWidth - padLeft - padRight;
  const chartH = svgHeight - padTop - padBottom;

  // Calculate scales
  const values = allPoints.flatMap((p) => [
    p.cumulativeNet,
    p.upperBound ?? p.cumulativeNet,
    p.lowerBound ?? p.cumulativeNet,
  ]);
  const minVal = values.length > 0 ? Math.min(...values, 0) : 0;
  const maxVal = values.length > 0 ? Math.max(...values, 1000) : 1000;
  const valRange = maxVal - minVal || 1;

  const getX = (index: number, total: number) => {
    return padLeft + (index / Math.max(1, total - 1)) * chartW;
  };

  const getY = (val: number) => {
    return padTop + chartH - ((val - minVal) / valRange) * chartH;
  };

  const histCount = historical.length;
  const totalCount = allPoints.length;

  let histPath = "";
  if (histCount > 0) {
    histPath = historical
      .map((p, i) => `${i === 0 ? "M" : "L"} ${getX(i, totalCount)} ${getY(p.cumulativeNet)}`)
      .join(" ");
  }

  let projPath = "";
  if (projected.length > 0) {
    const startX = histCount > 0 ? getX(histCount - 1, totalCount) : getX(0, totalCount);
    const startY = histCount > 0 ? getY(historical[histCount - 1].cumulativeNet) : getY(0);
    projPath =
      `M ${startX} ${startY} ` +
      projected
        .map((p, i) => `L ${getX(histCount + i, totalCount)} ${getY(p.cumulativeNet)}`)
        .join(" ");
  }

  let bandPolygon = "";
  if (projected.length > 0) {
    const upperPoints: string[] = [];
    const lowerPoints: string[] = [];

    const baseCum = histCount > 0 ? historical[histCount - 1].cumulativeNet : 0;
    let runningUpper = baseCum;
    let runningLower = baseCum;

    projected.forEach((p, i) => {
      const idx = histCount + i;
      runningUpper += p.upperBound ?? p.projectedNet ?? 0;
      runningLower += p.lowerBound ?? p.projectedNet ?? 0;
      upperPoints.push(`${getX(idx, totalCount)},${getY(runningUpper)}`);
      lowerPoints.unshift(`${getX(idx, totalCount)},${getY(runningLower)}`);
    });

    const startX = histCount > 0 ? getX(histCount - 1, totalCount) : getX(0, totalCount);
    const startY = histCount > 0 ? getY(baseCum) : getY(0);
    bandPolygon = `${startX},${startY} ${upperPoints.join(" ")} ${lowerPoints.join(" ")}`;
  }

  const zeroY = getY(0);

  return (
    <div className="card p-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-[var(--border-subtle)] pb-5">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="text-base font-bold text-[var(--text-primary)]">
              Cash Flow Projection &amp; Burn Velocity
            </h3>
            <span className="rounded-md bg-[var(--color-primary-50)] px-2 py-0.5 text-[11px] font-semibold text-[var(--color-primary-600)]">
              Holt-Winters Model
            </span>
          </div>
          <p className="mt-0.5 text-xs text-[var(--text-secondary)]">
            Computed strictly on confirmed ledger settlements &middot; 95% confidence intervals adapt based on historical volatility.
          </p>
        </div>

        {/* Horizon Selector */}
        <div className="flex items-center gap-1 rounded-xl bg-[var(--surface-secondary)] p-1 text-xs font-semibold">
          {[30, 60, 90].map((days) => (
            <button
              key={days}
              type="button"
              onClick={() => changeHorizon(days)}
              className={`rounded-lg px-3.5 py-1.5 transition-all ${
                horizon === days
                  ? "bg-[var(--surface-primary)] text-[var(--text-primary)] shadow-sm"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
              }`}
            >
              {days} Days
            </button>
          ))}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Avg Daily Inflow
          </span>
          <p className="mt-1 text-xl font-bold font-mono text-[var(--color-success-text)]">
            +${forecast.summary.avgDailyInflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)]">Incoming receivables</span>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Avg Daily Outflow
          </span>
          <p className="mt-1 text-xl font-bold font-mono text-[var(--color-danger-text)]">
            -${forecast.summary.avgDailyOutflow.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)]">Operational spend</span>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            Daily Trajectory
          </span>
          <p
            className={`mt-1 text-xl font-bold font-mono ${
              forecast.summary.netDailyBurnOrGrowth >= 0 ? "text-[var(--color-success-text)]" : "text-[var(--color-warning-text)]"
            }`}
          >
            {forecast.summary.netDailyBurnOrGrowth >= 0 ? "+" : ""}$
            {forecast.summary.netDailyBurnOrGrowth.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)]">Net daily velocity</span>
        </div>

        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/50 p-4">
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[var(--text-tertiary)]">
            {horizon}d Projected Delta
          </span>
          <p
            className={`mt-1 text-xl font-bold font-mono ${
              forecast.summary.projectedEndingCashDelta >= 0 ? "text-[var(--color-success-text)]" : "text-[var(--color-danger-text)]"
            }`}
          >
            {forecast.summary.projectedEndingCashDelta >= 0 ? "+" : ""}$
            {forecast.summary.projectedEndingCashDelta.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </p>
          <span className="text-[11px] text-[var(--text-tertiary)]">Net cumulative impact</span>
        </div>
      </div>

      {/* Chart visualization */}
      <div className="relative mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface-secondary)]/20 p-4">
        {loading && (
          <div className="absolute inset-0 z-10 flex items-center justify-center rounded-xl bg-[var(--surface-primary)]/80 backdrop-blur-xs">
            <span className="text-xs font-semibold text-[var(--text-primary)]">Updating time-series forecast...</span>
          </div>
        )}

        <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-auto select-none">
          <defs>
            <linearGradient id="bandGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-primary-500)" stopOpacity="0.25" />
              <stop offset="100%" stopColor="var(--color-primary-500)" stopOpacity="0.05" />
            </linearGradient>
          </defs>

          {/* Grid lines */}
          <line
            x1={padLeft}
            y1={zeroY}
            x2={svgWidth - padRight}
            y2={zeroY}
            stroke="var(--border-default)"
            strokeDasharray="4 4"
            strokeWidth="1.2"
          />

          {/* Today vertical divider line */}
          {histCount > 0 && (
            <g>
              <line
                x1={getX(histCount - 1, totalCount)}
                y1={padTop}
                x2={getX(histCount - 1, totalCount)}
                y2={svgHeight - padBottom}
                stroke="var(--text-tertiary)"
                strokeDasharray="3 3"
                strokeWidth="1.8"
              />
              <text
                x={getX(histCount - 1, totalCount) - 8}
                y={padTop - 8}
                fontSize="11"
                fill="var(--text-secondary)"
                textAnchor="end"
                fontWeight="700"
              >
                Today (Reconciled)
              </text>
            </g>
          )}

          {/* Confidence interval band */}
          {bandPolygon && (
            <polygon points={bandPolygon} fill="url(#bandGradient)" />
          )}

          {/* Historical trajectory line */}
          {histPath && (
            <path
              d={histPath}
              fill="none"
              stroke="var(--text-primary)"
              strokeWidth="3"
              strokeLinecap="round"
            />
          )}

          {/* Projected trajectory line */}
          {projPath && (
            <path
              d={projPath}
              fill="none"
              stroke="var(--color-primary-500)"
              strokeWidth="2.5"
              strokeDasharray="6 4"
              strokeLinecap="round"
            />
          )}

          {/* Historical points */}
          {historical.map((p, i) => (
            <circle
              key={p.date}
              cx={getX(i, totalCount)}
              cy={getY(p.cumulativeNet)}
              r="4"
              fill="var(--text-primary)"
              stroke="var(--surface-primary)"
              strokeWidth="1.5"
            />
          ))}

          {/* Y Axis Labels */}
          <text x={padLeft - 10} y={padTop + 4} fontSize="11" fill="var(--text-tertiary)" textAnchor="end" fontWeight="500">
            ${Math.round(maxVal).toLocaleString()}
          </text>
          <text x={padLeft - 10} y={zeroY + 4} fontSize="11" fill="var(--text-tertiary)" textAnchor="end" fontWeight="500">
            $0
          </text>
          {minVal < 0 && (
            <text x={padLeft - 10} y={svgHeight - padBottom} fontSize="11" fill="var(--text-tertiary)" textAnchor="end" fontWeight="500">
              ${Math.round(minVal).toLocaleString()}
            </text>
          )}

          {/* X Axis dates */}
          {allPoints.length > 0 && (
            <>
              <text x={padLeft} y={svgHeight - 14} fontSize="11" fill="var(--text-tertiary)" fontWeight="500">
                {allPoints[0].date}
              </text>
              <text
                x={svgWidth - padRight}
                y={svgHeight - 14}
                fontSize="11"
                fill="var(--text-tertiary)"
                textAnchor="end"
                fontWeight="500"
              >
                {allPoints[allPoints.length - 1].date}
              </text>
            </>
          )}
        </svg>

        {/* Legend */}
        <div className="mt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-[var(--text-secondary)] font-medium border-t border-[var(--border-subtle)] pt-3">
          <div className="flex items-center gap-2">
            <span className="h-1 w-5 rounded-full bg-[var(--text-primary)]" />
            <span>Actual Reconciled Cash</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-0.5 w-5 border-b-2 border-dashed border-[var(--color-primary-500)]" />
            <span>Expected Trajectory</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="h-3 w-5 rounded-xs bg-[var(--color-primary-500)]/20 ring-1 ring-[var(--color-primary-500)]/40" />
            <span>95% Confidence Interval Band</span>
          </div>
        </div>
      </div>
    </div>
  );
}
