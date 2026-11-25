'use client';

import { useState, useEffect, Suspense } from 'react';
import { getPayouts, markPayoutPaid } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { CheckCircle2, Clock, Landmark, X } from 'lucide-react';

function PayoutsContent() {
  const [payouts, setPayouts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedPayout, setSelectedPayout] = useState(null);
  const [txnRef, setTxnRef] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadPayouts();
  }, []);

  async function loadPayouts() {
    setLoading(true);
    try {
      const data = await getPayouts();
      setPayouts(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading prize payouts:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleDisburse(e) {
    e.preventDefault();
    if (!selectedPayout) return;

    setSubmitting(true);
    try {
      await markPayoutPaid(selectedPayout.id, txnRef);
      setSelectedPayout(null);
      setTxnRef('');
      loadPayouts();
    } catch (err) {
      alert(err.message || 'Error marking payout as disbursed');
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5">
      {/* Table Container with Sticky Headers (Page Heading Removed) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="p-2.5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-xs font-bold text-slate-800">
            Prize Payout Records ({payouts.length})
          </h2>
        </div>

        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Payout #</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Chit Scheme</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Cycle</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Winner Name</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Gross Prize</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Deductions</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Net Payable</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Status</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Disbursement Ref</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="10" className="py-6 text-center">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : payouts.length === 0 ? (
                <tr>
                  <td colSpan="10" className="py-6 text-center text-slate-400 text-xs">
                    No prize payouts found. Conduct and approve an auction to generate prize payout records.
                  </td>
                </tr>
              ) : (
                payouts.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2.5 font-mono font-bold text-slate-900 text-xs">
                      PO-{p.id.toString().padStart(4, '0')}
                    </td>
                    <td className="py-2 px-2.5 font-semibold text-slate-900 text-xs">
                      {p.chitGroupTitle}
                    </td>
                    <td className="py-2 px-2.5 text-xs">
                      Month {p.monthNumber}
                    </td>
                    <td className="py-2 px-2.5 font-bold text-indigo-700 text-xs">
                      {p.winnerName}
                    </td>
                    <td className="py-2 px-2.5 text-slate-600 text-xs">
                      {formatCurrency(p.grossAmount)}
                    </td>
                    <td className="py-2 px-2.5 text-rose-600 text-xs">
                      {p.deductions > 0 ? `-${formatCurrency(p.deductions)}` : '₹0.00'}
                    </td>
                    <td className="py-2 px-2.5 font-bold text-emerald-600 text-xs">
                      {formatCurrency(p.netAmount)}
                    </td>
                    <td className="py-2 px-2.5">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        p.status === 'Disbursed'
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border border-amber-200'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-mono text-[10px] text-slate-600">
                      {p.transactionReference || (p.paidAt ? formatDate(p.paidAt) : 'Pending')}
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      {p.status !== 'Disbursed' ? (
                        <button
                          onClick={() => {
                            setSelectedPayout(p);
                            setTxnRef(`NEFT-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${p.id}`);
                          }}
                          className="px-2 py-0.5 rounded bg-indigo-600 text-white font-semibold text-[10px] hover:bg-indigo-700 shadow-2xs"
                        >
                          Disburse
                        </button>
                      ) : (
                        <span className="text-emerald-700 font-semibold text-[10px]">Paid</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* DISBURSE MODAL (Compact) */}
      {selectedPayout && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">Disburse Prize Money</h3>
              <button onClick={() => setSelectedPayout(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleDisburse} className="p-4 space-y-2.5 text-xs">
              <div className="p-2.5 bg-slate-50 rounded-lg space-y-1 text-xs">
                <div>Winner: <strong className="text-slate-900">{selectedPayout.winnerName}</strong></div>
                <div>Scheme: <span className="text-slate-700">{selectedPayout.chitGroupTitle}</span></div>
                <div className="text-xs font-bold text-emerald-600 pt-0.5">
                  Net Amount: {formatCurrency(selectedPayout.netAmount)}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Bank Transaction Reference (NEFT / Cheque #) *
                </label>
                <input
                  type="text"
                  required
                  value={txnRef}
                  onChange={(e) => setTxnRef(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-mono font-medium text-xs"
                />
              </div>

              <div className="pt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedPayout(null)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1 rounded bg-emerald-600 text-white font-semibold text-xs hover:bg-emerald-700 disabled:opacity-50"
                >
                  {submitting ? 'Processing...' : 'Confirm'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function PayoutsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <PayoutsContent />
    </Suspense>
  );
}
