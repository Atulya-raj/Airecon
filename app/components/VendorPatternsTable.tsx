"use client";

import React, { useState } from "react";
import type { VendorPattern } from "@/lib/recon/types";

interface VendorPatternsTableProps {
  patterns: VendorPattern[];
}

export function VendorPatternsTable({ patterns }: VendorPatternsTableProps) {
  const [search, setSearch] = useState("");

  const filtered = patterns.filter((p) =>
    p.vendorName.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Educational Header Callout for Users (18-60 accessibility) */}
      <div className="rounded-2xl border border-indigo-100 bg-indigo-50/50 p-5 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-indigo-600 text-white shrink-0 shadow-xs">
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900">How Adaptive Vendor Baselines Work</h4>
            <p className="mt-1 text-xs text-slate-600 leading-relaxed">
              ReconAI learns statistical baselines from confirmed bookkeeping records. When a recurring vendor (e.g. AWS, Cloudspend) charges within its typical range (Average &plusmn; Variance), match confidence is boosted. If a charge diverges (e.g., $9,800 vs usual $240), it is immediately escalated to the Review Queue as an anomaly.
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-xs">
        <div className="border-b border-slate-200 bg-white px-6 py-4">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-base font-bold text-slate-900">Learned Vendor Baselines</h3>
              <p className="mt-0.5 text-xs text-slate-500">
                Statistical spread and recurrence cadence learned per vendor profile.
              </p>
            </div>
            <div>
              <input
                type="text"
                placeholder="Search vendor name..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-56 rounded-lg border border-slate-300 bg-slate-50/50 px-3 py-1.5 text-xs text-slate-900 placeholder:text-slate-400 focus:border-indigo-600 focus:bg-white focus:outline-none"
              />
            </div>
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-500">
            {patterns.length === 0
              ? "No vendor baselines established yet. Baselines are created automatically as confirmed reconciliation history accumulates."
              : "No vendors match your search."}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-slate-200 bg-slate-50/80 text-xs font-semibold uppercase tracking-wider text-slate-600">
                <tr>
                  <th className="px-6 py-3.5">Vendor / Entity Name</th>
                  <th className="px-6 py-3.5">Learning Status</th>
                  <th className="px-6 py-3.5 text-right">Average Charge (&mu;)</th>
                  <th className="px-6 py-3.5 text-right">Typical Spread (&sigma;)</th>
                  <th className="px-6 py-3.5 text-right">Cadence / Interval</th>
                  <th className="px-6 py-3.5 text-center">Confirmed Transactions</th>
                  <th className="px-6 py-3.5">Last Updated</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filtered.map((p) => {
                  const isEstablished = p.sampleSize >= 3;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="px-6 py-3.5 font-semibold text-slate-900 capitalize">
                        {p.vendorName}
                      </td>
                      <td className="px-6 py-3.5">
                        <span
                          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${
                            isEstablished
                              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200/80"
                              : "bg-slate-100 text-slate-600"
                          }`}
                        >
                          <span
                            className={`h-1.5 w-1.5 rounded-full ${
                              isEstablished ? "bg-emerald-500" : "bg-slate-400"
                            }`}
                          />
                          {isEstablished ? "Active Baseline" : "Learning (N < 3)"}
                        </span>
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono font-bold text-slate-900">
                        ${p.avgAmount.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-600">
                        &plusmn;${p.amountStddev.toFixed(2)}
                      </td>
                      <td className="px-6 py-3.5 text-right font-mono text-slate-700">
                        {p.typicalIntervalDays > 0
                          ? `Every ~${p.typicalIntervalDays.toFixed(0)} days`
                          : "Irregular"}
                      </td>
                      <td className="px-6 py-3.5 text-center font-mono font-semibold text-slate-800">
                        {p.sampleSize} txns
                      </td>
                      <td className="px-6 py-3.5 text-slate-500">
                        {new Date(p.lastUpdated).toLocaleDateString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
