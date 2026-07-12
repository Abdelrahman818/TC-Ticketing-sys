'use client';

import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { createTicket, loadAssignableUsers } from '@/lib/tickets';
import { API_ROUTES, apiRequest, getStoredUser } from '@/config';

const ASSIGNABLE_ROLES = new Set(['supervisor', 'manager', 'owner']);

function formatAssigneeLabel(user) {
  const roleLabel = user.role === 'supervisor' ? 'Supervisor' : 'Employee';
  const departmentName = user.departmentId?.name;
  return departmentName ? `${user.name} (${roleLabel} · ${departmentName})` : `${user.name} (${roleLabel})`;
}

export function CreateTicketDialog() {
  const [open, setOpen] = useState(false);
  const [user] = useState(() => getStoredUser());
  const [departments, setDepartments] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    priority: 'medium',
    assignedDepartmentId: '',
    assignedUserId: '',
  });

  const canAssign = ASSIGNABLE_ROLES.has(user?.role);
  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

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
    if (open) {
      fetchDepartments();
    }
    return () => { isMounted = false; };
  }, [open]);

  useEffect(() => {
    if (!open || !canAssign) {
      return undefined;
    }

    let isMounted = true;
    async function fetchAssignableUsers() {
      try {
        const users = await loadAssignableUsers(form.assignedDepartmentId || null);
        if (isMounted) {
          setAssignableUsers(users);
        }
      } catch (error) {
        console.error('Failed to load assignable users', error);
        if (isMounted) {
          setAssignableUsers([]);
        }
      }
    }

    fetchAssignableUsers();
    return () => { isMounted = false; };
  }, [open, canAssign, form.assignedDepartmentId]);

  const onSubmit = async (e) => {
    e.preventDefault();

    try {
      await createTicket(form);
      setOpen(false);
      setForm({
        title: '',
        description: '',
        priority: 'medium',
        assignedDepartmentId: '',
        assignedUserId: '',
      });
    } catch (error) {
      console.error('Unable to create ticket', error);
    }
  };

  return (
    <Dialog open={open}>
      <DialogTrigger asChild>
        <Button size="sm" className="h-8 gap-1.5" onClick={() => setOpen(true)}>
          +
          <span>New Ticket</span>
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg rounded-2xl border border-slate-200 bg-white p-5 shadow-[0_20px_60px_rgba(15,23,42,0.12)]">
        <DialogHeader>
          <DialogTitle className="text-lg font-semibold text-slate-800">Create New Ticket</DialogTitle>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4 pt-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none ring-0" value={form.title} onChange={(e) => handleChange('title', e.target.value)} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Priority</label>
            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" value={form.priority} onChange={(e) => handleChange('priority', e.target.value)}>
              <option value="low">Low</option>
              <option value="medium">Medium</option>
              <option value="high">High</option>
              <option value="urgent">Urgent</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Department</label>
            <select className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" value={form.assignedDepartmentId} onChange={(e) => handleChange('assignedDepartmentId', e.target.value)}>
              <option value="">Use my department (default)</option>
              {departments.map((dept) => (
                <option key={dept._id} value={dept._id}>{dept.name}</option>
              ))}
            </select>
          </div>
          {canAssign && (
            <div>
              <label className="mb-1 block text-sm font-medium text-slate-700">Assign to</label>
              <select
                className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none"
                value={form.assignedUserId}
                onChange={(e) => handleChange('assignedUserId', e.target.value)}
              >
                <option value="">Department inbox (unassigned)</option>
                {assignableUsers.map((assignee) => (
                  <option key={assignee._id} value={assignee._id}>
                    {formatAssigneeLabel(assignee)}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea className="min-h-28 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" value={form.description} onChange={(e) => handleChange('description', e.target.value)} required />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button type="submit">Create Ticket</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
