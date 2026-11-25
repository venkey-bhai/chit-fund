'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  getChitGroups, 
  getChitSchedules, 
  recordAuction 
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import Pagination from '@/components/Pagination';

const PAGE_SIZE = 10;
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
  const [page, setPage] = useState(1);
  // Bid discount typed directly in the table, per schedule id
  const [drafts, setDrafts] = useState({});

  // Auction modal
  const [activeAuctionSchedule, setActiveAuctionSchedule] = useState(null);
  const [bidAmount, setBidAmount] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [modalLoading, setModalLoading] = useState(false);

  useEffect(() => {
    loadChitGroups();
  }, []);

  useEffect(() => {
    if (selectedGroupId) {
      loadSchedules(selectedGroupId);
      try {
        setDrafts(JSON.parse(localStorage.getItem(`bidDrafts:${selectedGroupId}`) || '{}'));
      } catch {
        setDrafts({});
      }
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

    if (selectedIds.length === 0) {
      alert('Select at least one winner member.');
      return;
    }
    const names = members.filter((m) => selectedIds.includes(m.id)).map((m) => m.name);

    setModalLoading(true);
    try {
      await recordAuction(activeAuctionSchedule.id, {
        chitScheduleId: activeAuctionSchedule.id,
        chitGroupId: Number(selectedGroupId),
        winnerMemberId: selectedIds[0],
        winnerName: names[0],
        winnerNames: names,
        winnerMemberIds: selectedIds,
        bidAmount: parseFloat(bidAmount) || 0,
        discountAmount: parseFloat(bidAmount) || 0,
      });

      clearDraft(activeAuctionSchedule.id);
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
  const totalPages = Math.max(1, Math.ceil(schedules.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedSchedules = schedules.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);
  const members = scheduleData?.members || [];

  // Everything below follows from the bid discount the admin types:
  // commission = chit value x foreman %, dividend/member = (discount - commission) / members,
  // net payable = base installment - dividend, prize to winner = chit value - discount.
  function calcFromDiscount(discount) {
    const commission = Math.round(group.totalAmount * (group.foremanCommissionPercentage / 100) * 100) / 100;
    const distributable = Math.max(0, discount - commission);
    const dividend = group.numberOfMembers > 0 ? Math.round((distributable / group.numberOfMembers) * 100) / 100 : 0;
    return {
      dividend,
      netPayable: Math.round((group.monthlyInstallment - dividend) * 100) / 100,
      prize: Math.round((group.totalAmount - discount) * 100) / 100,
      remaining: commission,
    };
  }

  // Values shown in a row: calculated live from the typed discount, else the saved ones
  function rowView(s) {
    const draft = drafts[s.id];
    const typed = parseFloat(draft);
    if (draft !== undefined && draft !== '' && !isNaN(typed) && typed >= 0 && typed <= group.totalAmount) {
      const c = calcFromDiscount(typed);
      return { dividend: c.dividend, netPayable: c.netPayable, prize: c.prize, remaining: c.remaining };
    }
    return {
      dividend: s.dividendPerMember,
      netPayable: s.netPayablePerMember,
      prize: s.prizeAmountPaidToWinner,
      remaining: s.remainingAmountToCompany,
    };
  }

  // Typed discounts that aren't saved yet (no winner picked) are kept per scheme, also across reloads
  function updateDrafts(updater) {
    setDrafts((prev) => {
      const next = updater(prev);
      try {
        localStorage.setItem(`bidDrafts:${selectedGroupId}`, JSON.stringify(next));
      } catch {}
      return next;
    });
  }

  function clearDraft(id) {
    updateDrafts((d) => {
      const rest = { ...d };
      delete rest[id];
      return rest;
    });
  }

  // Enter on the discount box: save now if a winner is already recorded, else open the popup to pick one
  async function commitDraft(s) {
    const raw = drafts[s.id];
    if (raw === undefined) return;
    const value = parseFloat(raw);
    if (raw === '' || isNaN(value) || value === s.bidAmount) {
      clearDraft(s.id);
      return;
    }
    if (value < 0 || value > group.totalAmount) {
      alert(`Discount must be between 0 and ${formatCurrency(group.totalAmount)}.`);
      return;
    }
    const winners = members.filter((m) => m.hasPrized && m.prizedMonthNumber === s.monthNumber);
    if (winners.length === 0) {
      setActiveAuctionSchedule(s);
      setBidAmount(String(value));
      setSelectedIds([]);
      // keep the typed value in the table until a winner is saved
      return;
    }
    try {
      await recordAuction(s.id, {
        chitScheduleId: s.id,
        chitGroupId: Number(selectedGroupId),
        winnerMemberId: winners[0].id,
        winnerName: winners[0].name,
        winnerNames: winners.map((m) => m.name),
        winnerMemberIds: winners.map((m) => m.id),
        bidAmount: value,
        discountAmount: value,
      });
      clearDraft(s.id);
      loadSchedules(selectedGroupId);
    } catch (err) {
      alert(err.message || 'Error saving bid discount');
    }
  }

  // Locked once the auction is saved with a resolvable winner; a row showing the 'Auction Winner' placeholder stays open to fix
  const isLocked = (s) => s.status === 'AuctionCompleted' && s.winnerMemberName !== 'Auction Winner';

  // Members who already won in another month stay visible but disabled
  const selectableMembers = members.filter(
    (m) => !(m.hasPrized && m.prizedMonthNumber !== activeAuctionSchedule?.monthNumber)
  );

  const toggleMember = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const toggleAll = () =>
    setSelectedIds((prev) =>
      prev.length === selectableMembers.length ? [] : selectableMembers.map((m) => m.id)
    );

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5">
      {/* Compact Toolbar (Page Heading Removed) */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <label className="text-xs font-semibold text-slate-700 whitespace-nowrap">
            Scheme:
          </label>
          <select
            value={selectedGroupId}
            onChange={(e) => { setSelectedGroupId(e.target.value); setPage(1); }}
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
          {/* <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs">
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
          </div> */}

          {/* THE MASTER SCHEDULES TABLE WITH STABLE HEADERS */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
            <div className="overflow-auto flex-1 min-h-0">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-2xs">
                  <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Month</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Chit Date</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 whitespace-nowrap">Grace End Date</th>
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
                    <th className="sticky top-0 right-0 bg-slate-100 z-30 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)] py-2 px-2.5 text-center whitespace-nowrap">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {pagedSchedules.map((s) => (
                    <tr key={s.id} className="group hover:bg-slate-50 transition-colors">
                      <td className="py-2 px-2.5 font-bold text-slate-900 text-xs">
                        Month {s.monthNumber}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap font-medium text-slate-900 text-xs">
                        {formatDate(s.chitDate)}
                      </td>
                      <td className="py-2 px-2.5 whitespace-nowrap text-amber-800 font-medium text-xs">
                        {formatDate(s.graceEndDate)}
                      </td>
                      <td className="py-2 px-2.5 font-mono font-medium text-purple-700 text-xs">
                        {(
                          <input
                            type="number"
                            min="0"
                            step="any"
                            placeholder="Enter ₹"
                            disabled={isLocked(s)}
                            value={drafts[s.id] ?? (s.bidAmount > 0 ? String(s.bidAmount) : '')}
                            onChange={(e) => updateDrafts((d) => ({ ...d, [s.id]: e.target.value }))}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') commitDraft(s);
                              if (e.key === 'Escape') clearDraft(s.id);
                            }}
                            onBlur={() => {
                              if (members.some((m) => m.hasPrized && m.prizedMonthNumber === s.monthNumber)) commitDraft(s);
                            }}
                            title={drafts[s.id] !== undefined
                              ? 'Not saved yet. Press Enter and pick the winner(s) to save this auction.'
                              : 'Type the bid discount and press Enter. Other amounts calculate automatically.'}
                            className={`w-24 px-1.5 py-0.5 rounded border focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs disabled:bg-slate-100 disabled:text-slate-500 disabled:cursor-not-allowed ${
                              drafts[s.id] !== undefined ? 'border-amber-400 bg-amber-50' : 'border-slate-300'
                            }`}
                          />
                        )}
                      </td>
                      <td className="py-2 px-2.5 font-semibold text-slate-900 text-xs">
                        {s.winnerMemberName || (s.monthNumber === 1 ? 'Foreman Chit' : '—')}
                      </td>
                      <td className="py-2 px-2.5 text-emerald-600 font-semibold text-xs">
                        {rowView(s).dividend > 0 ? formatCurrency(rowView(s).dividend) : '—'}
                      </td>

                      {/* KEY COLUMN: How much amount will pay */}
                      <td className="py-2 px-2.5 bg-indigo-50/60 border-x border-indigo-100 font-extrabold text-indigo-700 text-xs whitespace-nowrap">
                        {formatCurrency(rowView(s).netPayable)}
                      </td>

                      <td className="py-2 px-2.5 font-semibold text-blue-700 text-xs">
                        {rowView(s).prize > 0 ? formatCurrency(rowView(s).prize) : '—'}
                      </td>
                      <td className="py-2 px-2.5 font-bold text-emerald-600 text-xs">
                        {formatCurrency(s.totalActualCollected || 0)}
                      </td>

                      {/* KEY COLUMN: Remaining amount to company */}
                      <td className="py-2 px-2.5 bg-amber-50/60 border-x border-amber-100 font-extrabold text-amber-800 text-xs whitespace-nowrap">
                        {formatCurrency(rowView(s).remaining)}
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

                      <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)] py-2 px-2.5 text-center whitespace-nowrap">
                        <button
                          disabled={isLocked(s)}
                          title={isLocked(s) ? 'Auction already completed for this month' : ''}
                          onClick={() => {
                            setActiveAuctionSchedule(s);
                            setBidAmount(s.bidAmount > 0 ? s.bidAmount : '');
                            setSelectedIds(
                              members
                                .filter((m) => m.hasPrized && m.prizedMonthNumber === s.monthNumber)
                                .map((m) => m.id)
                            );
                          }}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 transition-colors inline-flex items-center gap-1 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-indigo-50"
                        >
                          {/* <Gavel className="w-2.5 h-2.5" /> */}
                          <span>Auction</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
          </div>
        </>
      )}

      {/* AUCTION MODAL (Compact) */}
      {activeAuctionSchedule && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
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
                    const wonEarlier = m.hasPrized && m.prizedMonthNumber !== activeAuctionSchedule.monthNumber;
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
                  placeholder="e.g. 120000"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-slate-900"
                />
                {(() => {
                  const d = parseFloat(bidAmount);
                  if (isNaN(d) || d < 0 || d > group.totalAmount) return null;
                  const c = calcFromDiscount(d);
                  return (
                    <div className="mt-1.5 grid grid-cols-2 gap-1.5 text-[11px]">
                      <div className="p-1.5 rounded bg-emerald-50 border border-emerald-200">
                        <div className="text-emerald-700 font-semibold">Dividend / member</div>
                        <div className="font-bold text-emerald-800">{formatCurrency(c.dividend)}</div>
                      </div>
                      <div className="p-1.5 rounded bg-indigo-50 border border-indigo-200">
                        <div className="text-indigo-700 font-semibold">Each member pays</div>
                        <div className="font-bold text-indigo-800">{formatCurrency(c.netPayable)}</div>
                      </div>
                      <div className="p-1.5 rounded bg-blue-50 border border-blue-200">
                        <div className="text-blue-700 font-semibold">Prize to winner</div>
                        <div className="font-bold text-blue-800">{formatCurrency(c.prize)}</div>
                      </div>
                      <div className="p-1.5 rounded bg-amber-50 border border-amber-200">
                        <div className="text-amber-700 font-semibold">Remaining to company</div>
                        <div className="font-bold text-amber-800">{formatCurrency(c.remaining)}</div>
                      </div>
                    </div>
                  );
                })()}
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
