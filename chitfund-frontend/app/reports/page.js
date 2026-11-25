'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
  getCollectionsReport, 
  getOutstandingReport, 
  getReconciliationReport 
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer } from 'lucide-react';

function ReportsContent() {
  const [activeTab, setActiveTab] = useState('reconciliation');
  const [reconciliation, setReconciliation] = useState(null);
  const [outstanding, setOutstanding] = useState(null);
  const [collectionsReport, setCollectionsReport] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    try {
      const [recData, outData, collData] = await Promise.all([
        getReconciliationReport(),
        getOutstandingReport(),
        getCollectionsReport(),
      ]);
      setReconciliation(recData);
      setOutstanding(outData);
      setCollectionsReport(collData);
    } catch (err) {
      console.error('Error loading reports:', err);
    } finally {
      setLoading(false);
    }
  }

  function handlePrint() {
    window.print();
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5">
      {/* Compact Tab & Print Toolbar (Page Heading Removed) */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-200 pb-1">
        <div className="flex gap-1 overflow-x-auto">
          <button
            onClick={() => setActiveTab('reconciliation')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-t-md transition-colors ${
              activeTab === 'reconciliation'
                ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Reconciliation
          </button>
          <button
            onClick={() => setActiveTab('outstanding')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-t-md transition-colors ${
              activeTab === 'outstanding'
                ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Outstanding Dues
          </button>
          <button
            onClick={() => setActiveTab('collections')}
            className={`py-1.5 px-3 text-xs font-semibold rounded-t-md transition-colors ${
              activeTab === 'collections'
                ? 'border-b-2 border-indigo-600 text-indigo-700 bg-white'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            Collections Log
          </button>
        </div>

        <button
          onClick={handlePrint}
          className="flex items-center gap-1 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs px-2.5 py-1 rounded transition-all shadow-2xs self-end sm:self-auto"
        >
          <Printer className="w-3.5 h-3.5" />
          <span>Print / PDF</span>
        </button>
      </div>

      {/* TAB 1: FINANCIAL RECONCILIATION */}
      {activeTab === 'reconciliation' && (
        <div className="space-y-2.5">
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
            <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Inflow (Collections)</span>
              <div className="text-base font-bold text-emerald-600 mt-1">
                {formatCurrency(reconciliation?.totalCollections || 0)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Outflow (Prize Money)</span>
              <div className="text-base font-bold text-blue-600 mt-1">
                {formatCurrency(reconciliation?.totalPrizePayouts || 0)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Expenses</span>
              <div className="text-base font-bold text-rose-600 mt-1">
                {formatCurrency(reconciliation?.totalExpenses || 0)}
              </div>
            </div>

            <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Foreman Earnings</span>
              <div className="text-base font-bold text-amber-600 mt-1">
                {formatCurrency(reconciliation?.totalForemanCommission || 0)}
              </div>
            </div>
          </div>

          <div className="bg-gradient-to-r from-slate-900 to-indigo-950 rounded-lg p-3.5 text-white space-y-1">
            <span className="text-[11px] font-semibold text-indigo-300 uppercase">Net Company Reserve Balance</span>
            <div className="text-xl font-extrabold text-amber-300">
              {formatCurrency(reconciliation?.netOperatingBalance || 0)}
            </div>
            <p className="text-[11px] text-slate-300">
              Total Collections minus Prize Payouts minus Operating Expenses.
            </p>
          </div>
        </div>
      )}

      {/* TAB 2: OUTSTANDING & OVERDUE WITH STABLE HEADERS */}
      {activeTab === 'outstanding' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="p-2.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800">
              Installments Due ({outstanding?.count || 0}) &bull; Total: <span className="text-rose-600">{formatCurrency(outstanding?.totalOutstanding || 0)}</span>
            </h2>
          </div>

          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Customer Name</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Mobile</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Chit Scheme</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Month</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Due Date</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Grace End Date</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Net Payable</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Balance Due</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {outstanding?.items?.length === 0 ? (
                  <tr>
                    <td colSpan="9" className="py-6 text-center text-slate-400 text-xs">
                      No outstanding installments found.
                    </td>
                  </tr>
                ) : (
                  outstanding?.items?.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2.5 font-bold text-slate-900 text-xs">{item.customerName}</td>
                      <td className="py-2 px-2.5 text-xs">{item.mobile}</td>
                      <td className="py-2 px-2.5 font-medium text-slate-800 text-xs">{item.chitGroup}</td>
                      <td className="py-2 px-2.5 font-mono font-semibold text-xs">M{item.installmentNumber}</td>
                      <td className="py-2 px-2.5 text-xs">{formatDate(item.dueDate)}</td>
                      <td className="py-2 px-2.5 text-amber-800 font-medium text-xs">{formatDate(item.graceEndDate)}</td>
                      <td className="py-2 px-2.5 text-xs">{formatCurrency(item.netPayableAmount)}</td>
                      <td className="py-2 px-2.5 font-bold text-rose-600 text-xs">{formatCurrency(item.balanceDue)}</td>
                      <td className="py-2 px-2.5">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                          item.isOverdue
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-amber-50 text-amber-700 border border-amber-200'
                        }`}>
                          {item.isOverdue ? 'Overdue' : 'Due'}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3: COLLECTIONS LOG WITH STABLE HEADERS */}
      {activeTab === 'collections' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="p-2.5 border-b border-slate-100 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-800">
              Collections ({collectionsReport?.count || 0}) &bull; Total: <span className="text-emerald-600">{formatCurrency(collectionsReport?.totalAmount || 0)}</span>
            </h2>
          </div>

          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Receipt #</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Chit Person</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Scheme</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Collection Date</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Amount</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Mode</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {collectionsReport?.items?.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2.5 font-mono font-bold text-indigo-700 text-xs">{c.receiptNumber}</td>
                    <td className="py-2 px-2.5 font-bold text-slate-900 text-xs">{c.chitPerson}</td>
                    <td className="py-2 px-2.5 text-slate-600 text-xs">{c.chitGroup}</td>
                    <td className="py-2 px-2.5 text-xs">{formatDate(c.collectionDate)}</td>
                    <td className="py-2 px-2.5 font-bold text-emerald-600 text-xs">{formatCurrency(c.amount)}</td>
                    <td className="py-2 px-2.5 text-xs">{c.paymentMode}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ReportsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <ReportsContent />
    </Suspense>
  );
}
