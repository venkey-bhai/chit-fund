'use client';

import { useState, useEffect, Suspense } from 'react';
import { 
  Search, 
  Filter, 
  User, 
  Activity,
  RefreshCw
} from 'lucide-react';
import { getAuditLogs } from '@/lib/api';
import { formatDateTime } from '@/lib/utils';

function AuditLogsContent() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedEntity, setSelectedEntity] = useState('ALL');

  useEffect(() => {
    loadLogs();
  }, [selectedEntity]);

  const loadLogs = async () => {
    try {
      setLoading(true);
      const params = {};
      if (selectedEntity !== 'ALL') {
        params.entityType = selectedEntity;
      }
      const data = await getAuditLogs(params);
      setLogs(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error('Failed to load audit logs:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredLogs = logs.filter(log => {
    const term = searchTerm.toLowerCase();
    const actionMatch = log.action?.toLowerCase().includes(term);
    const entityMatch = log.entityType?.toLowerCase().includes(term);
    const detailsMatch = log.details?.toLowerCase().includes(term);
    const idMatch = log.entityId?.toString().toLowerCase().includes(term);
    return actionMatch || entityMatch || detailsMatch || idMatch;
  });

  const getActionBadge = (action) => {
    if (!action) return 'bg-slate-100 text-slate-700';
    const a = action.toUpperCase();
    if (a.includes('CREATE') || a.includes('RECORD') || a.includes('INSERT')) {
      return 'bg-emerald-50 text-emerald-700 border-emerald-200';
    }
    if (a.includes('UPDATE') || a.includes('EDIT')) {
      return 'bg-blue-50 text-blue-700 border-blue-200';
    }
    if (a.includes('DELETE') || a.includes('REVERSE')) {
      return 'bg-rose-50 text-rose-700 border-rose-200';
    }
    if (a.includes('AUCTION') || a.includes('PAYOUT')) {
      return 'bg-amber-50 text-amber-700 border-amber-200';
    }
    return 'bg-indigo-50 text-indigo-700 border-indigo-200';
  };

  return (
    <div className="flex flex-col h-full min-h-0 gap-2.5">
      {/* Filter and Search Bar (Page Heading Removed) */}
      <div className="bg-white p-2.5 rounded-lg border border-slate-200 shadow-2xs flex flex-col md:flex-row gap-2 items-center justify-between">
        <div className="relative w-full md:w-72">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2" />
          <input
            type="text"
            placeholder="Search action, details, ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-md text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:bg-white"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-0.5 md:pb-0">
          <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 mr-1 flex items-center gap-0.5">
            <Filter className="w-2.5 h-2.5" /> Filter:
          </span>
          {['ALL', 'Customer', 'ChitGroup', 'Payment', 'Auction', 'PrizePayout', 'CompanySetting'].map((entity) => (
            <button
              key={entity}
              onClick={() => setSelectedEntity(entity)}
              className={`px-2 py-1 rounded text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                selectedEntity === entity
                  ? 'bg-indigo-600 text-white shadow-2xs'
                  : 'bg-slate-100 hover:bg-slate-200 text-slate-600'
              }`}
            >
              {entity}
            </button>
          ))}
          <button
            onClick={loadLogs}
            disabled={loading}
            className="p-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-600 ml-1 cursor-pointer"
            title="Refresh"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Table of Audit Logs with Sticky Headers */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden flex-1 min-h-0 flex flex-col">
        <div className="overflow-auto flex-1 min-h-0">
          <table className="w-full text-left border-collapse text-xs">
            <thead className="sticky top-0 z-10 bg-slate-100 shadow-2xs">
              <tr className="border-b border-slate-200 text-[10px] font-bold text-slate-700 uppercase tracking-wider">
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Timestamp (UTC)</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Action</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Entity Type</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Entity ID</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Details</th>
                <th className="sticky top-0 bg-slate-100 z-10 py-2 px-2.5">Operator</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    <div className="inline-block animate-spin rounded-full h-5 w-5 border-2 border-indigo-600 border-t-transparent"></div>
                  </td>
                </tr>
              ) : filteredLogs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400">
                    <Activity className="w-6 h-6 mx-auto text-slate-300 mb-1" />
                    <p className="text-xs font-semibold">No audit records found.</p>
                  </td>
                </tr>
              ) : (
                filteredLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-2 px-2.5 text-slate-500 font-mono text-[10px] whitespace-nowrap">
                      {formatDateTime(log.createdAt)}
                    </td>
                    <td className="py-2 px-2.5 whitespace-nowrap">
                      <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold border ${getActionBadge(log.action)}`}>
                        {log.action}
                      </span>
                    </td>
                    <td className="py-2 px-2.5 font-semibold text-slate-700 text-xs">
                      {log.entityType}
                    </td>
                    <td className="py-2 px-2.5 font-mono text-slate-500 text-xs">
                      #{log.entityId || '-'}
                    </td>
                    <td className="py-2 px-2.5 text-slate-700 max-w-sm truncate text-xs" title={log.details}>
                      {log.details || '-'}
                    </td>
                    <td className="py-2 px-2.5 text-slate-500 flex items-center gap-1 whitespace-nowrap text-xs">
                      <User className="w-3 h-3 text-slate-400" />
                      <span>User #{log.userId || '1'}</span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

export default function AuditLogsPage() {
  return (
    <Suspense fallback={<div className="flex justify-center py-8"><div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div></div>}>
      <AuditLogsContent />
    </Suspense>
  );
}
