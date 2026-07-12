'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import {
  Ticket,
  CheckCircle2,
  AlertCircle,
  Users,
  Building2,
  TrendingUp,
  BarChart3,
  ArrowLeft,
  RefreshCw,
  ShieldCheck,
  UserCheck,
  CalendarDays,
  ChevronDown,
} from 'lucide-react';
import { API_ROUTES, apiRequest, getStoredUser } from '@/config';

/* ─── Period helpers ─────────────────────────────────────── */
const PERIODS = [
  { key: 'week',   label: 'This Week' },
  { key: 'month',  label: 'This Month' },
  { key: 'year',   label: 'This Year' },
  { key: 'custom', label: 'Custom' },
];

function getDateRange(periodKey) {
  const now  = new Date();
  const from = new Date(now);
  switch (periodKey) {
    case 'week': {
      const day = from.getDay(); // 0=Sun
      from.setDate(from.getDate() - (day === 0 ? 6 : day - 1));
      from.setHours(0, 0, 0, 0);
      break;
    }
    case 'month':
      from.setDate(1);
      from.setHours(0, 0, 0, 0);
      break;
    case 'year':
      from.setMonth(0, 1);
      from.setHours(0, 0, 0, 0);
      break;
    default:
      return null; // custom — caller provides dates
  }
  return { from: from.toISOString().slice(0, 10), to: now.toISOString().slice(0, 10) };
}

function buildUrl(base, params) {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v != null && v !== '')
  ).toString();
  return qs ? `${base}?${qs}` : base;
}

/* ─── Sub-components ─────────────────────────────────────── */
function StatCard({ icon: Icon, label, value, color, sub }) {
  return (
    <div className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)] transition hover:shadow-[0_6px_28px_rgba(15,23,42,0.09)]">
      <div className={`absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10 ${color}`} />
      <div className={`mb-3 inline-flex h-10 w-10 items-center justify-center rounded-xl ${color} bg-opacity-15`}>
        <Icon className={`h-5 w-5 ${color.replace('bg-', 'text-')}`} />
      </div>
      <p className="text-2xl font-bold text-slate-800">{value ?? '—'}</p>
      <p className="mt-0.5 text-sm font-medium text-slate-500">{label}</p>
      {sub && <p className="mt-1 text-xs text-slate-400">{sub}</p>}
    </div>
  );
}

function SectionTitle({ icon: Icon, title, color = 'text-indigo-600' }) {
  return (
    <div className="flex items-center gap-2 mb-4">
      <Icon className={`h-4 w-4 ${color}`} />
      <h2 className="text-base font-semibold text-slate-800">{title}</h2>
    </div>
  );
}

