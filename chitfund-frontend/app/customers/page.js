'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
  getCustomers, 
  createCustomer, 
  setCustomerStatus,
  getCustomerById
} from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { 
  Users, 
  UserPlus, 
  Search, 
  Phone, 
  Mail, 
  ShieldCheck, 
  BookOpen,
  X,
  CreditCard
} from 'lucide-react';

function CustomersContent() {
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedPassbook, setSelectedPassbook] = useState(null);
  const [passbookLoading, setPassbookLoading] = useState(false);

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

  // Checked = Active, unchecked = Deactivated (financial history is always preserved)
  async function handleToggleStatus(customer, isActive) {
    if (!isActive && !confirm(`Deactivate ${customer.fullName}?`)) return;
    const newStatus = isActive ? 'Active' : 'Deactivated';
    setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, status: newStatus } : c)));
    try {
      await setCustomerStatus(customer.id, isActive);
    } catch (err) {
      setCustomers((prev) => prev.map((c) => (c.id === customer.id ? { ...c, status: customer.status } : c)));
      alert(err.message || 'Error updating customer status.');
    }
  }

  async function openPassbook(customerId) {
    setPassbookLoading(true);
    try {
      const data = await getCustomerById(customerId);
      setSelectedPassbook(data);
    } catch (err) {
      alert(err.message || 'Error loading passbook');
    } finally {
      setPassbookLoading(false);
    }
  }

  return (
    <div className="space-y-3">
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
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-auto max-h-[calc(100vh-175px)]">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Code</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Full Name</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Mobile &amp; Email</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Aadhaar / PAN</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">KYC Status</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Enrolled</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3">Total Paid</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-3 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-6 text-center">
                    <div className="w-5 h-5 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin mx-auto"></div>
                  </td>
                </tr>
              ) : customers.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-6 text-center text-slate-400 text-xs">
                    No customers found. Click &ldquo;Register Customer&rdquo; to add one.
                  </td>
                </tr>
              ) : (
                customers.map((c) => (
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
                        {c.email && (
                          <div className="flex items-center gap-1 text-slate-500 text-[10px]">
                            <Mail className="w-2.5 h-2.5 text-slate-400" />
                            <span>{c.email}</span>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="py-2 px-3 font-mono font-semibold text-slate-800 text-xs">
                      {c.aadhaarOrPan || '—'}
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
                          onClick={() => openPassbook(c.id)}
                          className="px-2 py-0.5 rounded text-[10px] font-semibold bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 flex items-center gap-1 transition-colors"
                          title="View Customer Passbook"
                        >
                          <BookOpen className="w-2.5 h-2.5" />
                          <span>Passbook</span>
                        </button>
                        <input
                          type="checkbox"
                          checked={c.status !== 'Deactivated'}
                          onChange={(e) => handleToggleStatus(c, e.target.checked)}
                          className="w-4 h-4 accent-emerald-600 cursor-pointer"
                          title={c.status === 'Deactivated' ? 'Deactivated - tick to activate' : 'Active - untick to deactivate'}
                          aria-label={`Toggle active status for ${c.fullName}`}
                        />
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
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3">
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
                    placeholder="9845012345"
                    value={formData.mobile}
                    onChange={(e) => setFormData({ ...formData, mobile: e.target.value })}
                    className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-0.5">Aadhaar / PAN</label>
                  <input
                    type="text"
                    placeholder="ABCDP1234F"
                    value={formData.aadhaarOrPan}
                    onChange={(e) => setFormData({ ...formData, aadhaarOrPan: e.target.value })}
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

      {/* CUSTOMER PASSBOOK MODAL */}
      {selectedPassbook && (
        <div className="fixed inset-0 z-50 bg-slate-900/50 backdrop-blur-2xs flex items-center justify-center p-3">
          <div className="bg-white rounded-xl max-w-xl w-full shadow-xl border border-slate-200 overflow-hidden max-h-[85vh] flex flex-col">
            <div className="px-4 py-2.5 border-b border-slate-200 flex items-center justify-between bg-slate-900 text-white">
              <div className="flex items-center gap-2">
                <BookOpen className="w-4 h-4 text-indigo-400" />
                <div>
                  <h3 className="font-bold text-xs">
                    {selectedPassbook.fullName} &bull; Passbook ({selectedPassbook.customerCode})
                  </h3>
                  <p className="text-[10px] text-slate-300">
                    Mobile: {selectedPassbook.mobile || selectedPassbook.phone || 'N/A'} | ID: {selectedPassbook.aadhaarOrPan || 'N/A'}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedPassbook(null)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-3.5 space-y-3 overflow-y-auto text-xs flex-1">
              <div className="p-2.5 bg-slate-50 rounded-lg border border-slate-200/60 space-y-1.5">
                <span className="font-bold text-slate-700 text-[10px] uppercase block">
                  Enrolled Chit Schemes:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {selectedPassbook.memberships?.map((ms) => (
                    <span
                      key={ms.id}
                      className="px-2 py-0.5 rounded text-[11px] font-semibold bg-indigo-50 text-indigo-800 border border-indigo-200 flex items-center gap-1.5"
                    >
                      <span>{ms.chitGroupTitle} (Ticket #{ms.ticketNumber})</span>
                      {ms.hasPrized && (
                        <span className="px-1 py-0.2 rounded text-[9px] bg-emerald-100 text-emerald-800">
                          Won M{ms.prizedMonthNumber} ({formatCurrency(ms.prizedAmount)})
                        </span>
                      )}
                    </span>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between p-2.5 bg-emerald-50 rounded-lg border border-emerald-200 text-emerald-900">
                <span className="font-bold text-xs">Total Installments Paid:</span>
                <span className="text-sm font-extrabold">{formatCurrency(selectedPassbook.totalPaid)}</span>
              </div>

              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="overflow-auto max-h-[300px]">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead className="sticky top-0 bg-slate-100 text-slate-700 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="sticky top-0 bg-slate-100 py-1.5 px-2.5">Receipt #</th>
                        <th className="sticky top-0 bg-slate-100 py-1.5 px-2.5">Chit Scheme</th>
                        <th className="sticky top-0 bg-slate-100 py-1.5 px-2.5">Date</th>
                        <th className="sticky top-0 bg-slate-100 py-1.5 px-2.5">Amount</th>
                        <th className="sticky top-0 bg-slate-100 py-1.5 px-2.5">Mode</th>
                        <th className="sticky top-0 bg-slate-100 py-1.5 px-2.5">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {selectedPassbook.passbook?.length === 0 ? (
                        <tr>
                          <td colSpan="6" className="py-4 text-center text-slate-400 text-xs">
                            No payments recorded yet for this customer.
                          </td>
                        </tr>
                      ) : (
                        selectedPassbook.passbook?.map((p) => (
                          <tr key={p.id} className="hover:bg-slate-50">
                            <td className="py-1.5 px-2.5 font-mono font-medium text-indigo-700 text-xs">{p.receiptNumber}</td>
                            <td className="py-1.5 px-2.5 font-medium text-slate-800 text-xs">{p.chitGroupTitle}</td>
                            <td className="py-1.5 px-2.5 text-slate-700 text-xs">{formatDate(p.collectionDate)}</td>
                            <td className="py-1.5 px-2.5 font-bold text-emerald-600 text-xs">{formatCurrency(p.amount)}</td>
                            <td className="py-1.5 px-2.5 text-xs">{p.paymentMode}</td>
                            <td className="py-1.5 px-2.5">
                              <span className="px-1.5 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                {p.status}
                              </span>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>

            <div className="p-2.5 border-t border-slate-200 bg-slate-50 flex justify-end">
              <button
                onClick={() => setSelectedPassbook(null)}
                className="px-3 py-1 rounded bg-slate-800 text-white text-xs font-semibold hover:bg-slate-700"
              >
                Close
              </button>
            </div>
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
