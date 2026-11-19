'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getChitGroups, 
  getChitSchedules, 
  recordAuction 
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  CalendarClock, 
  Clock, 
  Gavel, 
  Coins, 
  X, 
  CheckCircle2, 
  AlertCircle,
  HelpCircle,
  Sliders,
  TrendingDown
} from 'lucide-react';

export default function SchedulesPage() {
  const [chitGroups, setChitGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);

  // Auction modal
  const [activeAuctionSchedule, setActiveAuctionSchedule] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [winnerName, setWinnerName] = useState('');
  const [winnerMemberId, setWinnerMemberId] = useState('');
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadChitGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadSchedules(selectedGroupId);
    }
  }, [selectedGroupId]);

  async function loadChitGroups() {
    try {
      const data = await getChitGroups();
      if (Array.isArray(data) && data.length > 0) {
        setChitGroups(data);
        setSelectedGroupId(data[0].id.toString());
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function loadSchedules(groupId) {
    setLoading(true);
    try {
      const data = await getChitSchedules(groupId);
      setScheduleData(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuctionSave(e) {
    e.preventDefault();
    if (!activeAuctionSchedule) return;

    setModalLoading(true);
    try {
      await recordAuction(activeAuctionSchedule.id, {
        chitScheduleId: activeAuctionSchedule.id,
        winnerMemberId: winnerMemberId ? parseInt(winnerMemberId, 10) : 0,
        winnerName: winnerName || 'Winner Member',
        bidAmount: parseFloat(bidAmount) || 0,
      });

      setActiveAuctionSchedule(null);
      loadSchedules(selectedGroupId);
    } catch (err) {
      alert(err.message || 'Error recording auction');
    } finally {
      setModalLoading(false);
    }
  }

  const group = scheduleData?.chitGroup;
  const schedules = scheduleData?.schedules || [];

  return (
    <div className="space-y-2.5">
      {/* Compact Toolbar (Page Heading Removed) */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Scheme:
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => setSelectedGroupId(e.target.value)}
            className="px-2.5 py-1 rounded-md border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            {chitGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} ({formatCurrency(g.totalAmount)})
              </option>
            ))}
          </select>
        </div>

        {group && (
          <div className="flex items-center gap-2">
            <Link
              href={`/collections?chitGroupId=${group.id}&new=true`}
              className="px-2.5 py-1 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-2xs"
            >
              + Add Collection
            </Link>
          </div>
        )}
      </div>

      {group && (
        <>
          {/* Top Specification Overview (Compact Card) */}
          <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
              <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
                <span className="text-slate-400 block text-[9px] uppercase font-semibold">Total Chit Value</span>
                <span className="text-xs font-bold text-indigo-700">{formatCurrency(group.totalAmount)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
                <span className="text-slate-400 block text-[9px] uppercase font-semibold">Duration &amp; Term</span>
                <span className="text-xs font-bold text-slate-900">{group.durationYears} Yrs ({group.numberOfMonths} M)</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
                <span className="text-slate-400 block text-[9px] uppercase font-semibold">Starting Date</span>
                <span className="text-xs font-semibold text-slate-800">{formatDate(group.startDate)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
                <span className="text-slate-400 block text-[9px] uppercase font-semibold">End Date (Close)</span>
                <span className="text-xs font-semibold text-slate-800">{formatDate(group.endDate)}</span>
              </div>
              <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
                <span className="text-slate-400 block text-[9px] uppercase font-semibold">Monthly Due Date</span>
                <span className="text-xs font-semibold text-slate-800">Every {group.monthlyStartingDate}th</span>
              </div>
              <div className="p-2 bg-amber-50 rounded-md border border-amber-200/60">
                <span className="text-amber-800 block text-[9px] uppercase font-semibold">Grace Period</span>
                <span className="text-xs font-bold text-amber-900">{group.graceDays} Grace Days</span>
              </div>
            </div>

            <div className="mt-2 text-[10px] text-slate-600 flex items-center gap-1.5 bg-indigo-50/50 p-1.5 rounded border border-indigo-100/50">
              <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
              <span><strong>Policy:</strong> {group.gracePeriod}</span>
            </div>
          </div>

          {/* THE MASTER SCHEDULES TABLE WITH STABLE HEADERS */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-210px)]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-2xs">
                  <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Month</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Chit Date</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Grace End Date</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Base Installment</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Bid Discount</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Winner Person</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Dividend / Member</th>
                    <th className="sticky top-0 z-20 py-2 px-2.5 bg-indigo-100 text-indigo-950 font-extrabold border-x border-indigo-200 whitespace-nowrap">
                      How Much Amount Will Pay
                    </th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Prize to Winner</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Actual Collected</th>
                    <th className="sticky top-0 z-20 py-2 px-2.5 bg-amber-100 text-amber-950 font-extrabold border-x border-amber-200 whitespace-nowrap">
                      Remaining Amount to Company
                    </th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Status</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {schedules.map((s) => (
                    <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2.5 font-bold text-slate-900 text-xs">
                        Month {s.monthNumber}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-medium text-slate-900 text-xs">
                        {formatDate(s.chitDate)}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-amber-800 font-medium text-xs">
                        {formatDate(s.graceEndDate)}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-slate-800 text-xs">
                        {formatCurrency(s.baseInstallment)}
                      </td>
                      <td className="py-2 px-2.5 font-mono font-medium text-purple-700 text-xs">
                        {s.bidAmount > 0 ? formatCurrency(s.bidAmount) : '—'}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-slate-900 text-xs">
                        {s.winnerMemberName || (s.monthNumber === 1 ? 'Foreman Chit' : '—')}
                      </td>
                      <td className="py-2 px-2.5 text-emerald-600 font-semibold text-xs">
                        {s.dividendPerMember > 0 ? formatCurrency(s.dividendPerMember) : '—'}
                      </td>

                      {/* KEY COLUMN: How much amount will pay */}
                      <td className="py-2 px-2.5 bg-indigo-50/60 border-x border-indigo-100 font-extrabold text-indigo-700 text-xs whitespace-nowrap">
                        {formatCurrency(s.netPayablePerMember)}
                      </td>

                      <td className="py-2 px-2.5 font-semibold text-blue-700 text-xs">
                        {s.prizeAmountPaidToWinner > 0 ? formatCurrency(s.prizeAmountPaidToWinner) : '—'}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-emerald-600 text-xs">
                        {formatCurrency(s.totalActualCollected || 0)}
                      </td>

                      {/* KEY COLUMN: Remaining amount to company */}
                      <td className="py-2 px-2.5 bg-amber-50/60 border-x border-amber-100 font-extrabold text-amber-800 text-xs whitespace-nowrap">
                        {formatCurrency(s.remainingAmountToCompany)}
                      </td>

                      <td className="py-2 px-2.5">
                        <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${s.isAuctionCompleted
                          ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                          : s.monthNumber === 1
                            ? 'bg-blue-50 text-blue-700 border border-blue-200'
                            : 'bg-slate-100 text-slate-700'
                          }`}>
                          {s.status}
                        </span>
                      </td>

                      <td className="py-2 px-2.5 text-center whitespace-nowrap">
                        <button
                          onClick={() => {
                            setActiveAuctionSchedule(s);
                            setBidAmount(s.bidAmount > 0 ? s.bidAmount : '');
                            setWinnerMemberId(s.winnerMemberId || '');
                            setWinnerName(s.winnerMemberName || '');
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors inline-flex items-center gap-1"
                        >
                          <Gavel className="w-2.5 h-2.5" />
                          <span>Bid / Auction</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}

      {/* AUCTION MODAL (Compact) */}
      {activeAuctionSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <div>
                <h3 className="font-bold text-slate-900 text-xs">
                  Auction &bull; Month {activeAuctionSchedule.monthNumber}
                </h3>
                <p className="text-[10px] text-slate-500">
                  Due: {formatDate(activeAuctionSchedule.chitDate)}
                </p>
              </div>
              <button
                onClick={() => setActiveAuctionSchedule(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuctionSave} className="p-4 space-y-2.5 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Winner Chit Person *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Suresh Kumar"
                  value={winnerName}
                  onChange={(e) => setWinnerName(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Winning Bid Discount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="e.g. 120000"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-slate-900"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveAuctionSchedule(null)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={modalLoading}
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {modalLoading ? 'Saving...' : 'Apply Auction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
