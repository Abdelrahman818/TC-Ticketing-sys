'use client';

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { apiRequest, API_ROUTES } from "@/config";
import { AuthGuard } from '@/components/auth-guard';
import { ArrowLeft, Check } from "lucide-react";

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'controller', label: 'Controller' },
];

export default function CreateUserPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState('employee');
  const [dept, setDept] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
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
    setSuccess('');
    setLoading(true);

    try {
      // Use the existing user creation endpoint
      const payload = {
        name,
        email,
        role,
        departmentId: dept || null,
      };

      const res = await apiRequest(
        API_ROUTES.auth.register,
        { method: 'POST', body: payload }
      );

      if (!res?.success) {
        throw new Error(res?.message || 'Failed to create user');
      }

      setSuccess(`User "${name}" created successfully!`);
      setEmail('');
      setName('');
      setRole('employee');
      setDept('');
      
    } catch (err) {
      const message = err?.message || 'Failed to create user. Please try again.';
      setError(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AuthGuard allowedRoles={['controller', 'owner']}>
      <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
        <div className="mx-auto max-w-2xl">
          {/* Header */}
          <div className="mb-8">
            <button
              onClick={() => router.back()}
              className="mb-4 flex items-center gap-2 text-sm text-slate-600 hover:text-slate-900"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </button>
            <div>
              <h1 className="text-3xl font-bold text-slate-900">Create New User</h1>
              <p className="mt-2 text-slate-600">Add a new employee to your organization</p>
            </div>
          </div>

          {/* Form Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-8 shadow-sm">
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">Full Name *</label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="Alex Johnson"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">Email Address *</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                    placeholder="alex@example.com"
                    required
                  />
                </div>

                <div>
                  <label className="mb-2 block text-sm font-medium text-slate-900">Role *</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
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
                  <label className="mb-2 block text-sm font-medium text-slate-900">Department</label>
                  <select
                    value={dept}
                    onChange={(e) => setDept(e.target.value)}
                    className="w-full rounded-lg border border-slate-300 bg-white px-4 py-2.5 text-sm outline-none transition focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
                  >
                    <option value="">None</option>
                    {departments.map((d) => (
                      <option key={d._id} value={d._id}>{d.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Messages */}
              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                  {error}
                </div>
              )}

              {success && (
                <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
                  <Check className="h-4 w-4" />
                  {success}
                </div>
              )}

              {/* Actions */}
              <div className="flex gap-3">
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 rounded-lg bg-indigo-600 px-4 py-2.5 font-medium text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {loading ? 'Creating...' : 'Create User'}
                </button>
                <button
                  type="button"
                  onClick={() => router.back()}
                  className="flex-1 rounded-lg border border-slate-300 px-4 py-2.5 font-medium text-slate-700 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </AuthGuard>
  );
}
