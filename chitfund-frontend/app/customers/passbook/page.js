'use client';

import { useState, useEffect, useMemo, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import { getCustomerById } from '@/lib/api';
import { formatCurrency, formatDate } from '@/lib/utils';
import { Printer, BookOpen, X } from 'lucide-react';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

function PassbookContent() {
  const params = useSearchParams();
  const id = params.get('id');

  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [month, setMonth] = useState('');
  const [year, setYear] = useState('');
  const [chit, setChit] = useState('');

  useEffect(() => {
    if (!id) {
      setError('No customer selected.');
      setLoading(false);
      return;
    }
    getCustomerById(id)
      .then(setCustomer)
      .catch((err) => setError(err.message || 'Could not load passbook.'))
      .finally(() => setLoading(false));
  }, [id]);

  const payments = useMemo(() => customer?.passbook || [], [customer]);

  const years = useMemo(() => {
    const set = new Set(payments.map((p) => new Date(p.collectionDate).getFullYear()).filter((y) => !isNaN(y)));
    return [...set].sort((a, b) => b - a);
  }, [payments]);

  const chitNames = useMemo(
    () => [...new Set(payments.map((p) => p.chitGroupTitle))].sort(),
    [payments]
  );

  const filtered = useMemo(() => {
    return payments
      .filter((p) => {
        const d = new Date(p.collectionDate);
        const dateStr = isNaN(d.getTime())
          ? ''
          : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
        if (fromDate && dateStr < fromDate) return false;
        if (toDate && dateStr > toDate) return false;
        if (month && d.getMonth() + 1 !== Number(month)) return false;
        if (year && d.getFullYear() !== Number(year)) return false;
        if (chit && p.chitGroupTitle !== chit) return false;
        return true;
      })
      .sort((a, b) => new Date(a.collectionDate) - new Date(b.collectionDate));
  }, [payments, fromDate, toDate, month, year, chit]);

  const total = filtered.reduce((s, p) => s + (p.amount || 0), 0);

  // Per-chit summary of the filtered rows
  const summary = useMemo(() => {
    const map = new Map();
    filtered.forEach((p) => {
      const cur = map.get(p.chitGroupTitle) || { count: 0, amount: 0 };
      cur.count += 1;
      cur.amount += p.amount || 0;
      map.set(p.chitGroupTitle, cur);
    });
    return [...map.entries()];
  }, [filtered]);

  const filterActive = fromDate || toDate || month || year || chit;
  const filterLabel = [
    chit && `Chit: ${chit}`,
    month && `Month: ${MONTHS[month - 1]}`,
    year && `Year: ${year}`,
    fromDate && `From: ${formatDate(fromDate)}`,
    toDate && `To: ${formatDate(toDate)}`,
  ].filter(Boolean).join('  |  ');

  function clearFilters() {
    setFromDate('');
    setToDate('');
    setMonth('');
    setYear('');
    setChit('');
  }

  if (loading) {
    return <div className="flex justify-center py-10"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>;
  }
  if (error || !customer) {
    return <div className="p-6 text-center text-rose-700 text-sm">{error || 'Customer not found.'}</div>;
  }

  const inputCls = 'w-full px-2 py-1.5 rounded border border-slate-300 text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 bg-white';

  return (
    <div className="max-w-5xl mx-auto p-3 sm:p-5 text-xs text-slate-800">
      <style>{`
        @media print {
          @page { size: A4; margin: 12mm; }
          html, body { background: #fff !important; }
          .no-print { display: none !important; }
          .print-card { border: none !important; box-shadow: none !important; }
          tr { page-break-inside: avoid; }
          thead { display: table-header-group; }
        }
      `}</style>

      {/* Toolbar + filters (hidden on print) */}
      <div className="no-print bg-white rounded-lg border border-slate-200 p-3 mb-3 shadow-2xs">
        <div className="flex items-center justify-between mb-2.5">
          <div className="flex items-center gap-1.5 font-bold text-slate-900 text-sm">
            <BookOpen className="w-4 h-4 text-indigo-600" />
            Customer Passbook
          </div>
          <div className="flex gap-1.5">
            <button
              onClick={() => window.print()}
              className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs px-3 py-1.5 rounded-md"
            >
              <Printer className="w-3.5 h-3.5" /> Print
            </button>
            <button
              onClick={() => window.close()}
              className="flex items-center gap-1 px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold"
            >
              <X className="w-3.5 h-3.5" /> Close
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-6 gap-2 items-end">
          <div>
            <label className="block font-semibold text-slate-700 mb-0.5">Chit</label>
            <select value={chit} onChange={(e) => setChit(e.target.value)} className={inputCls}>
              <option value="">All Chits</option>
              {chitNames.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-0.5">Month</label>
            <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
              <option value="">All Months</option>
              {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-0.5">Year</label>
            <select value={year} onChange={(e) => setYear(e.target.value)} className={inputCls}>
              <option value="">All Years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-0.5">From Date</label>
            <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-0.5">To Date</label>
            <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)} className={inputCls} />
          </div>
          <div>
            <button
              onClick={clearFilters}
              disabled={!filterActive}
              className="w-full px-2.5 py-1.5 rounded-md bg-slate-100 hover:bg-slate-200 disabled:opacity-40 text-slate-700 text-xs font-semibold"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </div>

      {/* Printable passbook */}
      <div className="print-card bg-white rounded-lg border border-slate-200 p-4 shadow-2xs">
        <div className="text-center border-b border-slate-300 pb-2 mb-3">
          <h1 className="text-base font-bold text-slate-900">Customer Passbook</h1>
          <div className="text-[10px] text-slate-500">Generated on {formatDate(new Date())}</div>
        </div>

        <div className="grid grid-cols-2 gap-x-6 gap-y-1 mb-3">
          <div><span className="text-slate-500">Customer:</span> <b>{customer.fullName}</b></div>
          <div><span className="text-slate-500">Code:</span> <b className="font-mono">{customer.customerCode}</b></div>
          <div><span className="text-slate-500">Mobile:</span> <b>{customer.mobile}</b></div>
          <div><span className="text-slate-500">Registered:</span> <b>{formatDate(customer.registrationDate)}</b></div>
          {customer.address && <div className="col-span-2"><span className="text-slate-500">Address:</span> {customer.address}</div>}
        </div>

        <h2 className="font-bold text-slate-900 mb-1">Enrolled Chits ({customer.memberships.length})</h2>
        <table className="w-full border-collapse mb-3">
          <thead>
            <tr className="bg-slate-100 text-left text-[10px] uppercase">
              <th className="border border-slate-300 px-2 py-1">Chit Name</th>
              <th className="border border-slate-300 px-2 py-1">Code</th>
              <th className="border border-slate-300 px-2 py-1">Ticket</th>
              <th className="border border-slate-300 px-2 py-1">Joined</th>
              <th className="border border-slate-300 px-2 py-1">Prized</th>
            </tr>
          </thead>
          <tbody>
            {customer.memberships.length === 0 ? (
              <tr><td colSpan="5" className="border border-slate-300 px-2 py-2 text-center text-slate-400">Not enrolled in any chit.</td></tr>
            ) : customer.memberships.map((m) => (
              <tr key={m.id}>
                <td className="border border-slate-300 px-2 py-1 font-semibold">{m.chitGroupTitle}</td>
                <td className="border border-slate-300 px-2 py-1 font-mono">{m.chitGroupCode}</td>
                <td className="border border-slate-300 px-2 py-1">{m.ticketNumber ?? '-'}</td>
                <td className="border border-slate-300 px-2 py-1">{formatDate(m.joiningDate)}</td>
                <td className="border border-slate-300 px-2 py-1">
                  {m.hasPrized ? `Yes (Month ${m.prizedMonthNumber}, ${formatCurrency(m.prizedAmount)})` : 'No'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="flex items-center justify-between mb-1">
          <h2 className="font-bold text-slate-900">Payment Details</h2>
          {filterActive && <span className="text-[10px] text-indigo-700 font-semibold">Filtered &mdash; {filterLabel}</span>}
        </div>
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-100 text-left text-[10px] uppercase">
              <th className="border border-slate-300 px-2 py-1">#</th>
              <th className="border border-slate-300 px-2 py-1">Date</th>
              <th className="border border-slate-300 px-2 py-1">Receipt No</th>
              <th className="border border-slate-300 px-2 py-1">Chit</th>
              <th className="border border-slate-300 px-2 py-1">Mode</th>
              <th className="border border-slate-300 px-2 py-1">Status</th>
              <th className="border border-slate-300 px-2 py-1 text-right">Amount</th>
            </tr>
          </thead>
          <tbody>
            {filtered.length === 0 ? (
              <tr><td colSpan="7" className="border border-slate-300 px-2 py-4 text-center text-slate-400">No payments found.</td></tr>
            ) : filtered.map((p, i) => (
              <tr key={p.id}>
                <td className="border border-slate-300 px-2 py-1">{i + 1}</td>
                <td className="border border-slate-300 px-2 py-1">{formatDate(p.collectionDate)}</td>
                <td className="border border-slate-300 px-2 py-1 font-mono">{p.receiptNumber || '-'}</td>
                <td className="border border-slate-300 px-2 py-1">{p.chitGroupTitle}</td>
                <td className="border border-slate-300 px-2 py-1">{p.paymentMode}</td>
                <td className="border border-slate-300 px-2 py-1">{p.status}</td>
                <td className="border border-slate-300 px-2 py-1 text-right font-semibold">{formatCurrency(p.amount)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr className="bg-slate-50 font-bold">
              <td colSpan="6" className="border border-slate-300 px-2 py-1 text-right">Total Paid ({filtered.length} payments)</td>
              <td className="border border-slate-300 px-2 py-1 text-right text-emerald-700">{formatCurrency(total)}</td>
            </tr>
          </tfoot>
        </table>

        {summary.length > 1 && (
          <div className="mt-3">
            <h2 className="font-bold text-slate-900 mb-1">Chit-wise Summary</h2>
            <table className="w-full border-collapse">
              <tbody>
                {summary.map(([name, s]) => (
                  <tr key={name}>
                    <td className="border border-slate-300 px-2 py-1">{name}</td>
                    <td className="border border-slate-300 px-2 py-1 text-right">{s.count} payments</td>
                    <td className="border border-slate-300 px-2 py-1 text-right font-semibold">{formatCurrency(s.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

export default function PassbookPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <PassbookContent />
    </Suspense>
  );
}
