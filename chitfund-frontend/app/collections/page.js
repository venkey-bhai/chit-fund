'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { 
  getCollections, 
  createCollection, 
  deleteCollection, 
  getChitGroups, 
  getMembers 
} from '@/lib/api';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils';
import { 
  ReceiptIndianRupee, 
  PlusCircle, 
  Search, 
  Calendar, 
  User, 
  CreditCard, 
  CheckCircle2, 
  Clock, 
  AlertTriangle, 
  Printer, 
  Trash2, 
  X,
  FileCheck
} from 'lucide-react';

function CollectionsContent() {
  const searchParams = useSearchParams();
  const [collections, setCollections] = useState([]);
  const [chitGroups, setChitGroups] = useState([]);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [searchTerm, setSearchTerm] = useState('');
  const [filterGroup, setFilterGroup] = useState(searchParams.get('chitGroupId') || '');

  // Form State with exact required fields from chitfund.txt:
  // collection date: with input field
  // chit date: with input field
  // chit person: with input field
  // amount: with input field
  const today = formatDateInput(new Date());
  const [formData, setFormData] = useState({
    chitGroupId: searchParams.get('chitGroupId') || '',
    memberId: '',
    collectionDate: today, // collection date: with input field
    chitDate: today,       // chit date: with input field
    chitPerson: '',        // chit person: with input field
    amount: '',            // amount: with input field
    paymentMode: 'Cash',
    referenceNumber: '',
    remarks: '',
  });

  const [formError, setFormError] = useState('');
  const [successReceipt, setSuccessReceipt] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedReceipt, setSelectedReceipt] = useState(null);

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    try {
      const [colls, groups, mems] = await Promise.all([
        getCollections(),
        getChitGroups(),
        getMembers(),
      ]);
      setCollections(Array.isArray(colls) ? colls : []);
      setChitGroups(Array.isArray(groups) ? groups : []);
      setMembers(Array.isArray(mems) ? mems : []);

      // If URL had chitGroupId, pre-fill
      const paramChitId = searchParams.get('chitGroupId');
      if (paramChitId && Array.isArray(groups)) {
        const found = groups.find((g) => g.id.toString() === paramChitId);
        if (found) {
          setFormData((prev) => ({
            ...prev,
            chitGroupId: found.id.toString(),
            amount: found.monthlyInstallment || '',
          }));
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function handleGroupSelect(groupId) {
    const found = chitGroups.find((g) => g.id.toString() === groupId);
    setFormData((prev) => ({
      ...prev,
      chitGroupId: groupId,
      amount: found ? found.monthlyInstallment : prev.amount,
    }));
  }

  function handleMemberSelect(memberId) {
    const found = members.find((m) => m.id.toString() === memberId);
    if (found) {
      setFormData((prev) => ({
        ...prev,
        memberId: memberId,
        chitPerson: found.fullName,
      }));
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    setSuccessReceipt(null);

    if (!formData.collectionDate) {
      setFormError('Please enter the Collection Date.');
      return;
    }
    if (!formData.chitDate) {
      setFormError('Please enter the Chit Date.');
      return;
    }
    if (!formData.chitPerson) {
      setFormError('Please enter the Chit Person name.');
      return;
    }
    if (!formData.amount || parseFloat(formData.amount) <= 0) {
      setFormError('Please enter a valid payment Amount.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        chitGroupId: formData.chitGroupId ? parseInt(formData.chitGroupId, 10) : 0,
        memberId: formData.memberId ? parseInt(formData.memberId, 10) : null,
        collectionDate: new Date(formData.collectionDate).toISOString(),
        chitDate: new Date(formData.chitDate).toISOString(),
        chitPerson: formData.chitPerson.trim(),
        amount: parseFloat(formData.amount),
        paymentMode: formData.paymentMode,
        referenceNumber: formData.referenceNumber?.trim() || null,
        remarks: formData.remarks?.trim() || null,
      };

      const result = await createCollection(payload);
      setSuccessReceipt(result);
      setSelectedReceipt(result);

      // Reset form amounts
      setFormData((prev) => ({
        ...prev,
        amount: '',
        referenceNumber: '',
        remarks: '',
      }));

      // Reload collections table
      const updated = await getCollections();
      setCollections(Array.isArray(updated) ? updated : []);
    } catch (err) {
      setFormError(err.message || 'Error recording payment collection');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this payment record? This will adjust the scheme collection totals.')) {
      return;
    }
    try {
      await deleteCollection(id);
      const updated = await getCollections();
      setCollections(Array.isArray(updated) ? updated : []);
    } catch (err) {
      alert(err.message || 'Error deleting collection record');
    }
  }

  // Filter collections
  const filteredCollections = collections.filter((c) => {
    const matchesSearch =
      c.chitPerson?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.receiptNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      c.chitGroupTitle?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesGroup = !filterGroup || c.chitGroupId?.toString() === filterGroup;
    return matchesSearch && matchesGroup;
  });

  return (
    <div className="space-y-2.5">
      {/* Grid: Form on Left/Top + Collections History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* PAYMENT ENTRY FORM (Specified in chitfund.txt) */}
        <div className="bg-white rounded-lg border border-slate-200 shadow-2xs p-3 space-y-2.5">
          <div className="border-b border-slate-100 pb-2">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <ReceiptIndianRupee className="w-4 h-4 text-indigo-600" />
              <span>Record Payment Entry</span>
            </h2>
          </div>

          <form onSubmit={handleSubmit} className="space-y-2 text-xs">
            {formError && (
              <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                {formError}
              </div>
            )}

            {/* Chit Scheme Selector */}
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">
                Select Chit Scheme *
              </label>
              <select
                required
                value={formData.chitGroupId}
                onChange={(e) => handleGroupSelect(e.target.value)}
                className="w-full px-2.5 py-1.5 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-xs"
              >
                <option value="">-- Choose Chit Scheme --</option>
                {chitGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title} ({formatCurrency(g.totalAmount)})
                  </option>
                ))}
              </select>
            </div>

            {/* FIELD 1: collection date: with input field */}
            <div className="p-2 bg-indigo-50/50 rounded-md border border-indigo-100 space-y-0.5">
              <label className="block font-bold text-indigo-950 text-[11px]">
                Collection Date: with input field *
              </label>
              <input
                type="date"
                required
                value={formData.collectionDate}
                onChange={(e) => setFormData({ ...formData, collectionDate: e.target.value })}
                className="w-full px-2.5 py-1 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900 text-xs"
              />
            </div>

            {/* FIELD 2: chit date: with input field */}
            <div className="p-2 bg-indigo-50/50 rounded-md border border-indigo-100 space-y-0.5">
              <label className="block font-bold text-indigo-950 text-[11px]">
                Chit Date: with input field *
              </label>
              <input
                type="date"
                required
                value={formData.chitDate}
                onChange={(e) => setFormData({ ...formData, chitDate: e.target.value })}
                className="w-full px-2.5 py-1 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-medium text-slate-900 text-xs"
              />
            </div>

            {/* FIELD 3: chit person: with input field */}
            <div className="p-2 bg-indigo-50/50 rounded-md border border-indigo-100 space-y-1">
              <label className="block font-bold text-indigo-950 text-[11px]">
                Chit Person: with input field *
              </label>
              
              {members.length > 0 && (
                <select
                  value={formData.memberId}
                  onChange={(e) => handleMemberSelect(e.target.value)}
                  className="w-full px-2 py-1 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-[11px] mb-1"
                >
                  <option value="">-- Pick Enrolled Member --</option>
                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.fullName} ({m.phone})
                    </option>
                  ))}
                </select>
              )}

              <input
                type="text"
                required
                placeholder="Full name of Chit Person"
                value={formData.chitPerson}
                onChange={(e) => setFormData({ ...formData, chitPerson: e.target.value })}
                className="w-full px-2.5 py-1 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900 text-xs"
              />
            </div>

            {/* FIELD 4: amount: with input field */}
            <div className="p-2 bg-indigo-50/50 rounded-md border border-indigo-100 space-y-0.5">
              <label className="block font-bold text-indigo-950 text-[11px]">
                Amount: with input field (₹) *
              </label>
              <input
                type="number"
                min="1"
                step="0.01"
                required
                placeholder="Installment amount in ₹"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full px-2.5 py-1 rounded border border-slate-300 bg-white focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-bold text-sm text-slate-900"
              />
              {formData.amount && (
                <span className="text-[10px] font-semibold text-emerald-700 block">
                  {formatCurrency(formData.amount)}
                </span>
              )}
            </div>

            {/* Payment Mode & Reference */}
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Payment Mode</label>
                <select
                  value={formData.paymentMode}
                  onChange={(e) => setFormData({ ...formData, paymentMode: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                >
                  <option value="Cash">Cash</option>
                  <option value="UPI">UPI</option>
                  <option value="Bank Transfer">Bank Transfer</option>
                  <option value="Cheque">Cheque</option>
                  <option value="Card">Card</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Ref / Cheque #</label>
                <input
                  type="text"
                  placeholder="Txn ID"
                  value={formData.referenceNumber}
                  onChange={(e) => setFormData({ ...formData, referenceNumber: e.target.value })}
                  className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
                />
              </div>
            </div>

            {/* Remarks */}
            <div>
              <label className="block font-semibold text-slate-700 mb-0.5">Remarks / Notes</label>
              <input
                type="text"
                placeholder="e.g. Month 2 installment"
                value={formData.remarks}
                onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
                className="w-full px-2 py-1 rounded border border-slate-300 bg-white text-xs"
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs transition-colors shadow-2xs disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>{isSubmitting ? 'Recording...' : 'Record Payment & Receipt'}</span>
            </button>
          </form>
        </div>

        {/* COLLECTIONS LEDGER & TABLE (Right 2 cols) */}
        <div className="lg:col-span-2 space-y-2.5">
          {/* Filter Bar */}
          <div className="bg-white rounded-lg border border-slate-200 p-2 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2">
            <div className="relative flex-1 w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
              <input
                type="text"
                placeholder="Search person, receipt #, scheme..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div className="w-full sm:w-auto">
              <select
                value={filterGroup}
                onChange={(e) => setFilterGroup(e.target.value)}
                className="w-full sm:w-auto px-2.5 py-1.5 rounded border border-slate-200 text-xs bg-white font-medium"
              >
                <option value="">All Chit Schemes</option>
                {chitGroups.map((g) => (
                  <option key={g.id} value={g.id}>
                    {g.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Table with Stable Headers */}
          <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-auto max-h-[calc(100vh-175px)]">
              <table className="w-full text-left border-collapse text-xs">
                <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                  <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Receipt #</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Collection Date</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Chit Date</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Chit Person</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Chit Scheme</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Amount</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Mode</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Status</th>
                    <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 text-center">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-slate-700">
                  {loading ? (
                    <tr>
                      <td colSpan="9" className="py-6 text-center">
                        <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                      </td>
                    </tr>
                  ) : filteredCollections.length === 0 ? (
                    <tr>
                      <td colSpan="9" className="py-6 text-center text-slate-400 text-xs">
                        No collection payments recorded yet. Use the form on the left to add one.
                      </td>
                    </tr>
                  ) : (
                    filteredCollections.map((c) => (
                      <tr key={c.id} className="hover:bg-slate-50 transition-colors">
                        <td className="py-2 px-2.5 font-mono font-bold text-indigo-700 text-xs">
                          {c.receiptNumber}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap font-medium text-slate-900 text-xs">
                          {formatDate(c.collectionDate)}
                        </td>
                        <td className="py-2 px-2.5 whitespace-nowrap text-slate-600 text-xs">
                          {formatDate(c.chitDate)}
                        </td>
                        <td className="py-2 px-2.5 font-semibold text-slate-900 text-xs">
                          {c.chitPerson}
                        </td>
                        <td className="py-2 px-2.5 text-slate-600 max-w-[140px] truncate text-xs" title={c.chitGroupTitle}>
                          {c.chitGroupTitle}
                        </td>
                        <td className="py-2 px-2.5 font-bold text-emerald-600 whitespace-nowrap text-xs">
                          {formatCurrency(c.amount)}
                        </td>
                        <td className="py-2 px-2.5 text-xs">
                          <span className="px-1.5 py-0.2 rounded bg-slate-100 text-slate-700 font-medium text-[10px]">
                            {c.paymentMode}
                          </span>
                        </td>
                        <td className="py-2 px-2.5">
                          <span className={`inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                            c.status === 'On-Time' || c.status === 'Verified'
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                              : c.status === 'Within Grace'
                              ? 'bg-blue-50 text-blue-700 border border-blue-200'
                              : 'bg-rose-50 text-rose-700 border border-rose-200'
                          }`}>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-2 px-2.5 text-center whitespace-nowrap">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              onClick={() => setSelectedReceipt(c)}
                              className="p-1 rounded text-slate-500 hover:text-indigo-600 hover:bg-indigo-50"
                              title="Print Receipt"
                            >
                              <Printer className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => handleDelete(c.id)}
                              className="p-1 rounded text-slate-400 hover:text-rose-600 hover:bg-rose-50"
                              title="Delete Record"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* RECEIPT PREVIEW MODAL (Compact) */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="p-4 bg-slate-900 text-white text-center relative">
              <button
                onClick={() => setSelectedReceipt(null)}
                className="absolute top-3 right-3 text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
              <h3 className="font-bold text-sm">Payment Receipt</h3>
              <p className="text-[10px] text-slate-300 font-mono mt-0.5">
                Receipt #{selectedReceipt.receiptNumber}
              </p>
            </div>

            <div className="p-4 space-y-3 text-xs">
              <div className="bg-slate-50 p-3 rounded-lg border border-slate-100 space-y-1.5 text-xs">
                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Chit Person:</span>
                  <strong className="text-slate-900">{selectedReceipt.chitPerson}</strong>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Chit Scheme:</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.chitGroupTitle}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Collection Date:</span>
                  <span className="font-medium text-slate-800">{formatDate(selectedReceipt.collectionDate)}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Chit Due Date:</span>
                  <span className="font-medium text-slate-800">{formatDate(selectedReceipt.chitDate)}</span>
                </div>

                <div className="flex justify-between border-b border-slate-200/60 pb-1">
                  <span className="text-slate-500">Payment Mode:</span>
                  <span className="font-semibold text-slate-800">{selectedReceipt.paymentMode}</span>
                </div>

                <div className="flex justify-between pt-1">
                  <span className="text-slate-700 font-bold">Amount Paid:</span>
                  <strong className="text-emerald-600 text-sm font-extrabold">
                    {formatCurrency(selectedReceipt.amount)}
                  </strong>
                </div>
              </div>

              <div className="pt-1 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-3 py-1 rounded bg-slate-900 text-white font-semibold text-xs hover:bg-slate-800 flex items-center gap-1"
                >
                  <Printer className="w-3 h-3" />
                  <span>Print</span>
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedReceipt(null)}
                  className="px-3 py-1 rounded bg-slate-100 text-slate-700 text-xs font-medium hover:bg-slate-200"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CollectionsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <CollectionsContent />
    </Suspense>
  );
}
