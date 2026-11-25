'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { 
  getChitGroups, 
  createChitGroup, 
  updateChitGroup,
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
  Pencil,
  UserPlus, 
  X, 
  CheckCircle2, 
  Clock, 
  Calendar,
  AlertCircle
} from 'lucide-react';
import DateInput from '@/components/DateInput';

function ChitsContent() {
  const searchParams = useSearchParams();
  const [chits, setChits] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
  const [selectedChitForEnroll, setSelectedChitForEnroll] = useState(null);
  const [enrollMemberId, setEnrollMemberId] = useState('');
  const [enrollError, setEnrollError] = useState('');
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');
  const [formError, setFormError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const today = new Date();
  const [formData, setFormData] = useState({
    title: '',
    groupCode: '',
    totalAmount: 0,
    durationYears: 0,
    numberOfMonths: 0,
    numberOfMembers: 0,
    maxMembers: 0,
    startDate: formatDateInput(today),
    endDate: formatDateInput(new Date(today.getFullYear(), today.getMonth() + 11, today.getDate())),
    monthlyStartingDate: 5,
    graceDays: 5,
    
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

  function handleMonthsChange(monthsVal) {
    // Free typing: allow clearing the box; otherwise any whole number of months >= 1
    if (monthsVal === '') {
      setFormData((prev) => ({ ...prev, numberOfMonths: 0, durationYears: 0, numberOfMembers: 0, maxMembers: 0 }));
      return;
    }
    const m = parseInt(monthsVal, 10);
    if (isNaN(m) || m < 1) return;
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

  function openEdit(c) {
    setEditError('');
    setEditForm({
      id: c.id,
      title: c.title || '',
      groupCode: c.groupCode || '',
      maxMembers: c.maxMembers,
      enrolledCount: c.enrolledCount || 0,
      graceDays: c.graceDays,
      gracePeriod: c.gracePeriod || '',
      foremanCommissionPercentage: c.foremanCommissionPercentage,
      status: c.status || 'Active',
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setEditError('');
    try {
      const max = parseInt(editForm.maxMembers, 10);
      await updateChitGroup(editForm.id, {
        groupName: editForm.title.trim(),
        groupCode: editForm.groupCode?.trim() || null,
        maxMembers: max,
        totalMembers: max,
        graceDays: parseInt(editForm.graceDays, 10),
        gracePeriod: editForm.gracePeriod,
        foremanCommissionPercentage: Number(editForm.foremanCommissionPercentage),
        status: editForm.status,
      });
      setEditForm(null);
      setSuccessMessage('Chit Scheme updated successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadData();
    } catch (err) {
      setEditError(err.message || 'Error updating Chit Scheme');
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
    setEnrollError('');
    if (!enrollMemberId) {
      setEnrollError('Please select a member.');
      return;
    }
    const total = selectedChitForEnroll.maxMembers || 0;
    if ((selectedChitForEnroll.takenTickets || []).length >= total) {
      setEnrollError(`You cannot add more than ${total} members. All seats are filled.`);
      return;
    }
    try {
      // ticketNumber 0 = server auto-assigns the next free seat
      await enrollMemberInGroup(selectedChitForEnroll.id, {
        customerId: parseInt(enrollMemberId, 10),
        ticketNumber: 0,
      });
      setIsEnrollModalOpen(false);
      setEnrollMemberId('');
      setSuccessMessage('Member enrolled successfully!');
      setTimeout(() => setSuccessMessage(''), 4000);
      loadData();
    } catch (err) {
      setEnrollError(err.message || 'Failed to enroll member');
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
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
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="bg-slate-100">
                <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-2.5 whitespace-nowrap">Code</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Scheme Title</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Chit Value</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Installment</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Duration</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Seats (Filled / Max)</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Start Date</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">End Date</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Monthly Due</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Grace</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Collected</th>
                  <th className="py-2 px-2.5 whitespace-nowrap">Status</th>
                  <th className="sticky right-0 z-10 bg-slate-100 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)] py-2 px-2.5 text-center whitespace-nowrap">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {chits.map((c) => (
                  <tr key={c.id} className="group hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                        {c.groupCode}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap">{c.title}</td>
                    <td className="py-2 px-2.5 font-bold text-slate-900 whitespace-nowrap">{formatCurrency(c.totalAmount)}</td>
                    <td className="py-2 px-2.5 font-bold text-indigo-600 whitespace-nowrap">{formatCurrency(c.monthlyInstallment)}</td>
                    <td className="py-2 px-2.5 whitespace-nowrap">{c.durationYears} Yrs ({c.numberOfMonths} M)</td>
                    <td className="py-2 px-2.5 font-semibold whitespace-nowrap">
                      {c.enrolledCount || 0} / {c.maxMembers}
                      <span className="text-emerald-700 text-[10px] ml-1">
                        ({Math.max(0, (c.maxMembers || 0) - (c.enrolledCount || 0))} left)
                      </span>
                    </td>
                    <td className="py-2 px-2.5 whitespace-nowrap">{formatDate(c.startDate)}</td>
                    <td className="py-2 px-2.5 whitespace-nowrap">{formatDate(c.endDate)}</td>
                    <td className="py-2 px-2.5 whitespace-nowrap">Every {c.monthlyStartingDate}th</td>
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                        {c.graceDays} Days
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-bold text-emerald-600 whitespace-nowrap">{formatCurrency(c.totalCollected || 0)}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {c.status}
                      </span>
                    </td>
                    <td className="sticky right-0 z-10 bg-white group-hover:bg-slate-50 shadow-[-4px_0_6px_-4px_rgba(0,0,0,0.15)] py-2 px-2.5 whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1">
                        <button
                          onClick={() => {
                            setSelectedChitForEnroll(c);
                            setEnrollError('');
                            setIsEnrollModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Enroll Person"
                        >
                          <UserPlus className="w-3.5 h-3.5" />
                        </button>
                        {/* <Link
                          href={`/chits/${c.id}`}
                          className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                          title="Schedules Table"
                        >
                          <CalendarClock className="w-3.5 h-3.5" />
                        </Link> */}
                        <button
                          onClick={() => openEdit(c)}
                          className="p-1 rounded text-slate-500 hover:text-blue-600 hover:bg-blue-50"
                          title="Edit Chit Scheme"
                        >
                          <Pencil className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(c.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-600 hover:bg-rose-50"
                          title="Delete Chit Scheme"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
                {/* <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Group Code (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. CF-2026-D24"
                    value={formData.groupCode}
                    onChange={(e) => setFormData({ ...formData, groupCode: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 uppercase font-mono text-xs"
                  />
                </div> */}
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
              </div>

              

              {/* Duration: Choose how many years of chit & Number of Months */}
              <div className="p-2.5 bg-indigo-50/50 rounded-lg border border-indigo-100 space-y-2">
                <span className="font-bold text-indigo-950 text-[11px] block">
                  Duration &amp; Term Configuration:
                </span>
                
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">
                      Choose How Many Months of Chit: *
                    </label>
                    <input
                      type="number"
                      required
                      min="1"
                      step="1"
                      placeholder="e.g. 12"
                      value={formData.numberOfMonths || ''}
                      onChange={(e) => handleMonthsChange(e.target.value)}
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-slate-700 mb-0.5">No. of Members: *</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={formData.numberOfMembers}
                      onChange={(e) =>
                        setFormData({ ...formData, numberOfMembers: e.target.value, maxMembers: e.target.value })
                      }
                      className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Start Date & End Date */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    Start Date (dd/mm/yyyy) *
                  </label>
                  <DateInput
                    required
                    value={formData.startDate}
                    onChange={(e) => handleStartDateChange(e.target.value)}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">
                    End Date (dd/mm/yyyy) *
                  </label>
                  <DateInput
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
                  Cycle &amp; Grace Days :
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

                {/* <div>
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
                </div> */}
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
                  Create Chit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CHIT SCHEME MODAL */}
      {editForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden my-4">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">Edit Chit Scheme &bull; {editForm.groupCode}</h3>
              <button onClick={() => setEditForm(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>
            <form onSubmit={handleEditSubmit} className="p-4 space-y-2.5 text-xs">
              {editError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5 text-rose-600 shrink-0" />
                  <span>{editError}</span>
                </div>
              )}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Scheme Title *</label>
                  <input
                    type="text"
                    required
                    value={editForm.title}
                    onChange={(e) => setEditForm({ ...editForm, title: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Group Code</label>
                  <input
                    type="text"
                    value={editForm.groupCode}
                    onChange={(e) => setEditForm({ ...editForm, groupCode: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs uppercase font-mono"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">No. of Members *</label>
                  <input
                    type="number"
                    min={editForm.enrolledCount || 1}
                    required
                    value={editForm.maxMembers}
                    onChange={(e) => setEditForm({ ...editForm, maxMembers: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                  <span className="text-[10px] text-slate-400">{editForm.enrolledCount || 0} already enrolled</span>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Grace Days *</label>
                  <input
                    type="number"
                    min="0"
                    max="30"
                    required
                    value={editForm.graceDays}
                    onChange={(e) => setEditForm({ ...editForm, graceDays: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Foreman Commission (%)</label>
                  <input
                    type="number"
                    min="0"
                    max="10"
                    step="0.1"
                    value={editForm.foremanCommissionPercentage}
                    onChange={(e) => setEditForm({ ...editForm, foremanCommissionPercentage: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Status</label>
                  <select
                    value={editForm.status}
                    onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs bg-white"
                  >
                    <option value="Active">Active</option>
                    <option value="Closed">Closed</option>
                    <option value="Inactive">Inactive</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Grace Period Terms &amp; Policy</label>
                <textarea
                  rows="2"
                  value={editForm.gracePeriod}
                  onChange={(e) => setEditForm({ ...editForm, gracePeriod: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                />
              </div>
              <p className="text-[10px] text-slate-400">
                Chit value, duration and dates can&apos;t be edited because installments are already generated from them.
              </p>
              <div className="pt-2 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setEditForm(null)}
                  className="px-3 py-1.5 rounded text-slate-600 hover:bg-slate-100 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1.5 rounded bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ENROLL MEMBER MODAL (Compact) */}
      {isEnrollModalOpen && selectedChitForEnroll && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
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

              {(() => {
                const total = selectedChitForEnroll.maxMembers || 0;
                const taken = selectedChitForEnroll.takenTickets || [];
                const remaining = Math.max(0, total - taken.length);
                return (
                  <div className="grid grid-cols-3 gap-1.5 text-center">
                    <div className="p-1.5 rounded border border-slate-200 bg-slate-50">
                      <div className="text-[10px] text-slate-500 font-semibold uppercase">Total Seats</div>
                      <div className="text-sm font-bold text-slate-900">{total}</div>
                    </div>
                    <div className="p-1.5 rounded border border-indigo-200 bg-indigo-50">
                      <div className="text-[10px] text-indigo-600 font-semibold uppercase">Filled</div>
                      <div className="text-sm font-bold text-indigo-700">{taken.length}</div>
                    </div>
                    <div className={`p-1.5 rounded border ${remaining === 0 ? 'border-rose-200 bg-rose-50' : 'border-emerald-200 bg-emerald-50'}`}>
                      <div className={`text-[10px] font-semibold uppercase ${remaining === 0 ? 'text-rose-600' : 'text-emerald-600'}`}>Remaining</div>
                      <div className={`text-sm font-bold ${remaining === 0 ? 'text-rose-700' : 'text-emerald-700'}`}>{remaining}</div>
                    </div>
                  </div>
                );
              })()}

              {enrollError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs font-medium">
                  {enrollError}
                </div>
              )}

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
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 disabled:opacity-50"
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
