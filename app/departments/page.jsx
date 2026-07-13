'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { getDepartments, createDepartment, updateDepartment, deleteDepartment } from '@/lib/departments';
import { getStoredUser } from '@/config';
import { useRouter } from 'next/navigation';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';

export default function DepartmentsPage() {
  const router = useRouter();
  const [departments, setDepartments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(() => getStoredUser());

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingDept, setEditingDept] = useState(null);
  
  const [form, setForm] = useState({ name: '', description: '', isActive: true });

  const loadDepartments = async () => {
    try {
      const data = await getDepartments();
      setDepartments(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!user || (user.role !== 'controller' && user.role !== 'owner')) {
      router.replace('/');
      return;
    }
    const run = async () => {
      await loadDepartments();
    };
    void run();
  }, [user, router]);

  const handleOpenNew = () => {
    setEditingDept(null);
    setForm({ name: '', description: '', isActive: true });
    setDialogOpen(true);
  };

  const handleOpenEdit = (dept) => {
    setEditingDept(dept);
    setForm({ name: dept.name, description: dept.description || '', isActive: dept.isActive ?? true });
    setDialogOpen(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this department? This will unassign any related tickets.')) return;
    try {
      await deleteDepartment(id);
      loadDepartments();
    } catch (err) {
      alert(err.message || 'Error deleting department');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingDept) {
        await updateDepartment(editingDept._id, form);
      } else {
        await createDepartment(form);
      }
      setDialogOpen(false);
      loadDepartments();
    } catch (err) {
      alert(err.message || 'Error saving department');
    }
  };

  if (!user || (user.role !== 'controller' && user.role !== 'owner') || loading) {
    return <div className="p-8 text-center text-slate-500">Loading...</div>;
  }

  return (
    <div className="min-h-full bg-[linear-gradient(135deg,#f8fbff_0%,#f7f8fc_100%)] p-6">
      <div className="mx-auto max-w-5xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">Administration</p>
            <h1 className="text-2xl font-semibold text-slate-900">Departments</h1>
          </div>
          <div className="flex items-center gap-3">
            <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
              ← Back to board
            </Link>
            <Button onClick={handleOpenNew} className="bg-indigo-600 hover:bg-indigo-700 text-white">
              + New Department
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50 text-xs uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Description</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {departments.length === 0 ? (
                <tr>
                  <td colSpan="4" className="py-8 text-center text-slate-400">No departments found</td>
                </tr>
              ) : (
                departments.map((dept) => (
                  <tr key={dept._id} className="hover:bg-slate-50/50">
                    <td className="px-4 py-3 font-medium text-slate-900">{dept.name}</td>
                    <td className="px-4 py-3">{dept.description || '-'}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${dept.isActive ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                        {dept.isActive ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button onClick={() => handleOpenEdit(dept)} className="mr-3 font-medium text-indigo-600 hover:text-indigo-800">Edit</button>
                      <button onClick={() => handleDelete(dept._id)} className="font-medium text-rose-600 hover:text-rose-800">Delete</button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
          <DialogHeader>
            <DialogTitle className="text-lg font-semibold text-slate-800">
              {editingDept ? 'Edit Department' : 'New Department'}
            </DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4 pt-4">
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Name</label>
              <input 
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" 
                value={form.name} 
                onChange={(e) => setForm({ ...form, name: e.target.value })} 
                required 
              />
            </div>
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
              <textarea 
                className="w-full min-h-24 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" 
                value={form.description} 
                onChange={(e) => setForm({ ...form, description: e.target.value })} 
              />
            </div>
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="isActive" 
                checked={form.isActive} 
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })} 
                className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-600"
              />
              <label htmlFor="isActive" className="text-sm font-medium text-slate-700">Active Department</label>
            </div>
            <div className="flex justify-end gap-2 pt-4 border-t border-slate-100">
              <Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button type="submit">{editingDept ? 'Save Changes' : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
