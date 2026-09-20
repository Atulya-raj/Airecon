import { describe, expect, it, beforeEach, afterEach } from "vitest";
import { GET as getForecast } from "@/app/api/forecast/route";
import { GET as getConfig, PATCH as patchConfig } from "@/app/api/config/route";
import { GET as getVendors } from "@/app/api/vendors/route";
import { GET as getAnomalies } from "@/app/api/anomalies/route";
import { POST as runReconcile } from "@/app/api/reconcile/run/route";
import { LocalReconStore, setReconStore } from "@/lib/recon/store";
import { demoLedgerEntries, demoTransactions, demoVendorHistory } from "@/lib/recon/demo-data";

const ORG = "demo-org";

describe("API route handlers", () => {
  beforeEach(async () => {
    process.env.RECON_DEV_ORG_ID = ORG;
    const store = new LocalReconStore(null); // isolated in-memory store
    setReconStore(store);
    await store.insertLedgerEntries(ORG, demoLedgerEntries(ORG));
    await store.upsertTransactions(ORG, [
      ...demoVendorHistory(ORG),
      ...demoTransactions(ORG),
    ]);
  });

  afterEach(() => {
    setReconStore(null);
  });

  it("handles GET /api/config and PATCH /api/config", async () => {
    const getReq = new Request("http://localhost:3000/api/config");
    const getRes = await getConfig(getReq);
    expect(getRes.status).toBe(200);
    const getData = await getRes.json();
    expect(getData.config.autoMatchThreshold).toBe(0.92);

    const patchReq = new Request("http://localhost:3000/api/config", {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ autoMatchThreshold: 0.95, dateWindowDays: 14 }),
    });
    const patchRes = await patchConfig(patchReq);
    expect(patchRes.status).toBe(200);
    const patchData = await patchRes.json();
    expect(patchData.config.autoMatchThreshold).toBe(0.95);
    expect(patchData.config.dateWindowDays).toBe(14);
  });

  it("handles POST /api/reconcile/run and GET /api/forecast", async () => {
    const runReq = new Request("http://localhost:3000/api/reconcile/run", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ limit: 10 }),
    });
    const runRes = await runReconcile(runReq);
    expect(runRes.status).toBe(200);
    const runData = await runRes.json();
    expect(runData.processed).toBeGreaterThan(0);

    const forecastReq = new Request("http://localhost:3000/api/forecast?horizonDays=30");
    const forecastRes = await getForecast(forecastReq);
    expect(forecastRes.status).toBe(200);
    const forecastData = await forecastRes.json();
    expect(forecastData.forecast).toBeDefined();
    expect(forecastData.forecast.horizonDays).toBe(30);
    expect(forecastData.forecast.projectedPoints).toHaveLength(30);
  });

  it("handles GET /api/vendors", async () => {
    const req = new Request("http://localhost:3000/api/vendors");
    const res = await getVendors(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.vendors)).toBe(true);
  });

  it("handles GET /api/anomalies", async () => {
    const req = new Request("http://localhost:3000/api/anomalies");
    const res = await getAnomalies(req);
    expect(res.status).toBe(200);
    const data = await res.json();
    expect(Array.isArray(data.anomalies)).toBe(true);
  });
});
