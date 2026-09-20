import { describe, expect, it } from "vitest";
import { generateCashFlowForecast } from "@/lib/recon/forecast";
import type { ReconciledFlow } from "@/lib/recon/types";

describe("cash flow forecasting", () => {
  it("generates an empty forecast when no historical flows exist", () => {
    const forecast = generateCashFlowForecast([], { orgId: "demo-org", horizonDays: 30 });
    expect(forecast.orgId).toBe("demo-org");
    expect(forecast.horizonDays).toBe(30);
    expect(forecast.historicalPoints).toHaveLength(0);
    expect(forecast.projectedPoints).toHaveLength(30);
    expect(forecast.summary.projectedEndingCashDelta).toBe(0);
    expect(forecast.summary.avgDailyInflow).toBe(0);
    expect(forecast.summary.avgDailyOutflow).toBe(0);
  });

  it("calculates daily aggregates and projects forward over custom horizons", () => {
    const flows: ReconciledFlow[] = [
      { date: "2026-08-01", amount: 1000, type: "inflow", description: "Invoice #1" },
      { date: "2026-08-01", amount: 200, type: "outflow", description: "Hosting" },
      { date: "2026-08-02", amount: 500, type: "outflow", description: "Supplies" },
      { date: "2026-08-03", amount: 1500, type: "inflow", description: "Invoice #2" },
      { date: "2026-08-04", amount: 300, type: "outflow", description: "Software" },
    ];

    const forecast = generateCashFlowForecast(flows, {
      orgId: "demo-org",
      horizonDays: 60,
      initialBalance: 5000,
    });

    expect(forecast.historicalPoints.length).toBeGreaterThanOrEqual(4);
    expect(forecast.projectedPoints).toHaveLength(60);

    // Initial historical point starts from initialBalance + net
    expect(forecast.historicalPoints[0].cumulativeNet).toBe(5000 + (1000 - 200));

    // Summary metrics
    expect(forecast.summary.avgDailyInflow).toBeGreaterThan(0);
    expect(forecast.summary.avgDailyOutflow).toBeGreaterThan(0);
    expect(forecast.summary.netDailyBurnOrGrowth).toBeGreaterThan(0);
  });

  it("enforces upper and lower confidence intervals for all projected dates", () => {
    const flows: ReconciledFlow[] = [
      { date: "2026-08-01", amount: 2000, type: "inflow", description: "Client retainer" },
      { date: "2026-08-02", amount: 400, type: "outflow", description: "Contractor" },
      { date: "2026-08-03", amount: 1200, type: "outflow", description: "Rent" },
      { date: "2026-08-04", amount: 3000, type: "inflow", description: "Product sales" },
      { date: "2026-08-05", amount: 500, type: "outflow", description: "Ads" },
    ];

    const forecast = generateCashFlowForecast(flows, { orgId: "demo-org", horizonDays: 30 });

    for (const point of forecast.projectedPoints) {
      expect(point.upperBound).toBeGreaterThanOrEqual(point.projectedNet!);
      expect(point.lowerBound).toBeLessThanOrEqual(point.projectedNet!);
      expect(point.cumulativeNet).toBeDefined();
    }
  });

  it("handles negative net trajectory (cash burn)", () => {
    const flows: ReconciledFlow[] = [
      { date: "2026-08-01", amount: 100, type: "inflow", description: "Small sale" },
      { date: "2026-08-02", amount: 800, type: "outflow", description: "Payroll" },
      { date: "2026-08-03", amount: 600, type: "outflow", description: "Server" },
      { date: "2026-08-04", amount: 700, type: "outflow", description: "Marketing" },
    ];

    const forecast = generateCashFlowForecast(flows, {
      orgId: "demo-org",
      horizonDays: 30,
      initialBalance: 10000,
    });

    expect(forecast.summary.netDailyBurnOrGrowth).toBeLessThan(0);
    expect(forecast.summary.projectedEndingCashDelta).toBeLessThan(0);
    // Cumulative ending cash should be less than starting point
    const lastProjected = forecast.projectedPoints[forecast.projectedPoints.length - 1];
    expect(lastProjected.cumulativeNet).toBeLessThan(10000);
  });
});
