import { withOrg } from "@/lib/api";
import { generateCashFlowForecast } from "@/lib/recon/forecast";
import { getReconStore } from "@/lib/recon/store";

export async function GET(request: Request) {
  return withOrg(request, async (session) => {
    const url = new URL(request.url);
    const horizonParam = url.searchParams.get("horizonDays");
    const balanceParam = url.searchParams.get("initialBalance");

    const horizonDays = horizonParam ? Math.max(7, Math.min(365, parseInt(horizonParam, 10))) : 30;
    const initialBalance = balanceParam ? parseFloat(balanceParam) : 0;

    const store = getReconStore();
    const flows = await store.listReconciledFlows(session.orgId);

    const forecast = generateCashFlowForecast(flows, {
      orgId: session.orgId,
      horizonDays,
      initialBalance: isNaN(initialBalance) ? 0 : initialBalance,
    });

    return Response.json({ forecast });
  });
}
