'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { PlusCircle, Database, LogOut, Menu } from 'lucide-react';
import { logout } from '@/lib/api';
import { getUser, clearSession } from '@/lib/auth';

export default function Navbar({ onMenu = () => {} }) {
  const router = useRouter();
  const [user, setUser] = useState(null);

  useEffect(() => {
    setUser(getUser());
  }, []);

  async function handleLogout() {
    try {
      await logout(); // records the logout in the audit log
    } catch {
      // token may already be expired; still clear the local session
    }
    clearSession();
    router.replace('/login');
  }

  return (
    <header className="h-12 bg-white border-b border-slate-200 px-2.5 sm:px-4 gap-2 flex items-center justify-between shrink-0 shadow-2xs">
      <div className="flex items-center gap-2 min-w-0">
        <button onClick={onMenu} className="md:hidden p-1.5 -ml-1 rounded-md text-slate-700 hover:bg-slate-100" aria-label="Open menu">
          <Menu className="w-5 h-5" />
        </button>
        <h2 className="text-sm font-bold text-slate-800 tracking-tight truncate">
          ChitPro <span className="hidden sm:inline text-slate-600 font-bold text-xs">&bull; Management System</span>
        </h2>
        {/* <span className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
          <Database className="w-2.5 h-2.5" />
          SQL Server: ChitProDB
        </span> */}
      </div>

      <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
        {user && (
          <span className="hidden sm:inline text-xs text-slate-600">
            {user.fullName || user.username}
          </span>
        )}
        <Link
          href="/collections"
          className="flex items-center gap-1 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold px-2.5 py-1 rounded-md transition-colors shadow-2xs"
        >
          <PlusCircle className="w-3 h-3" />
          <span className="hidden sm:inline">Payment Entry</span><span className="sm:hidden">Payment</span>
        </Link>
        {/* <Link
          href="/chits?new=true"
          className="flex items-center gap-1 bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold px-2.5 py-1 rounded-md transition-colors shadow-2xs"
        >
          <PlusCircle className="w-3 h-3" />
          <span className="hidden sm:inline">New Chit Scheme</span><span className="sm:hidden">New</span>
        </Link> */}
        <button
          onClick={handleLogout}
          className="flex items-center gap-1 border border-slate-300 hover:bg-slate-100 text-slate-700 text-xs font-semibold px-2.5 py-1 rounded-md transition-colors"
        >
          <LogOut className="w-3 h-3" />
          <span className="hidden sm:inline">Logout</span>
        </button>
      </div>
    </header>
  );
}
