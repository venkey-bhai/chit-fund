'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { 
  getChitGroupById, 
  recordAuction 
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Coins, 
  ArrowLeft, 
  Calendar, 
  CalendarClock, 
  Clock, 
  CheckCircle2, 
  Gavel, 
  Users, 
  ReceiptIndianRupee, 
  AlertCircle,
  X,
  FileSpreadsheet
} from 'lucide-react';

export default function ChitDetailPage() {
  const { id } = useParams();
  const router = useRouter();

  const [group, setGroup] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('schedules'); // 'schedules' | 'members'

  // Auction Modal state
  const [selectedScheduleForAuction, setSelectedScheduleForAuction] = useState(null);
  const [auctionBidAmount, setAuctionBidAmount] = useState('');
  const [auctionWinnerMemberId, setAuctionWinnerMemberId] = useState('');
  const [auctionWinnerName, setAuctionWinnerName] = useState('');
  const [auctionSubmitting, setAuctionSubmitting] = useState(false);
  const [auctionError, setAuctionError] = useState('');

  useEffect(() => {
    if (id) loadChitGroup();
  }, [id]);

  async function loadChitGroup() {
    setLoading(true);
    setError('');
    try {
      const data = await getChitGroupById(id);
      setGroup(data);
    } catch (err) {
      setError(err.message || 'Failed to load Chit Group details');
    } finally {
      setLoading(false);
    }
  }

  function openAuctionModal(schedule) {
    setSelectedScheduleForAuction(schedule);
    setAuctionBidAmount(schedule.bidAmount > 0 ? schedule.bidAmount : '');
    setAuctionWinnerMemberId(schedule.winnerMemberId || '');
    setAuctionWinnerName(schedule.winnerMemberName || '');
    setAuctionError('');
  }

  async function handleAuctionSubmit(e) {
    e.preventDefault();
    if (!selectedScheduleForAuction) return;

    setAuctionSubmitting(true);
    setAuctionError('');
    try {
      const bid = parseFloat(auctionBidAmount) || 0;
      await recordAuction(selectedScheduleForAuction.id, {
        chitScheduleId: selectedScheduleForAuction.id,
        winnerMemberId: auctionWinnerMemberId ? parseInt(auctionWinnerMemberId, 10) : 0,
        winnerName: auctionWinnerName || 'Winner Member',
        bidAmount: bid,
      });

      setSelectedScheduleForAuction(null);
      await loadChitGroup();
    } catch (err) {
      setAuctionError(err.message || 'Failed to update auction.');
    } finally {
      setAuctionSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-2">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-xs font-medium text-slate-500">Loading Chit Scheme Details...</p>
      </div>
    );
  }

  if (error || !group) {
    return (
      <div className="p-4 bg-white rounded-lg border border-slate-200 text-center space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-500 mx-auto" />
        <h2 className="text-sm font-bold text-slate-800">Error Loading Chit Group</h2>
        <p className="text-xs text-slate-500">{error || 'Scheme not found.'}</p>
        <Link
          href="/chits"
          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 text-white text-xs font-semibold rounded-md"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to All Chits</span>
        </Link>
      </div>
    );
  }

  // Calculate totals
  const totalActualAll = group.schedules?.reduce((acc, s) => acc + (s.totalActualCollected || 0), 0) || 0;
  const totalCompanyRemaining = group.schedules?.reduce((acc, s) => acc + (s.remainingAmountToCompany || 0), 0) || 0;
  const totalPrizePaid = group.schedules?.reduce((acc, s) => acc + (s.isAuctionCompleted ? (s.prizeAmountPaidToWinner || 0) : 0), 0) || 0;

  return (
    <div className="space-y-2.5">
      {/* Back button & Action Header (Compact) */}
      <div className="flex items-center justify-between">
        <Link
          href="/chits"
          className="inline-flex items-center gap-1 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white px-2.5 py-1 rounded-md border border-slate-200 shadow-2xs"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back to Schemes</span>
        </Link>

        <Link
          href={`/collections?chitGroupId=${group.id}&new=true`}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs"
        >
          <ReceiptIndianRupee className="w-3 h-3" />
          <span>Record Payment</span>
        </Link>
      </div>

      {/* Scheme Header Specification Card (Compact) */}
      <div className="bg-white rounded-lg border border-slate-200 p-3 shadow-2xs space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-2">
          <div>
            <div className="flex items-center gap-1.5">
              <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                {group.groupCode}
              </span>
              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                {group.status}
              </span>
            </div>
            <h1 className="text-sm font-bold text-slate-900 mt-0.5">{group.title}</h1>
          </div>

          <div className="text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Chit Value: </span>
            <span className="text-base font-extrabold text-indigo-600">{formatCurrency(group.totalAmount)}</span>
          </div>
        </div>

        {/* Detailed Grid of Features as in chitfund.txt */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2 text-xs">
          <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Duration</span>
            <span className="text-xs font-bold text-slate-800">{group.durationYears} Yrs ({group.numberOfMonths} M)</span>
          </div>

          <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Seats / Max</span>
            <span className="text-xs font-bold text-slate-800">{group.memberships?.length || group.numberOfMembers} / {group.maxMembers}</span>
          </div>

          <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Start Date</span>
            <span className="text-xs font-semibold text-slate-800">{formatDate(group.startDate)}</span>
          </div>

          <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-semibold">End Date</span>
            <span className="text-xs font-semibold text-slate-800">{formatDate(group.endDate)}</span>
          </div>

          <div className="p-2 bg-slate-50 rounded-md border border-slate-100">
            <span className="text-slate-400 block text-[9px] uppercase font-semibold">Monthly Due</span>
            <span className="text-xs font-semibold text-slate-800">Every {group.monthlyStartingDate}th</span>
          </div>

          <div className="p-2 bg-amber-50 rounded-md border border-amber-200/60">
            <span className="text-amber-800 block text-[9px] uppercase font-semibold">Grace Days</span>
            <span className="text-xs font-bold text-amber-900">{group.graceDays} Days</span>
          </div>
        </div>

        {/* Grace Period & Foreman Commission Notes */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-2 p-2 bg-indigo-50/40 rounded-md border border-indigo-100/70 text-[11px]">
          <div className="flex items-center gap-1.5">
            <Clock className="w-3 h-3 text-indigo-600 shrink-0" />
            <span className="text-slate-700">
              <strong className="font-semibold text-indigo-950">Terms:</strong> {group.gracePeriod}
            </span>
          </div>
          <div className="shrink-0 text-slate-600 text-[10px]">
            Commission: <strong className="font-bold text-slate-900">{group.foremanCommissionPercentage}%</strong> ({formatCurrency(group.totalAmount * (group.foremanCommissionPercentage / 100))})
          </div>
        </div>
      </div>

      {/* Financial Metrics Summary (Compact Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Base Installment</span>
          <div className="text-sm font-bold text-slate-900">{formatCurrency(group.monthlyInstallment)}</div>
        </div>

        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Collected</span>
          <div className="text-sm font-bold text-emerald-600">{formatCurrency(totalActualAll)}</div>
        </div>

        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Prize Money Paid</span>
          <div className="text-sm font-bold text-blue-600">{formatCurrency(totalPrizePaid)}</div>
        </div>

        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">To Company</span>
          <div className="text-sm font-bold text-amber-600">{formatCurrency(totalCompanyRemaining)}</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200 gap-2">
        <button
          onClick={() => setActiveTab('schedules')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'schedules'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <FileSpreadsheet className="w-3.5 h-3.5" />
          <span>Schedules Table &amp; Company Balance</span>
        </button>
        <button
          onClick={() => setActiveTab('members')}
          className={`flex items-center gap-1.5 py-1.5 px-3 text-xs font-semibold border-b-2 transition-colors ${
            activeTab === 'members'
              ? 'border-indigo-600 text-indigo-600 bg-white'
              : 'border-transparent text-slate-500 hover:text-slate-800'
          }`}
        >
          <Users className="w-3.5 h-3.5" />
          <span>Enrolled Persons ({group.memberships?.length || 0})</span>
        </button>
      </div>

      {/* TAB 1: SCHEDULES TABLE WITH STABLE HEADERS */}
      {activeTab === 'schedules' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-270px)]">
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
                {group.schedules?.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2.5 font-bold text-slate-900 text-xs">M{s.monthNumber}</td>
                    <td className="py-2 px-2.5 whitespace-nowrap font-medium text-xs">{formatDate(s.chitDate)}</td>
                    <td className="py-2 px-2.5 whitespace-nowrap text-amber-800 text-xs">{formatDate(s.graceEndDate)}</td>
                    <td className="py-2 px-2.5 font-semibold text-slate-800 text-xs">{formatCurrency(s.baseInstallment)}</td>
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
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        s.isAuctionCompleted || s.status === 'AuctionCompleted'
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
                        onClick={() => openAuctionModal(s)}
                        className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors inline-flex items-center gap-1"
                      >
                        <Gavel className="w-2.5 h-2.5" />
                        <span>Auction / Bid</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 2: ENROLLED MEMBERS WITH STABLE HEADERS */}
      {activeTab === 'members' && (
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-auto max-h-[calc(100vh-270px)]">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-20 bg-slate-100 shadow-2xs">
                <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Seat #</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Chit Person Name</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Phone</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Email</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Auction Status</th>
                  <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Prized Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {group.memberships?.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400 text-xs">
                      No members enrolled in this chit scheme yet.
                    </td>
                  </tr>
                ) : (
                  group.memberships?.map((m) => (
                    <tr key={m.id} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono font-bold text-indigo-600 text-xs">
                        #{m.ticketNumber}
                      </td>
                      <td className="py-2 px-3 font-semibold text-slate-900 text-xs">{m.memberName}</td>
                      <td className="py-2 px-3 text-xs">{m.phone || '—'}</td>
                      <td className="py-2 px-3 text-xs">{m.email || '—'}</td>
                      <td className="py-2 px-3">
                        {m.hasPrized ? (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Prize Winner
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-slate-100 text-slate-600">
                            Non-Prized
                          </span>
                        )}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        {m.hasPrized ? `Month ${m.prizedMonthNumber} (${formatCurrency(m.prizedAmount)})` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* AUCTION MODAL (Compact) */}
      {selectedScheduleForAuction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">
                Auction &bull; Month {selectedScheduleForAuction.monthNumber}
              </h3>
              <button
                onClick={() => setSelectedScheduleForAuction(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuctionSubmit} className="p-4 space-y-2.5 text-xs">
              {auctionError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                  {auctionError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Select Winner Person *</label>
                <select
                  required
                  value={auctionWinnerMemberId}
                  onChange={(e) => {
                    setAuctionWinnerMemberId(e.target.value);
                    const mem = group.memberships?.find((m) => m.memberId.toString() === e.target.value);
                    if (mem) setAuctionWinnerName(mem.memberName);
                  }}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                >
                  <option value="">-- Choose Member --</option>
                  {group.memberships?.map((m) => (
                    <option key={m.id} value={m.memberId}>
                      Seat #{m.ticketNumber}: {m.memberName} {m.hasPrized ? '(Already Prized)' : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Winning Bid Discount (₹) *</label>
                <input
                  type="number"
                  min="0"
                  step="1000"
                  required
                  placeholder="e.g. 120000"
                  value={auctionBidAmount}
                  onChange={(e) => setAuctionBidAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-sm text-slate-900"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setSelectedScheduleForAuction(null)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={auctionSubmitting}
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {auctionSubmitting ? 'Saving...' : 'Apply Auction'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
