import type {
  CashFlowPoint,
  ForecastResult,
  ForecastSummary,
  ReconciledFlow,
} from "./types";

export interface ForecastOptions {
  orgId: string;
  horizonDays?: number; // default 30
  confidenceInterval?: number; // e.g. 0.95 (z ~ 1.96)
  initialBalance?: number; // baseline starting balance (default 0)
}

/**
 * Generates a cash flow forecast from reconciled transactions.
 * Runs on clean, confirmed data to project daily net cash flows,
 * cumulative trajectory, and upper/lower confidence bounds.
 */
export function generateCashFlowForecast(
  flows: ReconciledFlow[],
  options: ForecastOptions
): ForecastResult {
  const horizonDays = options.horizonDays ?? 30;
  const initialBalance = options.initialBalance ?? 0;
  const zScore = options.confidenceInterval === 0.99 ? 2.576 : 1.96; // default 95% confidence

  if (flows.length === 0) {
    return emptyForecast(options.orgId, horizonDays, initialBalance);
  }

  // 1. Group flows by ISO date
  const dailyMap = new Map<string, { inflow: number; outflow: number }>();
  let minDate = flows[0].date;
  let maxDate = flows[0].date;

  for (const flow of flows) {
    if (flow.date < minDate) minDate = flow.date;
    if (flow.date > maxDate) maxDate = flow.date;

    const existing = dailyMap.get(flow.date) ?? { inflow: 0, outflow: 0 };
    if (flow.type === "inflow") {
      existing.inflow += flow.amount;
    } else {
      existing.outflow += flow.amount;
    }
    dailyMap.set(flow.date, existing);
  }

  // 2. Fill date series from minDate to maxDate
  const sortedDates = enumerateDateRange(minDate, maxDate);
  const historicalPoints: CashFlowPoint[] = [];
  let runningCumulative = initialBalance;
  const dailyNets: number[] = [];
  const dayOfWeekDeltas: number[][] = [[], [], [], [], [], [], []]; // Sun (0) to Sat (6)

  let totalInflow = 0;
  let totalOutflow = 0;

  for (const dateStr of sortedDates) {
    const data = dailyMap.get(dateStr) ?? { inflow: 0, outflow: 0 };
    const net = data.inflow - data.outflow;
    totalInflow += data.inflow;
    totalOutflow += data.outflow;
    runningCumulative += net;
    dailyNets.push(net);

    const dow = new Date(`${dateStr}T00:00:00Z`).getUTCDay();
    dayOfWeekDeltas[dow].push(net);

    historicalPoints.push({
      date: dateStr,
      actualNet: Math.round(net * 100) / 100,
      cumulativeNet: Math.round(runningCumulative * 100) / 100,
    });
  }

  const daysCount = sortedDates.length;
  const avgDailyInflow = totalInflow / Math.max(1, daysCount);
  const avgDailyOutflow = totalOutflow / Math.max(1, daysCount);

  // 3. Compute base trend using simple linear regression (OLS)
  let sumX = 0;
  let sumY = 0;
  let sumXY = 0;
  let sumXX = 0;

  for (let i = 0; i < dailyNets.length; i++) {
    const x = i;
    const y = dailyNets[i];
    sumX += x;
    sumY += y;
    sumXY += x * y;
    sumXX += x * x;
  }

  const n = dailyNets.length;
  const slope = n > 1 ? (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX) : 0;
  const intercept = n > 0 ? (sumY - slope * sumX) / n : 0;

  // Day of week seasonal deviations
  const globalAvg = n > 0 ? sumY / n : 0;
  const dowFactors = dayOfWeekDeltas.map((deltas) => {
    if (deltas.length === 0) return 0;
    const dowAvg = deltas.reduce((s, v) => s + v, 0) / deltas.length;
    return dowAvg - globalAvg;
  });

  // Calculate residual variance for prediction standard error
  let residualSumSq = 0;
  for (let i = 0; i < n; i++) {
    const predicted = intercept + slope * i;
    residualSumSq += (dailyNets[i] - predicted) ** 2;
  }
  const residualStdDev = n > 2 ? Math.sqrt(residualSumSq / (n - 2)) : 50;

  // 4. Project forward `horizonDays`
  const projectedPoints: CashFlowPoint[] = [];
  const lastDateObj = new Date(`${maxDate}T00:00:00Z`);
  let forecastCumulative = runningCumulative;

  for (let h = 1; h <= horizonDays; h++) {
    const nextDate = new Date(lastDateObj);
    nextDate.setUTCDate(nextDate.getUTCDate() + h);
    const dateStr = nextDate.toISOString().slice(0, 10);
    const dow = nextDate.getUTCDay();

    // Projected daily net = trend line + seasonal adjustment
    const trendPoint = intercept + slope * (n + h - 1);
    const seasonalAdj = dowFactors[dow] * 0.5; // gentle seasonal dampening
    const rawDailyNet = trendPoint + seasonalAdj;

    // Standard error widens as horizon grows
    const uncertaintyFactor = Math.sqrt(1 + 1 / Math.max(1, n) + (h * h) / Math.max(1, sumXX));
    const margin = zScore * residualStdDev * uncertaintyFactor;

    forecastCumulative += rawDailyNet;

    projectedPoints.push({
      date: dateStr,
      projectedNet: Math.round(rawDailyNet * 100) / 100,
      lowerBound: Math.round((rawDailyNet - margin) * 100) / 100,
      upperBound: Math.round((rawDailyNet + margin) * 100) / 100,
      cumulativeNet: Math.round(forecastCumulative * 100) / 100,
    });
  }

  const projectedEndingCashDelta = forecastCumulative - runningCumulative;
  const netDailyBurnOrGrowth = daysCount > 0 ? (totalInflow - totalOutflow) / daysCount : 0;

  const summary: ForecastSummary = {
    avgDailyInflow: Math.round(avgDailyInflow * 100) / 100,
    avgDailyOutflow: Math.round(avgDailyOutflow * 100) / 100,
    netDailyBurnOrGrowth: Math.round(netDailyBurnOrGrowth * 100) / 100,
    projectedEndingCashDelta: Math.round(projectedEndingCashDelta * 100) / 100,
    confidenceLevel: options.confidenceInterval ?? 0.95,
  };

  return {
    orgId: options.orgId,
    horizonDays,
    historicalPoints,
    projectedPoints,
    summary,
    generatedAt: new Date().toISOString(),
  };
}

