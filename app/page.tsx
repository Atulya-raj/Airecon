import {
  confirmMatchAction,
  runReconciliationAction,
  seedDemoDataAction,
} from "./actions";
import { getUiOrgId } from "@/lib/org";
import { getCandidatesForReview } from "@/lib/recon/pipeline";
import { getReconStore } from "@/lib/recon/store";
import type { Candidate, Match, Transaction } from "@/lib/recon/types";

export const dynamic = "force-dynamic";

const STATUS_STYLES: Record<Transaction["status"], string> = {
  unmatched: "bg-slate-100 text-slate-700",
  auto_matched: "bg-emerald-100 text-emerald-800",
  reviewed: "bg-sky-100 text-sky-800",
  anomalous: "bg-amber-100 text-amber-900",
};

export default async function ReviewPage() {
  const orgId = getUiOrgId();
  const store = getReconStore();

  const [transactions, matches, openEntries, notifications, config] = await Promise.all([
    store.listTransactions(orgId, { limit: 100 }),
    store.listMatches(orgId),
    store.listOpenLedgerEntries(orgId),
    store.listNotifications(orgId, 50),
    store.getConfig(orgId),
  ]);

  const latestMatch = new Map<string, Match>();
  for (const match of matches) {
    if (!latestMatch.has(match.transactionId)) latestMatch.set(match.transactionId, match);
  }

  const review = transactions.filter((t) => t.status === "anomalous");
  const reviewCandidates = await Promise.all(
    review.slice(0, 5).map(async (transaction) => {
      const { candidates } = await getCandidatesForReview({
        orgId,
        transactionId: transaction.id,
      });
      return { transaction, candidates };
    })
  );

  const counts = {
    total: transactions.length,
    autoMatched: transactions.filter((t) => t.status === "auto_matched").length,
    reviewed: transactions.filter((t) => t.status === "reviewed").length,
    anomalous: review.length,
    unmatched: transactions.filter((t) => t.status === "unmatched").length,
  };

  return (
    <main className="mx-auto w-full max-w-6xl px-6 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">ReconAI</h1>
          <p className="mt-1 text-sm text-slate-500">
            Hybrid embedding + rule matching · auto-match ≥ {config.autoMatchThreshold},
            ambiguous band {config.ambiguousBandFloor}–{config.autoMatchThreshold}
          </p>
        </div>
        <div className="flex gap-2">
          <form action={seedDemoDataAction}>
            <button
              type="submit"
              className="rounded-md border border-slate-300 px-3 py-2 text-sm font-medium hover:bg-slate-50"
            >
              Load demo book
            </button>
          </form>
          <form action={runReconciliationAction}>
            <button
              type="submit"
              className="rounded-md bg-slate-900 px-3 py-2 text-sm font-medium text-white hover:bg-slate-700"
            >
              Run reconciliation
            </button>
          </form>
        </div>
      </header>

      <section className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-5">
        <Stat label="Transactions" value={counts.total} />
        <Stat label="Auto-matched" value={counts.autoMatched} />
        <Stat label="Reviewed" value={counts.reviewed} />
        <Stat label="Needs review" value={counts.anomalous} />
        <Stat label="Unmatched" value={counts.unmatched} />
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Review queue</h2>
        {reviewCandidates.length === 0 ? (
          <p className="mt-2 text-sm text-slate-500">
            Nothing awaiting review. Anomalies are queued here, never auto-matched.
          </p>
        ) : (
          <ul className="mt-4 space-y-4">
            {reviewCandidates.map(({ transaction, candidates }) => (
              <ReviewCard
                key={transaction.id}
                transaction={transaction}
                candidates={candidates}
                reason={
                  notifications.find((n) => n.transactionId === transaction.id)?.message ??
                  null
                }
              />
            ))}
          </ul>
        )}
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Transactions</h2>
        <div className="mt-4 overflow-x-auto rounded-lg border border-slate-200">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Payee</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Decision</th>
              </tr>
            </thead>
            <tbody>
              {transactions.map((transaction) => {
                const match = latestMatch.get(transaction.id);
                return (
                  <tr key={transaction.id} className="border-t border-slate-100">
                    <td className="px-4 py-3 whitespace-nowrap">{transaction.txnDate}</td>
                    <td className="px-4 py-3">{transaction.payeeRaw}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {transaction.amount.toFixed(2)} {transaction.currency}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-2 py-1 text-xs font-medium ${STATUS_STYLES[transaction.status]}`}
                      >
                        {transaction.status.replace("_", " ")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500">
                      {match
                        ? `${match.matchMethod}${
                            match.confidenceScore
                              ? ` · ${match.confidenceScore.toFixed(3)}`
                              : ""
                          } — ${match.rationale ?? ""}`
                        : "—"}
                    </td>
                  </tr>
                );
              })}
              {transactions.length === 0 && (
                <tr>
                  <td className="px-4 py-6 text-slate-500" colSpan={5}>
                    No transactions yet. Load the demo book or POST to
                    /api/transactions/sync.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-10">
        <h2 className="text-lg font-semibold">Open ledger entries</h2>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {openEntries.map((entry) => (
            <li
              key={entry.id}
              className="rounded-md border border-slate-200 px-4 py-3 text-sm"
            >
              <span className="font-medium">{entry.vendorName}</span> · {entry.entryType} ·{" "}
              {entry.amount.toFixed(2)} {entry.currency} · {entry.entryDate}
              <div className="text-slate-500">{entry.memo}</div>
            </li>
          ))}
          {openEntries.length === 0 && (
            <li className="text-sm text-slate-500">No open ledger entries.</li>
          )}
        </ul>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-slate-200 px-4 py-3">
      <div className="text-xs uppercase tracking-wide text-slate-500">{label}</div>
      <div className="mt-1 text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}

function ReviewCard({
  transaction,
  candidates,
  reason,
}: {
  transaction: Transaction;
  candidates: Candidate[];
  reason: string | null;
}) {
  return (
    <li className="rounded-lg border border-amber-200 bg-amber-50/40 p-4">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div className="font-medium">
          {transaction.payeeRaw} · {transaction.amount.toFixed(2)} {transaction.currency}
        </div>
        <div className="text-sm text-slate-500">{transaction.txnDate}</div>
      </div>
      {reason && <p className="mt-1 text-sm text-amber-900">{reason}</p>}

      <ul className="mt-3 space-y-2">
        {candidates.map((candidate) => (
          <li
            key={candidate.ledgerEntry.id}
            className="flex flex-wrap items-center justify-between gap-3 rounded-md bg-white px-3 py-2 text-sm"
          >
            <span>
              {candidate.ledgerEntry.vendorName} · {candidate.ledgerEntry.amount.toFixed(2)}{" "}
              · {candidate.ledgerEntry.entryDate} · {candidate.ledgerEntry.memo}
            </span>
            <span className="flex items-center gap-3">
              <span className="tabular-nums text-slate-500">
                {candidate.score.toFixed(3)}
              </span>
              <form action={confirmMatchAction}>
                <input type="hidden" name="transactionId" value={transaction.id} />
                <input
                  type="hidden"
                  name="ledgerEntryId"
                  value={candidate.ledgerEntry.id}
                />
                <button
                  type="submit"
                  className="rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
                >
                  Match
                </button>
              </form>
            </span>
          </li>
        ))}
        {candidates.length === 0 && (
          <li className="text-sm text-slate-500">No candidates above the floor.</li>
        )}
      </ul>

      <form action={confirmMatchAction} className="mt-3">
        <input type="hidden" name="transactionId" value={transaction.id} />
        <input type="hidden" name="ledgerEntryId" value="" />
        <button
          type="submit"
          className="text-xs font-medium text-slate-600 underline underline-offset-4"
        >
          No match — mark reviewed
        </button>
      </form>
    </li>
  );
}
