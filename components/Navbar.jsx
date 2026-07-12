'use client';

import Link from 'next/link';
import { useEffect, useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { ChevronDown, LayoutDashboard, Building2, UserPlus, Users as UsersIcon, Layers3 } from 'lucide-react';
import { getStoredUser, logoutUser } from '@/config';

export function Navbar({ searchQuery, onSearchChange }) {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [moreOpen, setMoreOpen] = useState(false);
  const moreRef = useRef(null);

  useEffect(() => {
    // eslint-disable-next-line
    setUser(getStoredUser());
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(e) {
      if (moreRef.current && !moreRef.current.contains(e.target)) {
        setMoreOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = async () => {
    await logoutUser();
    router.replace('/login');
  };

  const showMore = user && user.role !== 'employee';

  return (
    <header className="border-b border-slate-200/80 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-2xl bg-indigo-600 text-sm font-semibold text-white shadow-sm">
            TB
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold tracking-tight text-slate-900">TaskBoard</p>
            <p className="text-xs text-slate-500">Track work smoothly</p>
          </div>
        </Link>

        <div className="flex flex-1 items-center justify-end gap-3">
          <label className="flex max-w-xl flex-1 items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm shadow-inner">
            <span className="text-slate-400">⌕</span>
            <input
              value={searchQuery}
              onChange={(event) => onSearchChange(event.target.value)}
              placeholder="Search by ID, title, creator, assignee..."
              className="w-full bg-transparent text-slate-700 outline-none placeholder:text-slate-400"
            />
          </label>

          <Link
            href="/new-ticket"
            className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700"
          >
            New Ticket
          </Link>

          {/* More dropdown — hidden for employees */}
          {showMore && (
            <div className="relative" ref={moreRef}>
              <button
                onClick={() => setMoreOpen((v) => !v)}
                className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3.5 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:bg-slate-100"
              >
                More
                <ChevronDown className={`h-3.5 w-3.5 text-slate-400 transition-transform duration-200 ${moreOpen ? 'rotate-180' : ''}`} />
              </button>

              {moreOpen && (
                <div className="absolute right-0 top-full mt-2 w-52 rounded-2xl border border-slate-200/80 bg-white shadow-[0_12px_32px_rgba(15,23,42,0.1)] z-50 overflow-hidden">
                  <div className="px-2 py-2 space-y-0.5">
                    <Link
                      href="/dashboard"
                      onClick={() => setMoreOpen(false)}
                      className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors group"
                    >
                      <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600 group-hover:bg-indigo-200 transition-colors">
                        <LayoutDashboard className="h-3.5 w-3.5" />
                      </span>
                      <div>
                        <p className="font-medium">Dashboard</p>
                        <p className="text-[10px] text-slate-400">Analytics &amp; overview</p>
                      </div>
                    </Link>

                    {user.role === 'owner' && (
                      <>
                        <Link
                          href="/signup"
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-emerald-50 hover:text-emerald-700 transition-colors group"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-emerald-100 text-emerald-600 group-hover:bg-emerald-200 transition-colors">
                            <UserPlus className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="font-medium">Sign Up</p>
                            <p className="text-[10px] text-slate-400">Create a new account</p>
                          </div>
                        </Link>

                        <Link
                          href="/users"
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-sky-50 hover:text-sky-700 transition-colors group"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-sky-100 text-sky-600 group-hover:bg-sky-200 transition-colors">
                            <UsersIcon className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="font-medium">Users</p>
                            <p className="text-[10px] text-slate-400">Manage team accounts</p>
                          </div>
                        </Link>

                        <Link
                          href="/departments"
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition-colors group"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600 group-hover:bg-violet-200 transition-colors">
                            <Building2 className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="font-medium">Departments</p>
                            <p className="text-[10px] text-slate-400">Manage org structure</p>
                          </div>
                        </Link>

                        <Link
                          href="/stages"
                          onClick={() => setMoreOpen(false)}
                          className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm text-slate-700 hover:bg-amber-50 hover:text-amber-700 transition-colors group"
                        >
                          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-100 text-amber-600 group-hover:bg-amber-200 transition-colors">
                            <Layers3 className="h-3.5 w-3.5" />
                          </span>
                          <div>
                            <p className="font-medium">Statuses</p>
                            <p className="text-[10px] text-slate-400">Create workflow columns</p>
                          </div>
                        </Link>
                      </>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {user ? (
            <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700">
              <span>{user.name}</span>
              <span className="rounded-full bg-slate-200 px-2 py-0.5 text-xs uppercase tracking-[0.15em] text-slate-600">{user.role}</span>
              <button onClick={handleLogout} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm transition hover:bg-slate-100">
                Logout
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </header>
  );
}
