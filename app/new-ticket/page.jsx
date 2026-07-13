'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { createTicket, loadAssignableUsers } from '@/lib/tickets';
import { API_ROUTES, apiRequest, getStoredUser } from '@/config';

const ASSIGNABLE_ROLES = new Set(['supervisor', 'manager', 'controller', 'owner']);

function formatAssigneeLabel(user) {
  const roleLabel = user.role === 'supervisor' ? 'Supervisor' : 'Employee';
  const departmentName = user.departmentId?.name;
  return departmentName ? `${user.name} (${roleLabel} · ${departmentName})` : `${user.name} (${roleLabel})`;
}

export default function NewTicketPage() {
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

  useEffect(() => {
    if (!canAssign) {
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
  }, [canAssign, form.assignedDepartmentId]);

  const handleChange = (field, value) => setForm((prev) => ({ ...prev, [field]: value }));

  const onSubmit = async (event) => {
    event.preventDefault();

    try {
      await createTicket(form);
      window.location.href = '/';
    } catch (error) {
      console.error('Unable to create ticket', error);
    }
  };

  return (
    <div className="min-h-full bg-[linear-gradient(135deg,#f8fbff_0%,#f7f8fc_100%)] p-6">
      <div className="mx-auto max-w-3xl rounded-3xl border border-slate-200/80 bg-white p-6 shadow-[0_20px_60px_rgba(15,23,42,0.08)]">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-indigo-600">Create ticket</p>
            <h1 className="text-2xl font-semibold text-slate-900">New Ticket</h1>
          </div>
          <Link href="/" className="text-sm font-medium text-slate-500 hover:text-slate-800">
            ← Back to board
          </Link>
        </div>

        <form onSubmit={onSubmit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Title</label>
            <input className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" value={form.title} onChange={(e) => handleChange('title', e.target.value)} required />
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
              <p className="mt-1 text-xs text-slate-500">
                Optionally assign this ticket to a specific employee or supervisor.
              </p>
            </div>
          )}

          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Description</label>
            <textarea className="min-h-32 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm outline-none" value={form.description} onChange={(e) => handleChange('description', e.target.value)} required />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Link href="/" className="inline-flex items-center justify-center rounded-full border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              Cancel
            </Link>
            <button type="submit" className="inline-flex items-center justify-center rounded-full bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm transition hover:bg-indigo-700">
              Create Ticket
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
