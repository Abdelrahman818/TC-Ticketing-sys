'use client';

import Link from 'next/link';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { API_ROUTES, apiRequest, getStoredUser } from '@/config';
import { AuthGuard } from '@/components/auth-guard';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

const ROLE_OPTIONS = [
  { value: 'employee', label: 'Employee' },
  { value: 'supervisor', label: 'Supervisor' },
  { value: 'manager', label: 'Manager' },
  { value: 'owner', label: 'Owner' },
];

function slugify(value) {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '');
}

const emptyForm = {
  name: '',
  key: '',
  color: '#64748b',
  isActive: true,
  isDefault: false,
  isFinal: false,
  visibleToRoles: ['employee', 'supervisor', 'manager', 'owner'],
};

export default function StagesPage() {
  const router = useRouter();
  const [user, setUser] = useState(() => getStoredUser());
  const [stages, setStages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editingStage, setEditingStage] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  const loadStages = async () => {
    try {
      const response = await apiRequest(API_ROUTES.stages.list);
      setStages(response?.data?.stages || []);
    } catch (err) {
      setError(err.message || 'Failed to load statuses');
      setStages([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || user.role !== 'owner') {
      router.replace('/');
      return;
    }

    void loadStages();
  }, [user, router]);

  const openCreate = () => {
    setEditingStage(null);
    setForm({
      ...emptyForm,
      key: '',
      visibleToRoles: ['employee', 'supervisor', 'manager', 'owner'],
    });
    setError('');
    setDialogOpen(true);
  };

  const openEdit = (stage) => {
    setEditingStage(stage);
    setForm({
      name: stage.name || '',
      key: stage.key || '',
      color: stage.color || '#64748b',
      isActive: stage.isActive !== false,
      isDefault: Boolean(stage.isDefault),
      isFinal: Boolean(stage.isFinal),
      visibleToRoles: Array.isArray(stage.visibleToRoles) && stage.visibleToRoles.length
        ? stage.visibleToRoles
        : ['employee', 'supervisor', 'manager', 'owner'],
    });
    setError('');
    setDialogOpen(true);
  };

  const closeDialogs = () => {
    setDialogOpen(false);
    setDeleteDialogOpen(false);
    setDeleteTarget(null);
    setError('');
  };

  const toggleRole = (role) => {
    setForm((prev) => ({
      ...prev,
      visibleToRoles: prev.visibleToRoles.includes(role)
        ? prev.visibleToRoles.filter((item) => item !== role)
        : [...prev.visibleToRoles, role],
    }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setError('');
    setSaving(true);

    try {
      const payload = {
        name: form.name.trim(),
        key: (form.key || slugify(form.name)).trim().toLowerCase(),
        color: form.color,
        isActive: form.isActive,
        isDefault: form.isDefault,
        isFinal: form.isFinal,
        visibleToRoles: form.visibleToRoles,
      };

      if (!editingStage) {
        payload.order = stages.length ? Math.max(...stages.map((stage) => stage.order || 0)) + 1 : 1;
        await apiRequest(API_ROUTES.stages.list, { method: 'POST', body: payload });
      } else {
        await apiRequest(API_ROUTES.stages.byId(editingStage._id), { method: 'PATCH', body: payload });
      }

      closeDialogs();
      await loadStages();
    } catch (err) {
      setError(err.message || 'Unable to save status');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;

    setSaving(true);
    setError('');

    try {
      await apiRequest(API_ROUTES.stages.byId(deleteTarget._id), { method: 'DELETE' });
      setDeleteDialogOpen(false);
      setDeleteTarget(null);
      await loadStages();
    } catch (err) {
      setError(err.message || 'Unable to delete status');
    } finally {
      setSaving(false);
    }
  };

  const orderedStages = [...stages].sort((a, b) => (a.order || 0) - (b.order || 0));

  if (!user || user.role !== 'owner' || loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <AuthGuard allowedRoles={['owner']}>
      <div className="min-h-full bg-[linear-gradient(135deg,#f8fbff_0%,#f7f8fc_100%)] p-6">
        <div className="mx-auto max-w-6xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-indigo-600">Administration</p>
              <h1 className="text-2xl font-semibold text-slate-900">Statuses</h1>
              <p className="mt-1 text-sm text-slate-500">Create new workflow columns and decide which roles can see each one.</p>
            </div>
            <div className="flex items-center gap-3">
              <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
                ← Back to board
              </Link>
              <Button onClick={openCreate} className="bg-indigo-600 text-white hover:bg-indigo-700">
                + New Status
              </Button>
            </div>
          </div>

          {error ? <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-600">{error}</div> : null}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm text-slate-600">
              <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Key</th>
                  <th className="px-4 py-3 font-medium">Visible to</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orderedStages.length === 0 ? (
                  <tr>
                    <td colSpan="5" className="py-8 text-center text-slate-400">No statuses found</td>
                  </tr>
                ) : (
                  orderedStages.map((stage) => (
                    <tr
                      key={stage._id}
                      className="hover:bg-slate-50/50"
                    >
                      <td className="px-4 py-3 font-medium text-slate-900">{stage.name}</td>
                      <td className="px-4 py-3">{stage.key}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-2">
                          {(stage.visibleToRoles || ['employee', 'supervisor', 'manager', 'owner']).map((role) => (
                            <span key={role} className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-600">
                              {role}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${stage.isActive === false ? 'bg-slate-100 text-slate-600' : 'bg-emerald-100 text-emerald-700'}`}>
                          {stage.isActive === false ? 'Inactive' : 'Active'}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <button onClick={() => openEdit(stage)} className="mr-3 font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                        <button onClick={() => { setDeleteTarget(stage); setDeleteDialogOpen(true); }} className="font-medium text-rose-600 hover:text-rose-800">Delete</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <Dialog open={dialogOpen} onOpenChange={(open) => { if (!open) closeDialogs(); else setDialogOpen(true); }}>
          <DialogContent className="max-w-xl rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-800">
                {editingStage ? 'Edit Status' : 'New Status'}
              </DialogTitle>
            </DialogHeader>
            <form onSubmit={handleSubmit} className="space-y-4 pt-4">
              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                    value={form.name}
                    onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                    required
                  />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Key</label>
                  <input
                    className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                    value={form.key}
                    placeholder="in_review"
                    onChange={(event) => setForm((prev) => ({ ...prev, key: event.target.value }))}
                  />
                </div>
              </div>

              <div className="grid gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-slate-700">Color</label>
                  <input
                    type="color"
                    className="h-10 w-full cursor-pointer rounded-xl border border-slate-200"
                    value={form.color}
                    onChange={(event) => setForm((prev) => ({ ...prev, color: event.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <label className="mb-1 block text-sm font-medium text-slate-700">Visibility</label>
                  <div className="flex flex-wrap gap-2">
                    {ROLE_OPTIONS.map((role) => (
                      <label key={role.value} className="flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm">
                        <input
                          type="checkbox"
                          checked={form.visibleToRoles.includes(role.value)}
                          onChange={() => toggleRole(role.value)}
                        />
                        {role.label}
                      </label>
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex flex-wrap gap-4">
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isActive}
                    onChange={(event) => setForm((prev) => ({ ...prev, isActive: event.target.checked }))}
                  />
                  Active
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isDefault}
                    onChange={(event) => setForm((prev) => ({ ...prev, isDefault: event.target.checked }))}
                  />
                  Default stage
                </label>
                <label className="flex items-center gap-2 text-sm font-medium text-slate-700">
                  <input
                    type="checkbox"
                    checked={form.isFinal}
                    onChange={(event) => setForm((prev) => ({ ...prev, isFinal: event.target.checked }))}
                  />
                  Final stage
                </label>
              </div>

              <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
                <Button type="button" variant="outline" onClick={closeDialogs}>Cancel</Button>
                <Button type="submit" disabled={saving}>{saving ? 'Saving...' : editingStage ? 'Save Changes' : 'Create Status'}</Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={deleteDialogOpen} onOpenChange={(open) => { if (!open) { setDeleteDialogOpen(false); setDeleteTarget(null); } else setDeleteDialogOpen(true); }}>
          <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
            <DialogHeader>
              <DialogTitle className="text-lg font-semibold text-slate-800">Delete status</DialogTitle>
            </DialogHeader>
            <p className="mb-6 text-sm text-slate-600">
              Delete {deleteTarget?.name || 'this status'}? If tickets are still using it, the status will be deactivated instead.
            </p>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => { setDeleteDialogOpen(false); setDeleteTarget(null); }}>Cancel</Button>
              <Button type="button" className="bg-rose-600 text-white hover:bg-rose-700" onClick={confirmDelete} disabled={saving}>
                {saving ? 'Deleting...' : 'Delete'}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </AuthGuard>
  );
}