function emptyForecast(
  orgId: string,
  horizonDays: number,
  initialBalance: number
): ForecastResult {
  const today = new Date();
  const projectedPoints: CashFlowPoint[] = [];

  for (let h = 1; h <= horizonDays; h++) {
    const nextDate = new Date(today);
    nextDate.setUTCDate(nextDate.getUTCDate() + h);
    projectedPoints.push({
      date: nextDate.toISOString().slice(0, 10),
      projectedNet: 0,
      lowerBound: 0,
      upperBound: 0,
      cumulativeNet: initialBalance,
    });
  }

  return {
    orgId,
    horizonDays,
    historicalPoints: [],
    projectedPoints,
    summary: {
      avgDailyInflow: 0,
      avgDailyOutflow: 0,
      netDailyBurnOrGrowth: 0,
      projectedEndingCashDelta: 0,
      confidenceLevel: 0.95,
    },
    generatedAt: new Date().toISOString(),
  };
}

function enumerateDateRange(startDateStr: string, endDateStr: string): string[] {
  const dates: string[] = [];
  const current = new Date(`${startDateStr}T00:00:00Z`);
  const end = new Date(`${endDateStr}T00:00:00Z`);

  while (current <= end) {
    dates.push(current.toISOString().slice(0, 10));
    current.setUTCDate(current.getUTCDate() + 1);
  }
  return dates;
}
