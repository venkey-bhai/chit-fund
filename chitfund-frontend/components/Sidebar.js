'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const navItems = [
  { name: 'Dashboard', href: '/' },
  { name: 'Customers', href: '/customers' },
  { name: 'Chit Groups', href: '/chits' },
  { name: 'Chit Schedules', href: '/schedules' },
  { name: 'Collections (Payment)', href: '/collections' },
  { name: 'Auctions & Bidding', href: '/auctions' },
  { name: 'Prize Payouts', href: '/payouts' },
  { name: 'Company Expenses', href: '/expenses' },
  { name: 'Reports & Audit', href: '/reports' },
  { name: 'Audit Logs', href: '/audit-logs' },
  { name: 'Company Settings', href: '/settings' },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-56 bg-white text-slate-800 flex flex-col h-screen border-r border-slate-200 shrink-0 select-none overflow-y-auto">
      {/* Brand Header */}
      <div className="p-3.5 border-b border-slate-200 flex items-center justify-between">
        <div>
          <h1 className="font-extrabold text-sm tracking-wide text-slate-900">ChitPro</h1>
          <p className="text-[10px] text-slate-600">Chit Fund System &bull; v1.0</p>
        </div>
        <span className="w-2 h-2 rounded-full bg-emerald-500" title="System Online"></span>
      </div>

      {/* Navigation Links - Text Only (No Icons) */}
      <nav className="flex-1 p-2 space-y-0.5">
        <div className="px-2.5 py-1 text-[10px] font-bold tracking-wider text-slate-600 uppercase">
          Modules
        </div>
        {navItems.map((item) => {
          const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              className={`block px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                isActive
                  ? 'bg-indigo-600 text-white font-bold shadow-2xs'
                  : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
              }`}
            >
              {item.name}
            </Link>
          );
        })}
      </nav>

      {/* Chit Fund Compliance Tag */}
      <div className="p-2.5 m-2 bg-slate-50 rounded-lg border border-slate-200 text-[10px] text-slate-600">
        <div className="font-bold text-slate-700 mb-0.5">
          Chit Funds Act, 1982
        </div>
        <p className="text-slate-600 leading-tight">
          Single-company compliance, schedule ledger &amp; dividend audits.
        </p>
      </div>

      {/* Footer */}
      <div className="p-2.5 border-t border-slate-200 text-[10px] text-slate-600 flex items-center justify-between">
        <span className="font-mono">ChitProDB</span>
        <span className="text-emerald-600 font-semibold text-[10px]">Connected</span>
      </div>
    </aside>
  );
}
