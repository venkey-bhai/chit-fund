'use client';

import { useState, useEffect } from 'react';
import { 
  getChitGroups, 
  getChitSchedules, 
  recordAuction 
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;
import { 
  Gavel, 
  Trophy, 
  X
} from 'lucide-react';

export default function AuctionsPage() {
  const [chitGroups, setChitGroups] = useState([]);
  const [selectedGroupId, setSelectedGroupId] = useState('');
  const [scheduleData, setScheduleData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);

  // Modal State
  const [activeAuction, setActiveAuction] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    loadChitGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadSchedules(selectedGroupId);
    }
  }, [selectedGroupId]);

  async function loadChitGroups() {
    setLoading(true);
    try {
      const data = await getChitGroups();
      if (Array.isArray(data) && data.length > 0) {
        setChitGroups(data);
        setSelectedGroupId(data[0].id.toString());
      }
    } catch (err) {
      console.error('Error loading chit groups:', err);
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
      console.error('Error loading schedules:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAuctionSubmit(e) {
    e.preventDefault();
    if (!activeAuction) return;

    if (selectedIds.length === 0) {
      alert('Select at least one winner member.');
      return;
    }
    const names = members.filter((m) => selectedIds.includes(m.id)).map((m) => m.name);

    setSubmitting(true);
    try {
      await recordAuction(activeAuction.id, {
        chitScheduleId: activeAuction.id,
        winnerMemberId: selectedIds[0],
        winnerName: names[0],
        winnerNames: names,
        winnerMemberIds: selectedIds,
        bidAmount: parseFloat(bidAmount) || 0,
        discountAmount: parseFloat(bidAmount) || 0,
      });

      setActiveAuction(null);
      loadSchedules(selectedGroupId);
    } catch (err) {
      alert(err.message || 'Error recording auction');
    } finally {
      setSubmitting(false);
    }
  }

  const group = scheduleData?.chitGroup;
  const schedules = scheduleData?.schedules || [];
  const totalPages = Math.max(1, Math.ceil(schedules.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedSchedules = schedules.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const members = scheduleData?.members || [];

  // Members who already won in another month stay visible but disabled
  const selectableMembers = members.filter(
    (m) => !(m.hasPrized && m.prizedMonthNumber !== activeAuction?.monthNumber)
  );
  const toggleMember = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () =>
    setSelectedIds((prev) =>
      prev.length === selectableMembers.length ? [] : selectableMembers.map((m) => m.id)
    );

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5">
      {/* Compact Scheme Selector Toolbar (Page Heading Removed) */}
      <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Select Scheme:
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => { setSelectedGroupId(e.target.value); setPage(1); }}
            className="px-2.5 py-1 rounded border border-slate-300 bg-white text-xs font-bold text-slate-900 focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            {chitGroups.map((g) => (
              <option key={g.id} value={g.id}>
                {g.title} ({formatCurrency(g.totalAmount)})
              </option>
            ))}
          </select>
        </div>

        {group && (
          <div className="text-xs text-slate-500">
            {group.durationYears} Yrs &bull; {group.numberOfMonths} Mos &bull; Base: <strong className="text-slate-800">{formatCurrency(group.monthlyInstallment)}</strong>
          </div>
        )}
      </div>

      {group && (
        <div className="flex flex-col flex-1 min-h-0 gap-2.5">
          {/* Quick Metric Cards (Compact) */}
          {/* <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Total Value</span>
              <div className="text-sm font-bold text-indigo-700 mt-0.5">{formatCurrency(group.totalAmount)}</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Base Installment</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(group.monthlyInstallment)}</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Duration &amp; Members</span>
              <div className="text-sm font-bold text-slate-900 mt-0.5">{group.numberOfMonths} M &bull; {group.numberOfMembers} P</div>
            </div>
            <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
              <span className="text-[10px] text-slate-500 font-semibold uppercase">Foreman Fee</span>
              <div className="text-sm font-bold text-amber-600 mt-0.5">{group.foremanCommissionPercentage}% ({formatCurrency(group.totalAmount * (group.foremanCommissionPercentage / 100))})</div>
            </div>
          </div> */}

          {/* Auctions List in Scrollable Container */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1 min-h-0 divide-y divide-slate-100">
              {pagedSchedules.map((s) => (
                <div
                  key={s.id}
                  className="p-3 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 rounded font-bold bg-indigo-50 text-indigo-700 text-[10px]">
                        Month {s.monthNumber}
                      </span>
                      <span className="font-semibold text-slate-800 text-xs">
                        Due: {formatDate(s.chitDate)}
                      </span>
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                        s.isAuctionCompleted ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {s.status}
                      </span>
                    </div>

                    <div className="text-slate-500 text-[10px]">
                      Grace Ends: <strong className="text-amber-800">{formatDate(s.graceEndDate)}</strong>
                    </div>

                    {s.winnerMemberName && (
                      <div className="flex items-center gap-1 text-emerald-700 font-medium text-[11px]">
                        <Trophy className="w-3 h-3 text-amber-500" />
                        <span>Winner: <strong>{s.winnerMemberName}</strong> (Won {formatCurrency(s.prizeAmountPaidToWinner)})</span>
                      </div>
                    )}
                  </div>

                  {/* Financial breakdown */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 bg-slate-50 p-2 rounded-lg border border-slate-100 text-center text-xs">
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-medium">Bid Discount</span>
                      <span className="font-bold text-purple-700 text-xs">{s.bidAmount > 0 ? formatCurrency(s.bidAmount) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-medium">Dividend</span>
                      <span className="font-bold text-emerald-600 text-xs">{s.dividendPerMember > 0 ? formatCurrency(s.dividendPerMember) : '—'}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-medium">Net Payable</span>
                      <span className="font-bold text-indigo-700 text-xs">{formatCurrency(s.netPayablePerMember)}</span>
                    </div>
                    <div>
                      <span className="text-[9px] text-slate-400 block uppercase font-medium">To Company</span>
                      <span className="font-bold text-amber-700 text-xs">{formatCurrency(s.remainingAmountToCompany)}</span>
                    </div>
                  </div>

                  <div>
                    <button
                      onClick={() => {
                        setActiveAuction(s);
                        setBidAmount(s.bidAmount > 0 ? s.bidAmount : '');
                        setSelectedIds(
                          members
                            .filter((m) => m.hasPrized && m.prizedMonthNumber === s.monthNumber)
                            .map((m) => m.id)
                        );
                      }}
                      className="px-2.5 py-1 rounded text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center gap-1 shadow-2xs whitespace-nowrap"
                    >
                      <Gavel className="w-3 h-3" />
                      <span>{s.isAuctionCompleted ? 'Edit Auction' : 'Conduct Auction'}</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
        </div>
      )}

      {/* AUCTION MODAL (Compact) */}
      {activeAuction && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">
                Month {activeAuction.monthNumber} Auction Bidding
              </h3>
              <button
                onClick={() => setActiveAuction(null)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAuctionSubmit} className="p-4 space-y-2.5 text-xs">
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="block font-semibold text-slate-700">
                    Winner Chit Person(s) * <span className="text-slate-400 font-normal">({selectedIds.length} selected / {members.length} members)</span>
                  </label>
                  <button
                    type="button"
                    onClick={toggleAll}
                    className="text-[10px] font-semibold text-indigo-700 hover:underline"
                  >
                    {selectedIds.length === selectableMembers.length && selectableMembers.length > 0 ? 'Clear all' : 'Select all'}
                  </button>
                </div>
                <div className="space-y-1 max-h-48 overflow-y-auto border border-slate-200 rounded p-1.5">
                  {members.length === 0 && (
                    <p className="text-[11px] text-slate-500 p-1">No members enrolled in this scheme yet.</p>
                  )}
                  {members.map((m) => {
                    const wonEarlier = m.hasPrized && m.prizedMonthNumber !== activeAuction.monthNumber;
                    const checked = selectedIds.includes(m.id);
                    return (
                      <label
                        key={m.id}
                        className={`flex items-center gap-2 px-1.5 py-1 rounded ${wonEarlier ? 'bg-slate-50 text-slate-400 cursor-not-allowed' : 'hover:bg-indigo-50 cursor-pointer text-slate-900'}`}
                      >
                        <input
                          type="checkbox"
                          checked={checked}
                          disabled={wonEarlier}
                          onChange={() => toggleMember(m.id)}
                          className="accent-indigo-600"
                        />
                        <span className="font-semibold flex-1">{m.name}</span>
                        {wonEarlier && (
                          <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1">
                            Won Month {m.prizedMonthNumber}
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Winning Bid Discount (₹) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  placeholder="e.g. 150000"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-sm text-slate-900"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveAuction(null)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:opacity-50"
                >
                  {submitting ? 'Applying...' : 'Save & Recalculate'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
