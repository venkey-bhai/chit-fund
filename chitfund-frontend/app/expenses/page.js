'use client';

import { useState, useEffect, Suspense } from 'react';
import { getExpenses, createExpense, deleteExpense } from '@/lib/api';
import { formatCurrency, formatDate, formatDateInput } from '@/lib/utils';
import { PlusCircle, Trash2, X } from 'lucide-react';
import DateInput from '@/components/DateInput';

function ExpensesContent() {
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState('');

  const [formData, setFormData] = useState({
    category: 'Rent',
    description: '',
    amount: '',
    expenseDate: formatDateInput(new Date()),
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadExpenses();
  }, [categoryFilter]);

  async function loadExpenses() {
    setLoading(true);
    try {
      const data = await getExpenses(categoryFilter);
      setExpenses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Error loading expenses:', err);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    const amt = parseFloat(formData.amount);
    if (isNaN(amt) || amt <= 0) {
      setFormError('Amount must be greater than 0');
      return;
    }
    if (!formData.description.trim()) {
      setFormError('Description is required');
      return;
    }

    try {
      await createExpense({
        category: formData.category,
        description: formData.description.trim(),
        amount: amt,
        expenseDate: new Date(formData.expenseDate).toISOString(),
      });
      setIsAddOpen(false);
      setFormData({
        category: 'Rent',
        description: '',
        amount: '',
        expenseDate: formatDateInput(new Date()),
      });
      loadExpenses();
    } catch (err) {
      setFormError(err.message || 'Error recording expense');
    }
  }

  async function handleDelete(id) {
    if (!confirm('Are you sure you want to delete this expense record?')) return;
    try {
      await deleteExpense(id);
      loadExpenses();
    } catch (err) {
      alert(err.message || 'Error deleting expense');
    }
  }

  const totalExpense = expenses.reduce((acc, e) => acc + (e.amount || 0), 0);

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5">
      {/* Summary Row & Actions (Page Heading Removed) */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-semibold text-slate-500 uppercase">Total Expenses</span>
            <div className="text-sm font-bold text-slate-900 mt-0.5">{formatCurrency(totalExpense)}</div>
          </div>
          <button
            onClick={() => setIsAddOpen(true)}
            className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-2.5 py-1 rounded transition-all shadow-2xs"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            <span>Record Expense</span>
          </button>
        </div>

        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Recorded Items</span>
          <div className="text-sm font-bold text-indigo-600 mt-0.5">{expenses.length} Records</div>
        </div>

        <div className="bg-white rounded-lg p-2.5 border border-slate-200 shadow-2xs flex items-center justify-between">
          <span className="text-[10px] font-semibold text-slate-500 uppercase">Category:</span>
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2 py-1 rounded border border-slate-300 text-xs font-medium"
          >
            <option value="">All Categories</option>
            <option value="Rent">Rent</option>
            <option value="Salaries">Salaries</option>
            <option value="Legal & Filing">Legal &amp; Filing</option>
            <option value="Utilities">Utilities</option>
            <option value="Office Supplies">Office Supplies</option>
          </select>
        </div>
      </div>

      {/* Expenses Table with Sticky Headers */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Date</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Category</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Description</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Amount</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Status</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5 text-center">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : expenses.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-6 text-center text-slate-400 text-xs">
                    No expense records found.
                  </td>
                </tr>
              ) : (
                expenses.map((e) => (
                  <tr key={e.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2.5 font-medium text-slate-900 text-xs">{formatDate(e.expenseDate)}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.2 rounded bg-slate-100 font-semibold text-slate-700 text-[10px]">
                        {e.category}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-slate-700 text-xs">{e.description}</td>
                    <td className="py-2 px-2.5 font-bold text-rose-600 text-xs">{formatCurrency(e.amount)}</td>
                    <td className="py-2 px-2.5">
                      <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {e.status}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 text-center">
                      <button
                        onClick={() => handleDelete(e.id)}
                        className="p-1 text-slate-400 hover:text-rose-600"
                        title="Delete Expense"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ADD EXPENSE MODAL (Compact) */}
      {isAddOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-sm w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">Record Company Expense</h3>
              <button onClick={() => setIsAddOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-4 space-y-2.5 text-xs">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Category *</label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                >
                  <option value="Rent">Rent</option>
                  <option value="Salaries">Staff Salaries</option>
                  <option value="Legal & Filing">Legal &amp; Regulatory Filing</option>
                  <option value="Utilities">Utilities &amp; Internet</option>
                  <option value="Office Supplies">Printing &amp; Office Supplies</option>
                  <option value="Tea & Refreshments">Tea &amp; Refreshments</option>
                  <option value="Other">Other Operational</option>
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Description *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Office rent Anna Salai"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Amount (₹) *</label>
                  <input
                    type="number"
                    min="1"
                    step="0.01"
                    required
                    placeholder="5000"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 font-bold text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Expense Date *</label>
                  <DateInput
                    required
                    value={formData.expenseDate}
                    onChange={(e) => setFormData({ ...formData, expenseDate: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-2xs"
                >
                  Save Expense
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function ExpensesPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <ExpensesContent />
    </Suspense>
  );
}