function Badge({ value, color }) {
  return <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${color}`}>{value}</span>;
}

function ProgressBar({ value, max, color = 'bg-indigo-500' }) {
  const pct = max > 0 ? Math.min(100, Math.round((value / max) * 100)) : 0;
  return (
    <div className="h-1.5 w-full rounded-full bg-slate-100 overflow-hidden">
      <div className={`h-full rounded-full ${color} transition-all duration-700`} style={{ width: `${pct}%` }} />
    </div>
  );
}

/* ─── Period selector UI ─────────────────────────────────── */
function PeriodSelector({ period, setPeriod, customFrom, setCustomFrom, customTo, setCustomTo, onApply }) {
  const isCustom = period === 'custom';
  return (
    <div className="flex flex-wrap items-center gap-2">
      {/* Preset pills */}
      <div className="flex rounded-xl border border-slate-200 bg-white overflow-hidden shadow-sm">
        {PERIODS.map((p) => (
          <button
            key={p.key}
            onClick={() => setPeriod(p.key)}
            className={`px-3.5 py-2 text-xs font-semibold transition-colors ${
              period === p.key
                ? 'bg-indigo-600 text-white'
                : 'text-slate-600 hover:bg-slate-50'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* Custom date pickers */}
      {isCustom && (
        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-left-2 duration-200">
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={customFrom}
              max={customTo || undefined}
              onChange={(e) => setCustomFrom(e.target.value)}
              className="text-xs text-slate-700 bg-transparent outline-none"
            />
          </div>
          <span className="text-slate-400 text-xs">→</span>
          <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-1.5 shadow-sm">
            <CalendarDays className="h-3.5 w-3.5 text-slate-400 shrink-0" />
            <input
              type="date"
              value={customTo}
              min={customFrom || undefined}
              onChange={(e) => setCustomTo(e.target.value)}
              className="text-xs text-slate-700 bg-transparent outline-none"
            />
          </div>
          <button
            onClick={onApply}
            disabled={!customFrom || !customTo}
            className="flex items-center gap-1 rounded-xl bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:bg-indigo-700 disabled:opacity-40 transition"
          >
            Apply
            <ChevronDown className="h-3 w-3 -rotate-90" />
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Main page ──────────────────────────────────────────── */
export default function DashboardPage() {
  const [user, setUser]               = useState(() => getStoredUser());
  const [myData, setMyData]           = useState(null);
  const [systemData, setSystemData]   = useState(null);
  const [deptData, setDeptData]       = useState(null);
  const [teamData, setTeamData]       = useState(null);
  const [supervisorData, setSupervisorData] = useState(null);
  const [managerData, setManagerData] = useState([]);
  const [loading, setLoading]         = useState(true);

  // Period state
  const [period, setPeriod]           = useState('month');
  const [customFrom, setCustomFrom]   = useState('');
  const [customTo, setCustomTo]       = useState('');
  const [appliedRange, setAppliedRange] = useState(() => getDateRange('month'));

  const isOwnerOrManager = user?.role === 'owner' || user?.role === 'manager';
  const isSupervisor     = user?.role === 'supervisor';

  const handlePeriodChange = (newPeriod) => {
    setPeriod(newPeriod);
    if (newPeriod !== 'custom') {
      setAppliedRange(getDateRange(newPeriod));
    }
  };

  useEffect(() => {
    if (!user || user.role === 'employee') {
      window.location.href = '/';
    }
  }, [user]);

  // Build query params from the applied range
  const dateParams = useMemo(() => ({
    fromDate: appliedRange?.from ?? '',
    toDate:   appliedRange?.to   ?? '',
  }), [appliedRange]);

  useEffect(() => {
    if (!user) return;
    let isMounted = true;

    async function load() {
      setLoading(true);
      try {
        const calls = [apiRequest(buildUrl(API_ROUTES.dashboard.me, dateParams))];

        if (isOwnerOrManager) {
          calls.push(
            apiRequest(buildUrl(API_ROUTES.dashboard.system, dateParams)),
            apiRequest(buildUrl(API_ROUTES.dashboard.departments, dateParams)),
            apiRequest(buildUrl(API_ROUTES.dashboard.supervisors, dateParams)),
          );
        }
        if (isSupervisor) {
          calls.push(apiRequest(buildUrl(API_ROUTES.dashboard.team, dateParams)));
        }

        const results = await Promise.allSettled(calls);
        if (!isMounted) return;

        setMyData(results[0]?.value?.data ?? null);

        if (isOwnerOrManager) {
          setSystemData(results[1]?.value?.data ?? null);
          setDeptData(results[2]?.value?.data?.departments ?? null);
          setSupervisorData(results[3]?.value?.data?.supervisors ?? null);
          setManagerData(results[3]?.value?.data?.managers ?? []);
        }
        if (isSupervisor) {
          setTeamData(results[1]?.value?.data ?? null);
        }
      } catch (err) {
        console.error('Dashboard load error', err);
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    void load();
    return () => { isMounted = false; };
  }, [user, dateParams, isOwnerOrManager, isSupervisor]);

  function handleApplyCustom() {
    if (!customFrom || !customTo) return;
    setAppliedRange({ from: customFrom, to: customTo });
  }

  const periodLabel = useMemo(() => {
    if (period !== 'custom') return PERIODS.find((p) => p.key === period)?.label ?? '';
    if (appliedRange) return `${appliedRange.from} → ${appliedRange.to}`;
    return 'Custom';
  }, [period, appliedRange]);

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 rounded-full border-4 border-indigo-200 border-t-indigo-600 animate-spin" />
          <p className="text-sm text-slate-500">Loading dashboard…</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-full bg-background">
      {/* ── Top bar ── */}
      <div className="sticky top-0 z-10 border-b border-slate-200/80 bg-white/80 backdrop-blur-xl">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {/* Row 1: breadcrumb + refresh */}
          <div className="flex items-center justify-between py-3">
            <div className="flex items-center gap-3">
              <Link href="/" className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                <ArrowLeft className="h-4 w-4" />
                Board
              </Link>
              <span className="text-slate-300">/</span>
              <div className="flex items-center gap-2">
                <BarChart3 className="h-4 w-4 text-indigo-600" />
                <span className="text-sm font-semibold text-slate-800">Dashboard</span>
              </div>
              {appliedRange && (
                <>
                  <span className="text-slate-300">/</span>
                  <span className="rounded-full bg-indigo-50 border border-indigo-100 px-2.5 py-0.5 text-xs font-semibold text-indigo-600">
                    {periodLabel}
                  </span>
                </>
              )}
            </div>
            <button
              onClick={() => setAppliedRange((r) => ({ ...r }))}
              className="flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm hover:bg-slate-50 transition"
            >
              <RefreshCw className="h-3 w-3" />
              Refresh
            </button>
          </div>

          {/* Row 2: period selector */}
          <div className="pb-3">
            <PeriodSelector
              period={period}
              setPeriod={handlePeriodChange}
              customFrom={customFrom}
              setCustomFrom={setCustomFrom}
              customTo={customTo}
              setCustomTo={setCustomTo}
              onApply={handleApplyCustom}
            />
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-10">

        {/* ── Personal stats ── */}
        <section>
          <SectionTitle icon={UserCheck} title={`My Overview — ${user?.name ?? ''}`} color="text-indigo-600" />
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            <StatCard icon={Ticket}       label="Assigned to me"   value={myData?.assignedTickets}   color="bg-indigo-500" />
            <StatCard icon={Building2}    label="My dept. tickets"  value={myData?.departmentTickets} color="bg-violet-500" />
            <StatCard icon={CheckCircle2} label="Completed"         value={myData?.completedTickets}  color="bg-emerald-500" />
            <StatCard icon={AlertCircle}  label="Overdue"           value={myData?.overdueTickets}    color="bg-rose-500"
              sub={myData?.overdueTickets > 0 ? 'Needs attention' : 'All on track'} />
          </div>
        </section>

        {/* ── System overview (owner / manager) ── */}
        {isOwnerOrManager && systemData && (
          <section>
            <SectionTitle icon={ShieldCheck} title="System Overview" color="text-violet-600" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard icon={Ticket}       label="Total Tickets" value={systemData.tickets?.total}     color="bg-slate-500" />
              <StatCard icon={TrendingUp}   label="Open"          value={systemData.tickets?.open}      color="bg-sky-500" />
              <StatCard icon={CheckCircle2} label="Completed"     value={systemData.tickets?.completed} color="bg-emerald-500" />
              <StatCard icon={Users}        label="Active Users"
                value={(systemData.users?.employees ?? 0) + (systemData.users?.supervisors ?? 0) + (systemData.users?.managers ?? 0) + (systemData.users?.owners ?? 0)}
                color="bg-amber-500" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-4">
              {[
                { role: 'Owners',      count: systemData.users?.owners,      color: 'bg-violet-100 text-violet-700' },
                { role: 'Managers',    count: systemData.users?.managers,     color: 'bg-blue-100 text-blue-700' },
                { role: 'Supervisors', count: systemData.users?.supervisors,  color: 'bg-amber-100 text-amber-700' },
                { role: 'Employees',   count: systemData.users?.employees,    color: 'bg-emerald-100 text-emerald-700' },
              ].map((r) => (
                <div key={r.role} className="flex items-center justify-between rounded-xl border border-slate-100 bg-white px-4 py-3 shadow-sm">
                  <span className="text-sm text-slate-600">{r.role}</span>
                  <Badge value={r.count ?? 0} color={r.color} />
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Department breakdown (owner / manager) ── */}
        {isOwnerOrManager && deptData && deptData.length > 0 && (
          <section>
            <SectionTitle icon={Building2} title="Department Breakdown" color="text-emerald-600" />
            <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/60">
                    <th className="px-5 py-3 text-left font-semibold text-slate-500">Department</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-500">Total</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-500">Open</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-500">Done</th>
                    <th className="px-4 py-3 text-center font-semibold text-slate-500">Overdue</th>
                    <th className="px-5 py-3 text-left font-semibold text-slate-500 w-40">Progress</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {deptData.map((dept) => (
                    <tr key={dept.departmentId} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5 font-medium text-slate-800">{dept.departmentName}</td>
                      <td className="px-4 py-3.5 text-center text-slate-600">{dept.totalTickets}</td>
                      <td className="px-4 py-3.5 text-center"><Badge value={dept.openTickets} color="bg-sky-100 text-sky-700" /></td>
                      <td className="px-4 py-3.5 text-center"><Badge value={dept.completedTickets} color="bg-emerald-100 text-emerald-700" /></td>
                      <td className="px-4 py-3.5 text-center">
                        {dept.overdueTickets > 0
                          ? <Badge value={dept.overdueTickets} color="bg-rose-100 text-rose-700" />
                          : <span className="text-slate-400">—</span>}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2">
                          <ProgressBar value={dept.completedTickets} max={dept.totalTickets} color="bg-emerald-500" />
                          <span className="text-[10px] text-slate-400 shrink-0">
                            {dept.totalTickets > 0 ? `${Math.round((dept.completedTickets / dept.totalTickets) * 100)}%` : '0%'}
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Supervisor leaderboard (owner / manager) ── */}
        {isOwnerOrManager && supervisorData && supervisorData.length > 0 && (
          <section>
            <SectionTitle icon={Users} title="Supervisor Teams" color="text-amber-600" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {supervisorData.map((sup) => (
                <div key={sup.supervisorId} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-amber-100 text-sm font-bold text-amber-700">
                      {sup.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{sup.name}</p>
                      <p className="text-xs text-slate-400">{sup.teamSize} team member{sup.teamSize !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-base font-bold text-slate-800">{sup.totalTickets}</p>
                      <p className="text-slate-500">Total</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2">
                      <p className="text-base font-bold text-emerald-700">{sup.completedTickets}</p>
                      <p className="text-emerald-600">Done</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-2">
                      <p className="text-base font-bold text-rose-700">{sup.overdueTickets}</p>
                      <p className="text-rose-500">Overdue</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={sup.completedTickets} max={sup.totalTickets} color="bg-amber-400" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Manager leaderboard (owner only) ── */}
        {user?.role === 'owner' && managerData && managerData.length > 0 && (
          <section>
            <SectionTitle icon={ShieldCheck} title="Manager Departments" color="text-violet-600" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {managerData.map((mgr) => (
                <div key={mgr.managerId} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-violet-100 text-sm font-bold text-violet-700">
                      {mgr.name?.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-slate-800">{mgr.name}</p>
                      <p className="text-xs text-slate-400">{mgr.departmentsCount} department{mgr.departmentsCount !== 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  <div className="grid grid-cols-3 gap-2 text-center text-xs">
                    <div className="rounded-xl bg-slate-50 p-2">
                      <p className="text-base font-bold text-slate-800">{mgr.totalTickets}</p>
                      <p className="text-slate-500">Total</p>
                    </div>
                    <div className="rounded-xl bg-emerald-50 p-2">
                      <p className="text-base font-bold text-emerald-700">{mgr.completedTickets}</p>
                      <p className="text-emerald-600">Done</p>
                    </div>
                    <div className="rounded-xl bg-rose-50 p-2">
                      <p className="text-base font-bold text-rose-700">{mgr.overdueTickets}</p>
                      <p className="text-rose-500">Overdue</p>
                    </div>
                  </div>
                  <div className="mt-3">
                    <ProgressBar value={mgr.completedTickets} max={mgr.totalTickets} color="bg-violet-400" />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ── Team dashboard (supervisor) ── */}
        {isSupervisor && teamData && (
          <section>
            <SectionTitle icon={Users} title="My Team Overview" color="text-amber-600" />
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4 mb-6">
              <StatCard icon={Ticket}       label="Team Total"  value={teamData.totalTickets}     color="bg-slate-500" />
              <StatCard icon={TrendingUp}   label="Open"        value={teamData.openTickets}      color="bg-sky-500" />
              <StatCard icon={CheckCircle2} label="Completed"   value={teamData.completedTickets} color="bg-emerald-500" />
              <StatCard icon={AlertCircle}  label="Overdue"     value={teamData.overdueTickets}   color="bg-rose-500" />
            </div>

            {teamData.employees?.length > 0 && (
              <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_4px_20px_rgba(15,23,42,0.05)]">
                <div className="px-5 py-4 border-b border-slate-100">
                  <p className="text-sm font-semibold text-slate-800">Team Members</p>
                </div>
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50/60">
                      <th className="px-5 py-3 text-left font-semibold text-slate-500">Employee</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-500">Assigned</th>
                      <th className="px-4 py-3 text-center font-semibold text-slate-500">Overdue</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamData.employees.map((emp) => (
                      <tr key={emp.userId} className="hover:bg-slate-50/60 transition-colors">
                        <td className="px-5 py-3.5">
                          <div className="flex items-center gap-2">
                            <div className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-100 text-[10px] font-bold text-emerald-700">
                              {emp.name?.charAt(0).toUpperCase()}
                            </div>
                            <span className="font-medium text-slate-700">{emp.name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3.5 text-center"><Badge value={emp.assignedTickets} color="bg-sky-100 text-sky-700" /></td>
                        <td className="px-4 py-3.5 text-center">
                          {emp.overdueTickets > 0
                            ? <Badge value={emp.overdueTickets} color="bg-rose-100 text-rose-700" />
                            : <span className="text-slate-400 text-xs">—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {/* ── Quick actions ── */}
        <section>
          <SectionTitle icon={TrendingUp} title="Quick Actions" color="text-slate-500" />
          <div className="flex flex-wrap gap-3">
            <Link href="/" className="rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50 transition">
              → View Board
            </Link>
            <Link href="/new-ticket" className="rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 transition">
              + New Ticket
            </Link>
            {user?.role === 'owner' && (
              <Link href="/departments" className="rounded-full border border-violet-200 bg-violet-50 px-4 py-2 text-sm font-medium text-violet-700 hover:bg-violet-100 transition">
                Manage Departments
              </Link>
            )}
          </div>
        </section>
      </div>
    </div>
  );
}
