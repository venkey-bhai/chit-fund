'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  getChitGroups, 
  createChitGroup, 
  deleteChitGroup, 
  getMembers, 
  enrollMemberInGroup 
} from '@/lib/api';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils';
import { 
  Coins, 
  PlusCircle, 
  CalendarClock, 
  Trash2, 
  UserPlus, 
  X, 
  CheckCircle2, 
  Clock, 
  Calendar,
  AlertCircle
} from 'lucide-react';

function ChitsContent() {
  const searchParams = useSearchParams();
  const [chits, setChits] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedChitForEnroll, setSelectedChitForEnroll] = useState(null);
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [ticketNumber, setTicketNumber] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const today = new Date();
  const [formData, setFormData] = useState({
    title: '',
    groupCode: '',
    totalAmount: 500000,
    durationYears: 1,
    numberOfMonths: 12,
    numberOfMembers: 12,
    maxMembers: 12,
    startDate: formatDateInput(today),
    endDate: formatDateInput(new Date(today.getFullYear(), today.getMonth() + 11, today.getDate())),
    monthlyStartingDate: 5,
    graceDays: 5,
    gracePeriod: 'Late fee of ₹50 per day after grace period expiration. Chit auction bidding revoked after 10 days default.',
    foremanCommissionPercentage: 5.0,
  });

  useEffect(() => {
    loadData();
    if (searchParams.get('new') === 'true') {
      setIsCreateModalOpen(true);
    }
  }, [searchParams]);

  async function loadData() {
    setLoading(true);
    try {
      const [chitsData, membersData] = await Promise.all([
        getChitGroups(),
        getMembers(),
      ]);
      setChits(Array.isArray(chitsData) ? chitsData : []);
      setMembers(Array.isArray(membersData) ? membersData : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleYearsChange(yearsVal) {
    const y = parseFloat(yearsVal);
    const m = Math.round(y * 12);

    let endStr = formData.endDate;
    if (formData.startDate) {
      const s = new Date(formData.startDate);
      s.setMonth(s.getMonth() + m - 1);
      endStr = formatDateInput(s);
    }

    setFormData((prev) => ({
      ...prev,
      durationYears: y,
      numberOfMonths: m,
      numberOfMembers: m,
      maxMembers: m,
      endDate: endStr,
    }));
  }

  function handleMonthsChange(monthsVal) {
    const m = parseInt(monthsVal, 10) || 1;
    const y = +(m / 12).toFixed(2);

    let endStr = formData.endDate;
    if (formData.startDate) {
      const s = new Date(formData.startDate);
      s.setMonth(s.getMonth() + m - 1);
      endStr = formatDateInput(s);
    }

    setFormData((prev) => ({
      ...prev,
      durationYears: y,
      numberOfMonths: m,
      numberOfMembers: m,
      maxMembers: m,
      endDate: endStr,
    }));
  }

  function handleStartDateChange(startDateStr) {
    let endStr = formData.endDate;
    if (startDateStr) {
      const s = new Date(startDateStr);
      s.setMonth(s.getMonth() + (formData.numberOfMonths || 12) - 1);
      endStr = formatDateInput(s);
    }

    setFormData((prev) => ({
      ...prev,
      startDate: startDateStr,
      endDate: endStr,
    }));
  }

  async function handleCreateSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      if (!formData.title) {
        setFormError('Please enter a Chit Scheme Title.');
        return;
      }
      if (!formData.totalAmount || formData.totalAmount <= 0) {
        setFormError('Please enter a valid Total Chit Amount.');
        return;
      }

      // Map form fields to the API's ChitGroupCreateRequest (names and numeric types)
      await createChitGroup({
        groupName: formData.title.trim(),
        groupCode: formData.groupCode?.trim() || null,
        chitValue: Number(formData.totalAmount),
        durationYears: Number(formData.durationYears),
        durationMonths: parseInt(formData.numberOfMonths, 10),
        totalMembers: parseInt(formData.numberOfMembers, 10),
        maxMembers: parseInt(formData.maxMembers, 10),
        startDate: formData.startDate,
        endDate: formData.endDate || null,
        monthlyStartingDate: parseInt(formData.monthlyStartingDate, 10),
        graceDays: parseInt(formData.graceDays, 10),
        gracePeriod: formData.gracePeriod,
        foremanCommissionPercentage: Number(formData.foremanCommissionPercentage),
      });
      setIsCreateModalOpen(false);
      setSuccessMessage('Chit Scheme created and schedule generated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadData();
    } catch (err) {
      setFormError(err.message || 'Error creating Chit Scheme');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this Chit Scheme? All schedules and collections will be deleted.')) {
      return;
    }
    try {
      await deleteChitGroup(id);
      loadData();
    } catch (err) {
      alert(err.message || 'Error deleting Chit Scheme');
    }
  }

  async function handleEnrollSubmit(e) {
    e.preventDefault();
    if (!enrollMemberId) {
      alert('Please select a member');
      return;
    }
    try {
      await enrollMemberInGroup(selectedChitForEnroll.id, {
        memberId: parseInt(enrollMemberId, 10),
        ticketNumber: ticketNumber ? parseInt(ticketNumber, 10) : 0,
      });
      setIsEnrollModalOpen(false);
      setEnrollMemberId('');
      setTicketNumber('');
      setSuccessMessage('Member enrolled successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadData();
    } catch (err) {
      alert(err.message || 'Failed to enroll member');
    }
  }

  return (
    <div className="space-y-3">
      {/* Compact Header Bar (Page Heading Removed) */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs flex items-center justify-between">
        <div className="text-xs font-bold text-slate-700">
          Chit Schemes ({chits.length})
        </div>
        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-md transition-colors shadow-2xs"
        >
          <PlusCircle className="w-3.5 h-3.5" />
          <span>Create New Chit Scheme</span>
        </button>
      </div>

      {successMessage && (
        <div className="p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-md flex items-center gap-2 text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          <span className="font-medium">{successMessage}</span>
        </div>
      )}

      {/* Chit Schemes Grid (Reduced Card Size) */}
      {loading ? (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
        </div>
      ) : chits.length === 0 ? (
        <div className="bg-white rounded-lg border border-slate-200 p-8 text-center space-y-2">
          <Coins className="w-8 h-8 text-slate-300 mx-auto" />
          <h3 className="text-sm font-bold text-slate-700">No Chit Schemes Found</h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Click &ldquo;Create New Chit Scheme&rdquo; to set up your first chit with months, years, grace days, and start/end dates.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {chits.map((c) => (
            <div
              key={c.id}
              className="bg-white rounded-lg border border-slate-200 shadow-2xs hover:shadow-xs transition-shadow p-3.5 space-y-2.5"
            >
              {/* Card Header */}
              <div className="flex items-start justify-between gap-2">
                <div>
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                      {c.groupCode}
                    </span>
                    <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {c.status}
                    </span>
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 mt-0.5">{c.title}</h2>
                </div>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="text-slate-400 hover:text-rose-600 p-1 rounded hover:bg-rose-50 transition-colors"
                  title="Delete Chit Scheme"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* Financial Highlights (Compact) */}
              <div className="grid grid-cols-3 gap-2 p-2 bg-slate-50 rounded-md border border-slate-100 text-center text-xs">
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-medium">Chit Value</span>
                  <span className="text-xs font-bold text-slate-900">{formatCurrency(c.totalAmount)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-medium">Installment</span>
                  <span className="text-xs font-bold text-indigo-600">{formatCurrency(c.monthlyInstallment)}</span>
                </div>
                <div>
                  <span className="text-[9px] text-slate-500 block uppercase font-medium">Collected</span>
                  <span className="text-xs font-bold text-emerald-600">{formatCurrency(c.totalCollected || 0)}</span>
                </div>
              </div>

              {/* Detail Specifications (as in chitfund.txt) */}
              <div className="space-y-1.5 text-xs border-t border-slate-100 pt-2">
                <div className="grid grid-cols-2 gap-1.5 text-slate-600 text-[11px]">
                  <div>
                    <span className="text-slate-400 text-[10px] block">Duration:</span>
                    <span className="font-semibold text-slate-800">{c.durationYears} Yrs ({c.numberOfMonths} Mos)</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Capacity:</span>
                    <span className="font-semibold text-slate-800">{c.enrolledCount || c.numberOfMembers} / {c.maxMembers} Max</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Start Date:</span>
                    <span className="font-medium text-slate-800">{formatDate(c.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">End Date:</span>
                    <span className="font-medium text-slate-800">{formatDate(c.endDate)}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Monthly Due:</span>
                    <span className="font-medium text-slate-800">Every {c.monthlyStartingDate}th</span>
                  </div>
                  <div>
                    <span className="text-slate-400 text-[10px] block">Grace Days:</span>
                    <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.2 rounded inline-block text-[10px]">
                      {c.graceDays} Days
                    </span>
                  </div>
                </div>

                <div className="bg-indigo-50/50 p-1.5 rounded border border-indigo-100/50 text-[10px]">
                  <span className="font-semibold text-indigo-900 block">Policy:</span>
                  <p className="text-slate-600 truncate">{c.gracePeriod}</p>
                </div>
              </div>

              {/* Action Buttons (Reduced Size) */}
              <div className="flex items-center justify-between gap-2 pt-1 border-t border-slate-100">
                <button
                  onClick={() => {
                    setSelectedChitForEnroll(c);
                    setIsEnrollModalOpen(true);
                  }}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 transition-colors"
                >
                  <UserPlus className="w-3 h-3 text-indigo-600" />
                  <span>Enroll Person</span>
                </button>

                <Link
                  href={`/chits/${c.id}`}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 transition-colors shadow-2xs"
                >
                  <CalendarClock className="w-3 h-3" />
                  <span>Schedules Table &rarr;</span>
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* CREATE CHIT SCHEME MODAL (Compact) */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden my-4">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">Create New Chit Fund Scheme</h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="p-4 space-y-2.5 max-h-[82vh] overflow-y-auto text-xs">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{formError}</span>
                </div>
              )}

              {/* Title & Group Code */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Chit Scheme Title *</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Diamond 2-Year Chit Scheme"
                    value={formData.title}
                    onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Group Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CF-2026-D24"
                    value={formData.groupCode}
                    onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 uppercase font-mono text-xs"
                  />
                </div>
              </div>

              {/* Total Chit Amount */}
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Total Chit Value (₹) *</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={formData.totalAmount}
                  onChange={(e) => setFormData({ ...formData, totalAmount: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900 text-xs"
                />
              </div>

              {/* Duration: Choose how many years of chit & Number of Months */}
              <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-2">
                <span className="font-bold text-indigo-950 text-[11px] block">
                  Duration &amp; Term Configuration (chitfund.txt):
                </span>
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Choose How Many Years of Chit:
                    </label>
                    <select
                      value={formData.durationYears}
                      onChange={(e) => handleYearsChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    >
                      <option value="1">1 Year (12 Months)</option>
                      <option value="1.67">1.67 Years (20 Months)</option>
                      <option value="2">2 Years (24 Months)</option>
                      <option value="2.5">2.5 Years (30 Months)</option>
                      <option value="3">3 Years (36 Months)</option>
                      <option value="4">4 Years (48 Months)</option>
                      <option value="5">5 Years (60 Months)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      No. of Months:
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="120"
                      required
                      value={formData.numberOfMonths}
                      onChange={(e) => handleMonthsChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold text-xs"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-0.5">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">No. of Members:</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.numberOfMembers}
                      onChange={(e) => setFormData({ ...formData, numberOfMembers: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                    />
                  </div>
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">Maximum Members:</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.maxMembers}
                      onChange={(e) => setFormData({ ...formData, maxMembers: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Start Date (Day, Month, Year) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    End Date (Day, Month, Year) *
                  </label>
                  <input
                    type="date"
                    required
                    value={formData.endDate}
                    onChange={(e) => setFormData({ ...formData, endDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              {/* Monthly Cycle, Grace Days, Grace Period */}
              <div className="p-2.5 bg-amber-50/50 rounded-lg border border-amber-200/60 space-y-2">
                <span className="font-bold text-amber-950 text-[11px] block">
                  Cycle &amp; Grace Days (chitfund.txt):
                </span>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Starting Date of Month *
                    </label>
                    <select
                      value={formData.monthlyStartingDate}
                      onChange={(e) => setFormData({ ...formData, monthlyStartingDate: parseInt(e.target.value, 10) })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                    >
                      {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 15, 20, 25].map((d) => (
                        <option key={d} value={d}>
                          {d}th of every month
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Grace Days *
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="30"
                      required
                      value={formData.graceDays}
                      onChange={(e) => setFormData({ ...formData, graceDays: e.target.value })}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Grace Period Terms &amp; Policy *
                  </label>
                  <textarea
                    rows="2"
                    required
                    value={formData.gracePeriod}
                    onChange={(e) => setFormData({ ...formData, gracePeriod: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                    placeholder="Grace period and late penalty terms..."
                  />
                </div>
              </div>

              {/* Commission Percentage */}
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Foreman Commission (%):</label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.1"
                  value={formData.foremanCommissionPercentage}
                  onChange={(e) => setFormData({ ...formData, foremanCommissionPercentage: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                />
              </div>

              {/* Modal Footer */}
              <div className="pt-2 border-t border-slate-200 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-2xs"
                >
                  Create Scheme
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLL MEMBER MODAL (Compact) */}
      {isEnrollModalOpen && selectedChitForEnroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">Enroll Chit Person</h3>
              <button
                onClick={() => setIsEnrollModalOpen(false)}
                className="text-slate-400 hover:text-slate-700"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEnrollSubmit} className="p-4 space-y-2.5 text-xs">
              <div>
                <span className="text-slate-400 text-[10px] block">Target Chit:</span>
                <span className="font-bold text-slate-900 text-xs">{selectedChitForEnroll.title}</span>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Select Person (Member) *</label>
                <select
                  required
                  value={enrollMemberId}
                  onChange={(e) => setEnrollMemberId(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                >
                  <option value="">-- Choose Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.phone || 'No Phone'})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">
                  Seat Number (1 to {selectedChitForEnroll.maxMembers})
                </label>
                <input
                  type="number"
                  min="1"
                  max={selectedChitForEnroll.maxMembers}
                  placeholder="Auto-assign next seat"
                  value={ticketNumber}
                  onChange={(e) => setTicketNumber(e.target.value)}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                />
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsEnrollModalOpen(false)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700"
                >
                  Confirm Enrollment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ChitsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <ChitsContent />
    </Suspense>
  );
}
