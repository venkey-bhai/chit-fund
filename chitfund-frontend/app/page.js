'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getDashboardStats, 
  getChitGroups 
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Coins, 
  ReceiptIndianRupee, 
  Landmark, 
  TrendingUp, 
  CalendarClock, 
  ArrowRight, 
  CheckCircle2, 
  ShieldAlert
} from 'lucide-react';

export default function DashboardPage() {
  const [stats, setStats] = useState(null);
  const [chits, setChits] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setError('');
    try {
      const [statsData, chitsData] = await Promise.all([
        getDashboardStats(),
        getChitGroups(),
      ]);
      setStats(statsData);
      setChits(Array.isArray(chitsData) ? chitsData : []);
    } catch (err) {
      console.error('Error loading dashboard data:', err);
      setError('Unable to connect to the backend Web API. Please verify backend is running on port 5000.');
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-slate-500">Loading Dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {error && (
        <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={loadData}
            className="text-xs bg-rose-600 text-white px-2.5 py-1 rounded font-semibold hover:bg-rose-700"
          >
            Retry
          </button>
        </div>
      )}

      {/* Top Metric Cards (Compact) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 text-xs">
        {/* Card 1: Total Chit Value */}
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Chit Value</span>
            <div className="p-1 rounded bg-indigo-50 text-indigo-600">
              <Coins className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-base font-bold text-slate-900">{formatCurrency(stats?.totalChitValue || stats?.totalChitValueUnderManagement || 0)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className="font-semibold text-indigo-600">{stats?.activeChits || stats?.activeChitGroups || 0}</span> Active Schemes
            </div>
          </div>
        </div>

        {/* Card 2: Total Collections Received */}
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Collected</span>
            <div className="p-1 rounded bg-emerald-50 text-emerald-600">
              <ReceiptIndianRupee className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-base font-bold text-emerald-600">{formatCurrency(stats?.totalCollectionsReceived || stats?.monthlyCollection || 0)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              <span className="font-semibold text-slate-800">{stats?.totalCollectionsCount || 0}</span> Payments
            </div>
          </div>
        </div>

        {/* Card 3: Remaining Amount to Company */}
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">To Company</span>
            <div className="p-1 rounded bg-amber-50 text-amber-600">
              <Landmark className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-base font-bold text-amber-600">{formatCurrency(stats?.totalRemainingAmountToCompany || 0)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Commission &amp; balance
            </div>
          </div>
        </div>

        {/* Card 4: Prize Disbursed */}
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">Prize Disbursed</span>
            <div className="p-1 rounded bg-blue-50 text-blue-600">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="mt-1">
            <div className="text-base font-bold text-blue-600">{formatCurrency(stats?.totalPrizeAmountDistributed || stats?.totalPrizeMoneyDisbursed || 0)}</div>
            <div className="text-[10px] text-slate-500 mt-0.5">
              Paid to winners
            </div>
          </div>
        </div>
      </div>

      {/* Main Grid: Active Chits Overview & Rules Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2.5">
        {/* Left 2 Cols: Active Chit Schemes */}
        <div className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-2xs p-3 space-y-2">
          <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
            <h2 className="text-xs font-bold text-slate-800">Active Chit Schemes ({chits.length})</h2>
            <Link
              href="/chits"
              className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
            >
              <span>View All</span>
              <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          <div className="space-y-2 overflow-auto max-h-[220px]">
            {chits.length === 0 ? (
              <div className="text-center py-4 text-slate-400 text-xs">
                No active chit schemes found.
              </div>
            ) : (
              chits.map((c) => (
                <div
                  key={c.id}
                  className="p-2 rounded-md border border-slate-100 bg-slate-50 hover:bg-slate-100/80 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-bold bg-indigo-100 text-indigo-700">
                        {c.groupCode}
                      </span>
                      <h3 className="font-semibold text-slate-800 text-xs">{c.title}</h3>
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.status}
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-600 pt-0.5">
                      <span>Val: <strong className="text-slate-900">{formatCurrency(c.totalAmount)}</strong></span>
                      <span>Dur: <strong className="text-slate-900">{c.durationYears}Y ({c.numberOfMonths}M)</strong></span>
                      <span>Due: <strong>Every {c.monthlyStartingDate}th (+{c.graceDays}d)</strong></span>
                    </div>
                  </div>

                  <Link
                    href={`/schedules`}
                    className="px-2.5 py-1 rounded text-xs font-semibold bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 transition-colors flex items-center gap-1 self-end sm:self-center shadow-2xs"
                  >
                    <CalendarClock className="w-3 h-3 text-indigo-600" />
                    <span>Schedules</span>
                  </Link>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Right 1 Col: Quick Reference Card */}
        <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs space-y-2 text-xs">
          <h3 className="font-bold text-slate-800 text-xs flex items-center gap-1">
            <span>Chit Specifications &bull; chitfund.txt</span>
          </h3>

          <div className="space-y-1.5 text-slate-600 text-[11px]">
            <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
              <strong className="text-slate-800 block text-[10px]">1. Multi-Year Duration &amp; Dates:</strong>
              Synchronized years and months; automatic starting and closing dates calculation.
            </div>
            <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
              <strong className="text-slate-800 block text-[10px]">2. Monthly Due &amp; Grace Period:</strong>
              Installment due date (e.g. 5th) + grace days and late fee policy.
            </div>
            <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
              <strong className="text-slate-800 block text-[10px]">3. Schedules &amp; Company Balance:</strong>
              Schedule ledger with &ldquo;how much amount will pay&rdquo; and &ldquo;remaining amount to company&rdquo;.
            </div>
            <div className="p-1.5 bg-slate-50 rounded border border-slate-100">
              <strong className="text-slate-800 block text-[10px]">4. Payment Collection Entry:</strong>
              Inputs: collection date, chit date, chit person, amount.
            </div>
          </div>
        </div>
      </div>

      {/* Recent Collections Table with Sticky Headers */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-2.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800">Recent Payment Collections</h2>
          <Link
            href="/collections"
            className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-0.5"
          >
            <span>All Collections</span>
            <ArrowRight className="w-3 h-3" />
          </Link>
        </div>

        <div className="overflow-auto max-h-[220px]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="sticky top-0 bg-slate-100 z-10 py-1.5 px-2.5">Receipt #</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-1.5 px-2.5">Chit Person</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-1.5 px-2.5">Chit Scheme</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-1.5 px-2.5">Amount</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-1.5 px-2.5">Collection Date</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-1.5 px-2.5">Chit Date</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-1.5 px-2.5">Mode</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-1.5 px-2.5">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {stats?.recentCollections?.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-4 text-center text-slate-400 text-xs">
                    No recent collections found.
                  </td>
                </tr>
              ) : (
                stats?.recentCollections?.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-1.5 px-2.5 font-mono font-medium text-indigo-700 text-xs">{item.receiptNumber}</td>
                    <td className="py-1.5 px-2.5 font-semibold text-slate-900 text-xs">{item.chitPerson}</td>
                    <td className="py-1.5 px-2.5 text-slate-600 text-xs">{item.chitGroupTitle}</td>
                    <td className="py-1.5 px-2.5 font-bold text-emerald-600 text-xs">{formatCurrency(item.amount)}</td>
                    <td className="py-1.5 px-2.5 text-xs">{formatDate(item.collectionDate)}</td>
                    <td className="py-1.5 px-2.5 text-xs">{formatDate(item.chitDate)}</td>
                    <td className="py-1.5 px-2.5 text-xs">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                        {item.paymentMode}
                      </span>
                    </td>
                    <td className="py-1.5 px-2.5">
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        <CheckCircle2 className="w-2.5 h-2.5 text-emerald-600" />
                        {item.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
