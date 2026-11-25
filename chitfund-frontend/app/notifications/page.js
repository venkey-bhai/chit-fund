'use client';

import { useState, useEffect } from 'react';
import { getCustomers, getNotifications, sendCustomMessage, sendDueReminders } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';
import Pagination from '@/components/Pagination';
import { Send, Search, BellRing } from 'lucide-react';

const PAGE_SIZE = 10;
const TYPE_LABELS = {
  PaymentReceipt: 'Payment Receipt',
  DueReminder: 'Due Reminder',
  AuctionResult: 'Auction Result',
  Custom: 'Custom',
};

export default function MessagesPage() {
  const [customers, setCustomers] = useState([]);
  const [history, setHistory] = useState([]);
  const [search, setSearch] = useState('');
  const [selectedIds, setSelectedIds] = useState([]);
  const [allActive, setAllActive] = useState(false);
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState(null); // { type: 'ok' | 'error', text }
  const [page, setPage] = useState(1);

  useEffect(() => {
    loadAll();
  }, []);

  async function loadAll() {
    // Load separately so one failing call doesn't hide the other
    try {
      const c = await getCustomers();
      setCustomers((Array.isArray(c) ? c : []).filter((x) => x.status !== 'Deactivated'));
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: `Could not load customers: ${err.message}` });
    }
    try {
      const h = await getNotifications(200);
      setHistory(Array.isArray(h) ? h : []);
    } catch (err) {
      console.error(err);
      setNotice({ type: 'error', text: `Could not load message history (restart the API if you just updated it): ${err.message}` });
    }
  }

  const term = search.trim().toLowerCase();
  const visibleCustomers = customers.filter(
    (c) =>
      !term ||
      c.fullName?.toLowerCase().includes(term) ||
      c.customerCode?.toLowerCase().includes(term) ||
      c.mobile?.includes(term)
  );

  function toggleCustomer(id) {
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  }

  async function handleSend(e) {
    e.preventDefault();
    setNotice(null);
    if (!message.trim()) {
      setNotice({ type: 'error', text: 'Type a message first.' });
      return;
    }
    if (!allActive && selectedIds.length === 0) {
      setNotice({ type: 'error', text: 'Select at least one customer, or choose all active customers.' });
      return;
    }
    const count = allActive ? customers.length : selectedIds.length;
    if (!confirm(`Send this message by SMS and WhatsApp to ${count} customer(s)?`)) return;

    setSending(true);
    try {
      const res = await sendCustomMessage({ customerIds: selectedIds, allActive, message });
      setNotice({ type: 'ok', text: `Sent to ${res.delivered} of ${res.total} customer(s)${res.failed ? ` (${res.failed} failed)` : ''}.` });
      setMessage('');
      setSelectedIds([]);
      setAllActive(false);
      setPage(1);
      loadAll();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Could not send the message.' });
      loadAll();
    } finally {
      setSending(false);
    }
  }

  async function handleReminders() {
    setNotice(null);
    if (!confirm('Send due / overdue installment reminders to customers now?')) return;
    try {
      const n = await sendDueReminders();
      setNotice({ type: 'ok', text: `Reminders sent to ${n} customer(s).` });
      setPage(1);
      loadAll();
    } catch (err) {
      setNotice({ type: 'error', text: err.message || 'Could not send reminders.' });
    }
  }

  const totalPages = Math.max(1, Math.ceil(history.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pagedHistory = history.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5">
      {notice && (
        <div
          className={`p-2 rounded border text-xs font-medium ${
            notice.type === 'ok'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {notice.text}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-3 flex-1 min-h-0">
        {/* COMPOSE */}
        <form
          onSubmit={handleSend}
          className="lg:col-span-2 bg-white rounded-lg border border-slate-200 shadow-2xs p-3 flex flex-col gap-2.5 min-h-0 text-xs"
        >
          <div className="flex items-center justify-between shrink-0">
            <h2 className="font-bold text-slate-900 text-xs">Send Message (SMS + WhatsApp)</h2>
            <button
              type="button"
              onClick={handleReminders}
              className="flex items-center gap-1 px-2 py-1 rounded bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-[10px] font-semibold"
              title="Send due / overdue installment reminders now"
            >
              <BellRing className="w-3 h-3" />
              <span>Send due reminders now</span>
            </button>
          </div>

          <label className="flex items-center gap-2 p-2 bg-slate-50 rounded border border-slate-200 cursor-pointer shrink-0">
            <input
              type="checkbox"
              checked={allActive}
              onChange={(e) => setAllActive(e.target.checked)}
              className="w-4 h-4 accent-indigo-600"
            />
            <span className="font-semibold text-slate-700">All active customers ({customers.length})</span>
          </label>

          {!allActive && (
            <div className="flex flex-col min-h-0 flex-1 border border-slate-200 rounded">
              <div className="relative shrink-0 border-b border-slate-200">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search customer..."
                  className="w-full pl-8 pr-2 py-1.5 text-xs focus:outline-hidden"
                />
              </div>
              <div className="overflow-auto flex-1 min-h-[96px] divide-y divide-slate-100">
                {visibleCustomers.length === 0 && (
                  <p className="p-2 text-slate-400">No customers found.</p>
                )}
                {visibleCustomers.map((c) => (
                  <label key={c.id} className="flex items-center gap-2 px-2 py-1.5 hover:bg-slate-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedIds.includes(c.id)}
                      onChange={() => toggleCustomer(c.id)}
                      className="w-3.5 h-3.5 accent-indigo-600"
                    />
                    <span className="font-semibold text-slate-800">{c.fullName}</span>
                    <span className="text-slate-400 ml-auto">{c.mobile}</span>
                  </label>
                ))}
              </div>
              <div className="shrink-0 px-2 py-1 border-t border-slate-200 bg-slate-50 text-[10px] text-slate-600 flex justify-between">
                <span>{selectedIds.length} selected</span>
                <button
                  type="button"
                  onClick={() => setSelectedIds(visibleCustomers.map((c) => c.id))}
                  className="text-indigo-600 font-semibold hover:underline"
                >
                  Select all shown
                </button>
              </div>
            </div>
          )}

          <div className="shrink-0">
            <label className="block font-semibold text-slate-700 mb-0.5"></label>
            <textarea
              rows="3"
              maxLength={1000}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Type the message to send..."
              className="w-full px-2.5 py-1.5 rounded border border-slate-300 focus:outline-hidden focus:ring-1 focus:ring-indigo-500 text-xs"
            />
            <div className="text-[10px] text-slate-400 text-right">{message.length} / 1000</div>
          </div>

          <button
            type="submit"
            disabled={sending}
            className="shrink-0 flex items-center justify-center gap-1.5 py-1.5 px-3 rounded bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs disabled:opacity-50"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{sending ? 'Sending...' : 'Send Message'}</span>
          </button>
          {/* <p className="shrink-0 text-[10px] text-slate-500">
            Payment receipts, auction results and due reminders are sent automatically.
          </p> */}
        </form>

        {/* HISTORY */}
        <div className="lg:col-span-3 bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex flex-col min-h-0">
          <div className="p-2.5 border-b border-slate-100 shrink-0">
            <h2 className="text-xs font-bold text-slate-800">Message History</h2>
          </div>
          <div className="overflow-auto flex-1 min-h-0">
            <table className="w-full text-left border-collapse text-xs">
              <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
                <tr className="border-b border-slate-200 text-slate-700 font-bold uppercase text-[10px] tracking-wider">
                  <th className="py-2 px-2.5">Date</th>
                  <th className="py-2 px-2.5">Customer</th>
                  <th className="py-2 px-2.5">Type</th>
                  <th className="py-2 px-2.5">Channel</th>
                  <th className="py-2 px-2.5">Status</th>
                  <th className="py-2 px-2.5">Message</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-700">
                {pagedHistory.length === 0 ? (
                  <tr>
                    <td colSpan="6" className="py-6 text-center text-slate-400">No messages sent yet.</td>
                  </tr>
                ) : (
                  pagedHistory.map((n) => (
                    <tr key={n.id} className="hover:bg-slate-50">
                      <td className="py-2 px-2.5 whitespace-nowrap">{formatDateTime(n.createdAt)}</td>
                      <td className="py-2 px-2.5 font-semibold text-slate-900 whitespace-nowrap">{n.customerName}</td>
                      <td className="py-2 px-2.5 whitespace-nowrap">{TYPE_LABELS[n.notificationType] || n.notificationType}</td>
                      <td className="py-2 px-2.5">{n.channel}</td>
                      <td className="py-2 px-2.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-semibold border ${
                            n.deliveryStatus === 'Sent'
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                              : 'bg-rose-50 text-rose-700 border-rose-200'
                          }`}
                        >
                          {n.deliveryStatus}
                        </span>
                      </td>
                      <td className="py-2 px-2.5 max-w-[260px] truncate" title={n.message}>{n.message}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <Pagination page={currentPage} totalPages={totalPages} onChange={setPage} />
        </div>
      </div>
    </div>
  );
}
