"use client";

import React from "react";

interface HealthGaugeProps {
  value: number; // 0 to 100
  size?: number; // diameter in px
  label?: string;
  sublabel?: string;
}

export function HealthGauge({
  value,
  size = 180,
  label = "Health Score",
  sublabel,
}: HealthGaugeProps) {
  const clampedValue = Math.max(0, Math.min(100, value));
  const radius = 45;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (clampedValue / 100) * circumference;

  // Color based on score
  const getColor = (v: number) => {
    if (v >= 80) return { stroke: "var(--color-success-500)", bg: "var(--color-success-50)" };
    if (v >= 50) return { stroke: "var(--color-warning-500)", bg: "var(--color-warning-50)" };
    return { stroke: "var(--color-danger-500)", bg: "var(--color-danger-50)" };
  };

  const colors = getColor(clampedValue);

  return (
    <div className="flex flex-col items-center gap-3">
      <div className="relative" style={{ width: size, height: size }}>
        <svg
          viewBox="0 0 100 100"
          className="transform -rotate-90"
          style={{ width: size, height: size }}
        >
          {/* Background track */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke="var(--border-default)"
            strokeWidth="8"
            strokeLinecap="round"
          />
          {/* Progress arc */}
          <circle
            cx="50"
            cy="50"
            r={radius}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="animate-gauge"
            style={{
              transition: "stroke-dashoffset 1.2s ease-out, stroke 0.5s ease",
            }}
          />
        </svg>
        {/* Center text */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span
            className="text-3xl font-bold"
            style={{ color: colors.stroke }}
          >
            {clampedValue}
          </span>
          <span className="text-xs font-medium text-[var(--text-tertiary)] mt-0.5">
            / 100
          </span>
        </div>
      </div>
      <div className="text-center">
        <p className="text-sm font-semibold text-[var(--text-primary)]">
          {label}
        </p>
        {sublabel && (
          <p className="text-xs text-[var(--text-secondary)] mt-0.5">
            {sublabel}
          </p>
        )}
      </div>
    </div>
  );
}
