'use client';

import { useEffect, useState } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import Navbar from '@/components/Navbar';
import { getToken, isTokenValid, clearSession } from '@/lib/auth';

export default function AppShell({ children }) {
  const pathname = usePathname();
  const router = useRouter();
  const [ready, setReady] = useState(false);
  const isLoginPage = pathname === '/login';

  useEffect(() => {
    const valid = isTokenValid(getToken());
    if (isLoginPage) {
      if (valid) router.replace('/');
      else setReady(true);
      return;
    }
    if (!valid) {
      clearSession();
      router.replace('/login');
      return;
    }
    setReady(true);
  }, [pathname, isLoginPage, router]);

  if (!ready) {
    return (
      <div className="flex h-screen w-screen items-center justify-center">
        <div className="w-6 h-6 border-2 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (isLoginPage) return <>{children}</>;

  return (
    <div className="flex h-screen w-screen overflow-hidden">
      <Sidebar />
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
        <Navbar />
        <main className="flex-1 overflow-y-auto p-3.5 sm:p-4 bg-slate-50">
          {children}
        </main>
      </div>
    </div>
  );
}
