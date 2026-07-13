'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, API_ROUTES, setStoredToken, setStoredUser } from "@/config";
import { signup } from "@/lib/auth";
import { AuthGuard } from '@/components/auth-guard';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'controller', label: 'Controller' },
  { value: 'owner', label: 'Owner' },
];

export default function Signup() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [dept, setDept] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [departments, setDepartments] = useState([]);

  useEffect(() => {
    let isMounted = true;
    async function fetchDepartments() {
      try {
        const payload = await apiRequest(API_ROUTES.departments.list);
        if (isMounted && payload?.data?.departments) {
          setDepartments(payload.data.departments);
        }
      } catch (error) {
        console.error('Failed to load departments', error);
      }
    }
    fetchDepartments();
    return () => { isMounted = false; };
  }, []);

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);

    try {
      const payload = {
        name,
        email,
        password,
        role,
        dept,
      };

      const res = await signup(payload);
      if (!res?.success) {
        throw new Error(res?.message || 'Unable to create account. Please try again.');
      }

      setStoredToken(res?.data?.token || null);
      setStoredUser(res?.data?.user || null);
      router.replace('/');
    } catch (err) {
      const message = err?.message || 'Unable to sign in. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard allowedRoles={['controller', 'owner']}>
      <div className="flex min-h-screen items-center justify-center bg-[linear-gradient(135deg,#eef2ff_0%,#f8fafc_100%)] px-4">
        <div className="w-full max-w-md rounded-3xl border border-slate-200/80 bg-white p-8 shadow-[0_25px_80px_rgba(15,23,42,0.08)]">
          <div className="mb-8 text-center">
            <p className="text-sm font-semibold uppercase tracking-[0.25em] text-indigo-600">Ticket Board</p>
            <h1 className="mt-2 text-3xl font-semibold text-slate-900">Welcome back</h1>
            <p className="mt-2 text-sm text-slate-500">Sign in with your email and password to continue.</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Full name</label>
              <input value={name} onChange={(e) => setName(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="Alex Johnson" required />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
              <select onChange={e => setDept(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" name="dept" id="dept" value={dept}>
                <option value="" disabled={true}>Select a department</option>
                {departments.map((d) => (
                  <option key={d._id} value={d._id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select
                onChange={(e) => setRole(e.target.value)}
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                name="role"
                id="role"
                value={role}
                required
              >
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="you@example.com" required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="At least 4 characters" required />
            </div>

            {error ? <p className="rounded-lg border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</p> : null}

            <button type="submit" disabled={loading} className="w-full rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
              {loading ? 'Please wait...' : 'Create'}
            </button>
          </form>
        </div>
      </div>
    </AuthGuard>
  )
}