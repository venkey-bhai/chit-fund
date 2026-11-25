'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
  getCustomers, 
  createCustomer, 
  setCustomerStatus,
  updateCustomer,
  deleteCustomer
} from '@/lib/api';
import { formatCurrency } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  ShieldCheck, 
  Pencil,
  Trash2,
  BookOpen,
  X
} from 'lucide-react';

// Mobile: exactly 10 digits. Aadhaar/PAN: letters and digits only.
const cleanMobile = (v) => v.replace(/\D/g, '').slice(0, 10);
const cleanIdNumber = (v) => v.replace(/[^a-zA-Z0-9]/g, '');

function validateIdentity({ mobile, aadhaarOrPan }) {
  if (!/^\d{10}$/.test(mobile)) return 'Mobile number must be exactly 10 digits.';
  if (aadhaarOrPan && !/^[a-zA-Z0-9]+$/.test(aadhaarOrPan)) {
    return 'Aadhaar / PAN can contain only letters and digits.';
  }
  return '';
}

function CustomersContent() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [activeOnly, setActiveOnly] = useState(false);
  const [editCustomer, setEditCustomer] = useState(null);
  const [editForm, setEditForm] = useState(null);
  const [editError, setEditError] = useState('');

  // Form State
  const [formData, setFormData] = useState({
    fullName: '',
    mobile: '',
    email: '',
    aadhaarOrPan: '',
    address: '',
    nomineeName: '',
    nomineeRelation: '',
  });
  const [formError, setFormError] = useState('');

  useEffect(() => {
    loadCustomers();
  }, []);

  async function loadCustomers() {
    setLoading(true);
    try {
      const data = await getCustomers(searchTerm);
      setCustomers(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddSubmit(e) {
    e.preventDefault();
    setFormError('');
    try {
      if (!formData.fullName || !formData.mobile) {
        setFormError('Name and Mobile number are required.');
        return;
      }
      const validationError = validateIdentity(formData);
      if (validationError) {
        setFormError(validationError);
        return;
      }
      await createCustomer(formData);
      setIsAddModalOpen(false);
      setFormData({
        fullName: '',
        mobile: '',
        email: '',
        aadhaarOrPan: '',
        address: '',
        nomineeName: '',
        nomineeRelation: '',
      });
      loadCustomers();
    } catch (err) {
      setFormError(err.message || 'Error registering customer.');
    }
  }

  const visibleCustomers = activeOnly
    ? customers.filter((c) => c.status !== 'Deactivated')
    : customers;

  function openEdit(c) {
    setEditCustomer(c);
    setEditError('');
    setEditForm({
      fullName: c.fullName || '',
      mobile: c.mobile || c.phone || '',
      email: c.email || '',
      aadhaarOrPan: c.aadhaarOrPan || '',
      address: c.address || '',
      nomineeName: c.nomineeName || '',
      nomineeRelation: c.nomineeRelation || '',
      isActive: c.status !== 'Deactivated',
    });
  }

  async function handleEditSubmit(e) {
    e.preventDefault();
    setEditError('');
    if (!editForm.fullName.trim() || !editForm.mobile.trim()) {
      setEditError('Name and Mobile number are required.');
      return;
    }
    const validationError = validateIdentity(editForm);
    if (validationError) {
      setEditError(validationError);
      return;
    }
    try {
      const { isActive, ...details } = editForm;
      await updateCustomer(editCustomer.id, details);
      if (isActive !== (editCustomer.status !== 'Deactivated')) {
        await setCustomerStatus(editCustomer.id, isActive);
      }
      setEditCustomer(null);
      loadCustomers();
    } catch (err) {
      setEditError(err.message || 'Error updating customer.');
    }
  }

  async function handleDelete(c) {
    if (!confirm(`Delete ${c.fullName}? This cannot be undone.`)) return;
    try {
      await deleteCustomer(c.id);
      loadCustomers();
    } catch (err) {
      alert(err.message || 'Error deleting customer.');
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 gap-3">
      {/* Compact Top Action & Search Bar (Page Heading Removed) */}
      <div className="bg-white rounded-lg border border-slate-200 p-2.5 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-2.5">
        <div className="relative flex-1 w-full">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search code (e.g. CUS-0001), name, mobile, PAN..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && loadCustomers()}
            className="w-full pl-8 pr-3 py-1.5 rounded-md border border-slate-200 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
          <button
            onClick={loadCustomers}
            className="px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-md transition-colors"
          >
            Search
          </button>
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-md transition-colors shadow-2xs whitespace-nowrap"
          >
            <UserPlus className="w-3.5 h-3.5" />
            <span>Register Customer</span>
          </button>
        </div>
      </div>

      {/* Customers Table with Sticky/Stable Headers */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Code</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Full Name</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Mobile &amp; Email</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">KYC Status</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Enrolled</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Total Paid</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3 text-center">
                  <div className="flex items-center justify-center gap-1.5">
                    <span>Actions</span>
                    <input
                      type="checkbox"
                      checked={activeOnly}
                      onChange={(e) => setActiveOnly(e.target.checked)}
                      className="w-3.5 h-3.5 accent-emerald-600 cursor-pointer"
                      title={activeOnly ? 'Showing active customers only - untick to show all' : 'Showing all customers - tick to show active only'}
                      aria-label="Show active customers only"
                    />
                  </div>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : visibleCustomers.length === 0 ? (
                <tr>
                  <td colSpan="7" className="py-6 text-center text-slate-400 text-xs">
                    No customers found. Click &ldquo;Register Customer&rdquo; to add one.
                  </td>
                </tr>
              ) : (
                visibleCustomers.map((c) => (
                  <tr key={c.id} className={`hover:bg-slate-50 transition-colors ${c.status === 'Deactivated' ? 'opacity-50' : ''}`}>
                    <td className="py-2 px-3 font-mono font-bold text-indigo-700 text-xs">
                      {c.customerCode || `CUS-${c.id.toString().padStart(4, '0')}`}
                    </td>
                    <td className="py-2 px-3 font-bold text-slate-900 text-xs">
                      {c.fullName}
                    </td>
                    <td className="py-2 px-3">
                      <div className="space-y-0.5">
                        <div className="flex items-center gap-1 text-slate-700 font-medium text-xs">
                          <Phone className="w-2.5 h-2.5 text-slate-400" />
                          <span>{c.mobile || c.phone || 'N/A'}</span>
                        </div>
                        {/* {c.email && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                            <Mail className="w-2.5 h-2.5 text-slate-400" />
                            <span>{c.email}</span>
                          </div>
                        )} */}
                      </div>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1 w-max">
                        <ShieldCheck className="w-2.5 h-2.5" />
                        <span>{c.kycStatus || 'Verified'}</span>
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
                        {c.enrolledChitsCount} Schemes
                      </span>
                    </td>
                    <td className="py-2 px-3 font-bold text-emerald-600 text-xs">
                      {formatCurrency(c.totalPaid)}
                    </td>
                    <td className="py-2 px-3 text-center whitespace-nowrap">
                      <div className="flex items-center justify-center gap-1.5">
                        <button
                          onClick={() => openEdit(c)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-colors"
                          title="Edit Customer"
                        >
                          <Pencil className="w-3 h-3" />
                        </button>
                        <button
                          onClick={() => handleDelete(c)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 flex items-center gap-1 transition-colors"
                          title="Delete Customer"
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

      {/* REGISTER CUSTOMER MODAL */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">Register Customer</h3>
              <button onClick={() => setIsAddModalOpen(false)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleAddSubmit} className="p-4 space-y-2.5 text-xs">
              {formError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                  {formError}
                </div>
              )}

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Full Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Anand Kumar"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    placeholder=""
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: cleanMobile(e.target.value) })}
                    inputMode="numeric"
                    maxLength={10}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Aadhaar / PAN</label>
                  <input
                    type="text"
                    placeholder="ABCDP1234F"
                    value={formData.aadhaarOrPan}
                    onChange={(e) => setFormData({ ...formData, aadhaarOrPan: cleanIdNumber(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 uppercase font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Email Address</label>
                <input
                  type="email"
                  placeholder="anand@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Residential Address</label>
                <textarea
                  rows="2"
                  placeholder="Street, City, PIN"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Nominee Name</label>
                  <input
                    type="text"
                    placeholder="Nominee Name"
                    value={formData.nomineeName}
                    onChange={(e) => setFormData({ ...formData, nomineeName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Relationship</label>
                  <input
                    type="text"
                    placeholder="Spouse / Son"
                    value={formData.nomineeRelation}
                    onChange={(e) => setFormData({ ...formData, nomineeRelation: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex justify-end gap-1.5">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-2xs"
                >
                  Save Customer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* EDIT CUSTOMER MODAL */}
      {editCustomer && editForm && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3 overflow-y-auto">
          <div className="bg-white rounded-xl max-w-md w-full shadow-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3 border-b border-slate-200 flex items-center justify-between bg-slate-50">
              <h3 className="font-bold text-slate-900 text-xs">Edit Customer ({editCustomer.customerCode})</h3>
              <button onClick={() => setEditCustomer(null)} className="text-slate-400 hover:text-slate-700">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleEditSubmit} className="p-4 space-y-2.5 text-xs">
              {editError && (
                <div className="p-2 bg-rose-50 border border-rose-200 text-rose-800 rounded text-xs">
                  {editError}
                </div>
              )}

              <label className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 cursor-pointer">
                <input
                  type="checkbox"
                  checked={editForm.isActive}
                  onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                  className="w-4 h-4 accent-emerald-600 cursor-pointer"
                />
                <span className="font-semibold text-slate-700">
                  {editForm.isActive ? 'Active' : 'Deactivated'}
                </span>
              </label>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Full Name *</label>
                <input
                  type="text"
                  required
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-semibold text-slate-900 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Mobile Number *</label>
                  <input
                    type="text"
                    required
                    value={editForm.mobile}
                    onChange={(e) => setEditForm({ ...editForm, mobile: cleanMobile(e.target.value) })}
                    inputMode="numeric"
                    maxLength={10}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Aadhaar / PAN</label>
                  <input
                    type="text"
                    value={editForm.aadhaarOrPan}
                    onChange={(e) => setEditForm({ ...editForm, aadhaarOrPan: cleanIdNumber(e.target.value) })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 uppercase font-mono text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Email Address</label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-0.5">Residential Address</label>
                <textarea
                  rows="2"
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Nominee Name</label>
                  <input
                    type="text"
                    value={editForm.nomineeName}
                    onChange={(e) => setEditForm({ ...editForm, nomineeName: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Relationship</label>
                  <input
                    type="text"
                    value={editForm.nomineeRelation}
                    onChange={(e) => setEditForm({ ...editForm, nomineeRelation: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-slate-200 flex items-center justify-between gap-1.5">
                <button
                  type="button"
                  onClick={() => window.open(`/customers/passbook?id=${editCustomer.id}`, '_blank')}
                  className="flex items-center gap-1 px-2.5 py-1 rounded border border-indigo-200 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold"
                >
                  <BookOpen className="w-3.5 h-3.5" /> Customer Passbook
                </button>
                <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => setEditCustomer(null)}
                  className="px-2.5 py-1 rounded text-slate-600 hover:bg-slate-100 text-xs font-medium"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-3 py-1 rounded bg-indigo-600 text-white font-semibold text-xs hover:bg-indigo-700 shadow-2xs"
                >
                  Save Changes
                </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default function CustomersPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <CustomersContent />
    </Suspense>
  );
}
