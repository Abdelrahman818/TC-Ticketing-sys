'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { API_ROUTES, apiRequest, getStoredUser } from '@/config';
import { AuthGuard } from '@/components/auth-guard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'controller', label: 'Controller' },
  { value: 'owner', label: 'Owner' },
];

export default function UserPanelPage() {
  const router = useRouter();
  const params = useParams();
  const userId = params?.id;
  const [currentUser, setCurrentUser] = useState(() => getStoredUser());
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'employee',
    departmentId: '',
    isActive: true,
  });
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const isController = currentUser?.role === 'controller' || currentUser?.role === 'owner';

  useEffect(() => {
    if (!currentUser || (currentUser.role !== 'controller' && currentUser.role !== 'owner')) {
      router.replace('/');
      return;
    }

    const loadData = async () => {
      try {
        const [userRes, departmentsRes] = await Promise.all([
          apiRequest(`${API_ROUTES.users.byId(userId)}`),
          apiRequest(API_ROUTES.departments.list),
        ]);

        const user = userRes?.data?.user;
        if (user) {
          setForm({
            name: user.name || '',
            email: user.email || '',
            password: '',
            role: user.role || 'employee',
            departmentId: user.departmentId?._id || user.departmentId || '',
            isActive: user.isActive !== false,
          });
        }

        setDepartments(departmentsRes?.data?.departments || []);
      } catch (err) {
        console.error('Failed to load user panel', err);
        setError(err.message || 'Failed to load user details');
      } finally {
        setLoading(false);
      }
    };

    if (userId) {
      void loadData();
    }
  }, [currentUser, router, userId]);

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSuccess('');
    setSaving(true);

    try {
      const payload = {
        name: form.name,
        email: form.email,
        role: form.role,
        departmentId: form.departmentId || null,
        isActive: form.isActive,
      };

      if (form.password) {
        payload.password = form.password;
      }

      await apiRequest(API_ROUTES.users.byId(userId), {
        method: 'PATCH',
        body: payload,
      });

      setSuccess('User updated successfully');
    } catch (err) {
      setError(err.message || 'Unable to update user');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRequest = () => {
    setShowDeleteDialog(true);
  };

  const confirmDelete = async () => {
    setError('');
    setSuccess('');
    setDeleting(true);

    try {
      await apiRequest(API_ROUTES.users.byId(userId), {
        method: 'DELETE',
      });
      setShowDeleteDialog(false);
      router.replace('/users');
    } catch (err) {
      setError(err.message || 'Unable to delete user');
    } finally {
      setDeleting(false);
    }
  };

  const title = useMemo(() => (isController ? 'User Panel' : 'Access denied'), [isController]);

  if (!isController || loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <AuthGuard allowedRoles={['controller', 'owner']}>
      <div className="min-h-full bg-[linear-gradient(135deg,#f8fbff_0%,#f7f8fc_100%)] p-6">
        <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-600">Administration</p>
              <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
            </div>
            <Link href="/users" className="text-sm font-medium text-slate-500 hover:text-slate-800">
              ← Back to users
            </Link>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {error ? <div className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div> : null}
            {success ? <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-600">{success}</div> : null}

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input value={form.name} onChange={(e) => handleChange('name', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Email</label>
              <input type="email" value={form.email} onChange={(e) => handleChange('email', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" required />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Password</label>
              <input type="password" value={form.password} onChange={(e) => handleChange('password', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" placeholder="Leave blank to keep current password" />
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Role</label>
              <select value={form.role} onChange={(e) => handleChange('role', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
                {ROLE_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
              <select value={form.departmentId} onChange={(e) => handleChange('departmentId', e.target.value)} className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none">
                <option value="">No department</option>
                {departments.map((dept) => (
                  <option key={dept._id} value={dept._id}>{dept.name}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
              <input id="isActive" type="checkbox" checked={form.isActive} onChange={(e) => handleChange('isActive', e.target.checked)} className="h-4 w-4 rounded border-slate-300" />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active account</label>
            </div>

            <div className="flex gap-3">
              <button type="submit" disabled={saving || deleting} className="flex-1 rounded-full bg-indigo-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-60">
                {saving ? 'Saving...' : 'Save changes'}
              </button>
              <button type="button" onClick={handleDeleteRequest} disabled={deleting || saving} className="rounded-full bg-rose-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </form>
        </div>

        <Dialog open={showDeleteDialog}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Delete user</DialogTitle>
            </DialogHeader>
            <p className="mb-6 text-sm text-slate-600">This action cannot be undone. Remove this account from the system?</p>
            <div className="flex justify-end gap-3">
              <button type="button" onClick={() => setShowDeleteDialog(false)} className="rounded-full border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">
                Cancel
              </button>
              <button type="button" onClick={confirmDelete} disabled={deleting} className="rounded-full bg-rose-600 px-4 py-2 text-sm font-semibold text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:opacity-60">
                {deleting ? 'Deleting...' : 'Delete user'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
