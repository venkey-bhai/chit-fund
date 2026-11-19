'use client';

import { useState, useEffect } from 'react';
import { 
  Building2, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Receipt, 
  Save, 
  ShieldCheck, 
  Database, 
  CheckCircle2, 
  AlertCircle
} from 'lucide-react';
import { getCompanySettings, updateCompanySettings } from '@/lib/api';

export default function SettingsPage() {
  const [settings, setSettings] = useState({
    companyName: '',
    address: '',
    phone: '',
    email: '',
    currencyCode: 'INR',
    financialYearStart: '',
    receiptPrefix: 'REC',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const data = await getCompanySettings();
      if (data) {
        setSettings({
          companyName: data.companyName || '',
          address: data.address || '',
          phone: data.phone || '',
          email: data.email || '',
          currencyCode: data.currencyCode || 'INR',
          financialYearStart: data.financialYearStart ? data.financialYearStart.split('T')[0] : '',
          receiptPrefix: data.receiptPrefix || 'REC',
        });
      }
    } catch (err) {
      console.error('Failed to load settings:', err);
      setMessage({ type: 'error', text: 'Failed to load company settings.' });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setSaving(true);
      setMessage({ type: '', text: '' });
      await updateCompanySettings({
        companyName: settings.companyName,
        address: settings.address,
        phone: settings.phone,
        email: settings.email,
        currencyCode: settings.currencyCode,
        financialYearStart: settings.financialYearStart ? new Date(settings.financialYearStart).toISOString() : null,
        receiptPrefix: settings.receiptPrefix,
      });
      setMessage({ type: 'success', text: 'Settings updated successfully!' });
      setTimeout(() => setMessage({ type: '', text: '' }), 4000);
    } catch (err) {
      console.error('Failed to update settings:', err);
      setMessage({ type: 'error', text: err.message || 'Error updating settings.' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[300px]">
        <div className="animate-spin rounded-full h-6 w-6 border-2 border-indigo-600 border-t-transparent"></div>
      </div>
    );
  }

  return (
    <div className="space-y-2.5">
      {message.text && (
        <div
          className={`p-2.5 rounded-lg flex items-center gap-2 border text-xs ${
            message.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
              : 'bg-rose-50 text-rose-800 border-rose-200'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          )}
          <span className="font-semibold">{message.text}</span>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Settings Form */}
        <div className="lg:col-span-2">
          <form onSubmit={handleSubmit} className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs space-y-3 text-xs">
            <h2 className="text-xs font-bold text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-2">
              <Building2 className="w-3.5 h-3.5 text-indigo-600" />
              Company Legal Information
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5">
                  Company Name *
                </label>
                <input
                  type="text"
                  required
                  value={settings.companyName}
                  onChange={(e) => setSettings({ ...settings, companyName: e.target.value })}
                  placeholder="e.g. ChitPro Financial Services Ltd."
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5 flex items-center gap-1">
                  <Phone className="w-3 h-3 text-slate-400" />
                  Contact Phone
                </label>
                <input
                  type="text"
                  value={settings.phone}
                  onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                  placeholder="+91 98450 12345"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5 flex items-center gap-1">
                  <Mail className="w-3 h-3 text-slate-400" />
                  Official Email
                </label>
                <input
                  type="email"
                  value={settings.email}
                  onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                  placeholder="admin@chitpro.com"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div className="md:col-span-2">
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5 flex items-center gap-1">
                  <MapPin className="w-3 h-3 text-slate-400" />
                  Registered Office Address
                </label>
                <textarea
                  rows={2}
                  value={settings.address}
                  onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                  placeholder="100, Finance Hub, Anna Salai, Chennai 600002"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5 flex items-center gap-1">
                  <Receipt className="w-3 h-3 text-slate-400" />
                  Receipt Prefix
                </label>
                <input
                  type="text"
                  value={settings.receiptPrefix}
                  onChange={(e) => setSettings({ ...settings, receiptPrefix: e.target.value })}
                  placeholder="REC"
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs font-mono focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 uppercase mb-0.5 flex items-center gap-1">
                  <Calendar className="w-3 h-3 text-slate-400" />
                  FY Start Date
                </label>
                <input
                  type="date"
                  value={settings.financialYearStart}
                  onChange={(e) => setSettings({ ...settings, financialYearStart: e.target.value })}
                  className="w-full px-2.5 py-1.5 bg-slate-50 border border-slate-300 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
                />
              </div>
            </div>

            <div className="pt-2 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                disabled={saving}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-md text-xs font-bold shadow-2xs transition-all cursor-pointer"
              >
                {saving ? 'Saving...' : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    Save Settings
                  </>
                )}
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar Info & Compliance */}
        <div className="space-y-2.5">
          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-amber-700 mb-2 flex items-center gap-1.5">
              <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
              Chit Funds Act, 1982
            </h3>
            <div className="space-y-1.5 text-xs text-slate-600">
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Foreman Commission:</span>
                <span className="font-mono font-bold text-emerald-700">5.00%</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Auction Day:</span>
                <span className="font-semibold text-slate-800">5th of Month</span>
              </div>
              <div className="flex justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Grace Period:</span>
                <span className="font-semibold text-slate-800">5 Days</span>
              </div>
              <div className="flex justify-between py-1">
                <span className="text-slate-500">Late Fine Policy:</span>
                <span className="font-semibold text-slate-800">₹50/day</span>
              </div>
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs">
            <h3 className="font-extrabold text-xs uppercase tracking-wider text-slate-700 mb-2 flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-indigo-600" />
              Database
            </h3>
            <div className="space-y-1 text-xs text-slate-600">
              <div className="flex justify-between">
                <span className="text-slate-500">Server:</span>
                <span className="font-mono text-slate-800">localhost\SQLEXPRESS</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Catalog:</span>
                <span className="font-mono font-bold text-indigo-700">ChitProDB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">API:</span>
                <span className="font-semibold text-slate-800">.NET 8 Web API</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
