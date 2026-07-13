'use client';

import { Suspense, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { API_ROUTES, apiRequest, getStoredUser } from '@/config';
import { assignTicket, changeTicketStatus, deleteTicket, getTicketById, loadAssignableUsers, updateTicket, uploadTicketPhoto, deleteTicketPhoto } from '@/lib/tickets';
import Image from 'next/image';
import { CalendarDays, Clock, MessageSquare, Send } from 'lucide-react';

const PRIORITY_OPTIONS = [
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
];

function TicketDetailContent() {
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const ticketId = id || null;
  const [ticket, setTicket] = useState(null);
  const [statusOptions, setStatusOptions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [user, setUser] = useState(() => getStoredUser());
  const [photoFile, setPhotoFile] = useState(null);
  const [photoCaption, setPhotoCaption] = useState('');
  const [photoUploading, setPhotoUploading] = useState(false);

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    statusId: '',
    priority: 'medium',
  });

  const isController = user?.role === 'controller' || user?.role === 'owner';
  const isManager = user?.role === 'manager';
  const isSupervisor = user?.role === 'supervisor';
  const isEmployee = user?.role === 'employee';

  const canDelete = isController;
  const canEdit = isController || isManager || isSupervisor || (isEmployee && ticket && String(ticket.assignedUserId?._id || ticket.assignedUserId || '') === String(user?._id || user?.id || ''));
  const canAssign = isController || isManager || isSupervisor;

  const formatAssigneeLabel = (assignee) => {
    const roleLabel = assignee.role === 'supervisor' ? 'Supervisor' : 'Employee';
    const departmentName = assignee.departmentId?.name;
    return departmentName ? `${assignee.name} (${roleLabel} · ${departmentName})` : `${assignee.name} (${roleLabel})`;
  };

  const loadComments = async () => {
    if (!ticketId) return;
    try {
      const res = await apiRequest(API_ROUTES.tickets.comments(ticketId));
      setComments(res?.data?.comments || []);
    } catch (error) {
      console.error('Failed to load comments', error);
    }
  };

  useEffect(() => {
    let isMounted = true;

    async function loadDetails() {
      try {
        const [stageRes, deptRes] = await Promise.all([
          apiRequest(API_ROUTES.stages.list),
          apiRequest(API_ROUTES.departments.list),
        ]);

        if (isMounted) {
          setStatusOptions(
            (stageRes?.data?.stages || [])
              .filter((stage) => stage.isActive !== false)
              .map((stage) => ({ value: stage._id, label: stage.name })),
          );
          setDepartments(deptRes?.data?.departments || []);
        }
      } catch (error) {
        console.error('Failed to load stages or departments', error);
      }

      if (!ticketId) {
        return;
      }

      const currentTicket = await getTicketById(ticketId);
      if (!isMounted || !currentTicket) {
        return;
      }

      setTicket(currentTicket);
      setFormData({
        title: currentTicket.title,
        description: currentTicket.description,
        statusId: currentTicket.statusId,
        priority: currentTicket.priority,
      });
      
      // Load comments
      try {
        const commentRes = await apiRequest(API_ROUTES.tickets.comments(ticketId));
        if (isMounted) {
          setComments(commentRes?.data?.comments || []);
        }
      } catch (err) {
        console.error('Failed to load comments', err);
      }
    }

    void loadDetails();

    return () => {
      isMounted = false;
    };
  }, [ticketId]);

  if (!ticketId) {
    return <div className="p-8 text-center text-muted-foreground">Invalid ticket ID</div>;
  }

  if (!ticket) {
    return <div className="p-8 text-center text-red-500">Failed to load ticket</div>;
  }

  const handleSave = async () => {
    const changes = {};
    if (formData.title !== ticket.title) changes.title = formData.title;
    if (formData.description !== ticket.description) changes.description = formData.description;
    if (formData.priority !== ticket.priority) changes.priority = formData.priority;

    let updatedTicket = ticket;

    if (Object.keys(changes).length) {
      updatedTicket = await updateTicket(ticket.id, changes);
    }

    if (formData.statusId && formData.statusId !== ticket.statusId) {
      updatedTicket = await changeTicketStatus(ticket.id, formData.statusId);
    }

    setTicket(updatedTicket);
    setFormData((prev) => ({
      ...prev,
      title: updatedTicket.title,
      description: updatedTicket.description,
      statusId: updatedTicket.statusId,
      priority: updatedTicket.priority,
    }));
  };

  const handleDelete = async () => {
    await deleteTicket(ticket.id);
    setTicket(null);
  };

  const handleUploadPhoto = async () => {
    if (!photoFile) {
      return;
    }

    setPhotoUploading(true);
    try {
      const uploaded = await uploadTicketPhoto(ticket.id, photoFile, photoCaption);
      setTicket((prev) => ({
        ...prev,
        photos: [...(prev?.photos || []), uploaded],
      }));
      setPhotoFile(null);
      setPhotoCaption('');
    } catch (error) {
      console.error('Failed to upload photo', error);
    } finally {
      setPhotoUploading(false);
    }
  };

  const handleRemovePhoto = async (photoId) => {
    try {
      await deleteTicketPhoto(ticket.id, photoId);
      setTicket((prev) => ({
        ...prev,
        photos: (prev?.photos || []).filter((photo) => String(photo._id || photo.id) !== String(photoId)),
      }));
    } catch (error) {
      console.error('Failed to delete photo', error);
    }
  };

  const isDirty =
    formData.title !== ticket.title ||
    formData.description !== ticket.description ||
    formData.statusId !== ticket.statusId ||
    formData.priority !== ticket.priority;

  return (
    <div className="min-h-full bg-background p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground">
            ← Back to board
          </Link>
          <div className="flex gap-2">
            {canDelete && (
              <button onClick={handleDelete} className="inline-flex items-center gap-2 rounded-md border border-border px-3 py-2 text-sm hover:bg-accent transition">
                🗑 Delete
              </button>
            )}
            {canEdit && (
              <button onClick={handleSave} disabled={!isDirty} className="inline-flex items-center gap-2 rounded-md bg-primary px-3 py-2 text-sm text-primary-foreground disabled:opacity-50 transition">
                ✓ Save
              </button>
            )}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          <div className="space-y-4 rounded-lg border border-border bg-card p-5">
            <label className="block text-sm font-medium text-slate-700">Title</label>
            <input
              className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition"
              value={formData.title}
              onChange={(e) => setFormData((prev) => ({ ...prev, title: e.target.value }))}
              disabled={!canEdit}
            />
            <label className="block text-sm font-medium text-slate-700">Description</label>
            <textarea
              className="min-h-40 w-full rounded border border-border bg-background px-3 py-2 text-sm text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition"
              value={formData.description}
              onChange={(e) => setFormData((prev) => ({ ...prev, description: e.target.value }))}
              disabled={!canEdit}
            />
          </div>

          <div className="rounded-lg border border-border bg-card overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-indigo-500" />
                <h3 className="text-sm font-semibold text-slate-800">Comments</h3>
              </div>
              {comments.length > 0 && (
                <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 border border-indigo-100">
                  {comments.length}
                </span>
              )}
            </div>

            {/* Comment list */}
            <div className="max-h-90 overflow-y-auto px-5 py-4 space-y-5">
              {comments.length > 0 ? (
                comments.map((comment) => {
                  const name = comment.authorId?.name || 'Unknown';
                  const role = comment.authorId?.role;
                  const initials = name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2);
                  const ROLE_COLORS = {
                    controller: 'bg-violet-100 text-violet-700',
                    owner: 'bg-violet-100 text-violet-700',
                    manager: 'bg-blue-100 text-blue-700',
                    supervisor: 'bg-amber-100 text-amber-700',
                    employee: 'bg-emerald-100 text-emerald-700',
                  };
                  const avatarColor = role === 'controller' || role === 'owner' ? 'bg-violet-600' : role === 'manager' ? 'bg-blue-600' : role === 'supervisor' ? 'bg-amber-500' : 'bg-emerald-600';
                  return (
                    <div key={comment._id || comment.id} className="flex gap-3 group">
                      {/* Avatar */}
                      <div className={`shrink-0 h-8 w-8 rounded-full ${avatarColor} flex items-center justify-center text-[11px] font-bold text-white shadow-sm`}>
                        {initials}
                      </div>
                      {/* Bubble */}
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-1.5 mb-1">
                          <span className="text-sm font-semibold text-slate-800">{name}</span>
                          {role && (
                            <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${ROLE_COLORS[role] || 'bg-slate-100 text-slate-600'}`}>
                              {role}
                            </span>
                          )}
                          <span className="flex items-center gap-0.5 text-[10px] text-slate-400 ml-auto opacity-0 group-hover:opacity-100 transition-opacity">
                            <Clock className="h-2.5 w-2.5" />
                            {new Date(comment.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <div className="rounded-xl rounded-tl-sm bg-slate-50 border border-slate-100 px-3.5 py-2.5 text-sm text-slate-700 leading-relaxed whitespace-pre-wrap shadow-[0_1px_2px_rgba(15,23,42,0.04)]">
                          {comment.body}
                        </div>
                        <p className="mt-1 text-[10px] text-slate-400 group-hover:opacity-0 transition-opacity">
                          {new Date(comment.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })}
                        </p>
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center py-10 text-center">
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-slate-100 mb-3">
                    <MessageSquare className="h-5 w-5 text-slate-400" />
                  </div>
                  <p className="text-sm font-medium text-slate-600">No comments yet</p>
                  <p className="text-xs text-slate-400 mt-0.5">Be the first to leave a comment below.</p>
                </div>
              )}
            </div>

            {/* Compose area */}
            <div className="border-t border-border bg-slate-50/60 px-5 py-4">
              <div className="flex gap-3">
                <div className="flex-1 relative">
                  <textarea
                    className="w-full min-h-19 resize-none rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-sm text-slate-800 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition shadow-sm"
                    placeholder="Write a comment… (Ctrl+Enter to send)"
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && newComment.trim() && !submittingComment) {
                        e.preventDefault();
                        e.target.closest('div').querySelector('button').click();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={submittingComment || !newComment.trim()}
                  onClick={async () => {
                    if (!newComment.trim()) return;
                    setSubmittingComment(true);
                    try {
                      await apiRequest(API_ROUTES.tickets.comments(ticketId), {
                        method: 'POST',
                        body: { body: newComment, visibility: 'public' },
                      });
                      setNewComment('');
                      await loadComments();
                    } catch (error) {
                      console.error('Failed to post comment', error);
                    } finally {
                      setSubmittingComment(false);
                    }
                  }}
                  className="self-end flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  title="Post comment (Ctrl+Enter)"
                >
                  {submittingComment ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          <div className="space-y-4 rounded-lg border border-border bg-card p-5">
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">⚑ Status</label>
              <select
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition"
                value={formData.statusId}
                onChange={(e) => setFormData((prev) => ({ ...prev, statusId: e.target.value }))}
                disabled={!canEdit}
              >
                {statusOptions.length
                  ? statusOptions.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)
                  : ['todo', 'in_progress', 'done'].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </div>
            <div>
              <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">⚑ Priority</label>
              <select
                className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-slate-800 disabled:bg-slate-50 disabled:text-slate-500 disabled:cursor-not-allowed transition"
                value={formData.priority}
                onChange={(e) => setFormData((prev) => ({ ...prev, priority: e.target.value }))}
                disabled={!canEdit}
              >
                {PRIORITY_OPTIONS.map((option) => <option key={option.value} value={option.value}>{option.label}</option>)}
              </select>
            </div>
            <div className="space-y-2 border-t border-border pt-4 text-sm">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-500">Assignee</span><span className="font-semibold text-slate-700 text-right">{ticket.assignedTo || 'Unassigned'}</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2 text-slate-500">Department</span><span className="font-semibold text-slate-700 text-right">{ticket.assignedDepartmentId?.name || 'Unassigned'}</span></div>
            </div>
            <div className="space-y-4 border-t border-border pt-4">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h4 className="text-sm font-semibold text-slate-800">Ticket Images</h4>
                  <p className="text-xs text-slate-500">Attach a supporting image for this ticket.</p>
                </div>
                <button
                  type="button"
                  onClick={handleUploadPhoto}
                  disabled={!photoFile || photoUploading}
                  className="rounded-full bg-indigo-600 px-3 py-2 text-xs font-semibold text-white hover:bg-indigo-700 disabled:opacity-50 transition"
                >
                  {photoUploading ? 'Uploading…' : 'Upload image'}
                </button>
              </div>

              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => setPhotoFile(e.target.files?.[0] || null)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-slate-800"
                />
                <input
                  type="text"
                  placeholder="Image caption (optional)"
                  value={photoCaption}
                  onChange={(e) => setPhotoCaption(e.target.value)}
                  className="w-full rounded-xl border border-border bg-background px-3 py-2 text-sm text-slate-800"
                />
              </div>

              {ticket.photos?.length > 0 && (
                <div className="space-y-3 pt-3">
                  {ticket.photos.map((photo) => (
                    <div key={photo._id || photo.id} className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-900">{photo.filename || 'Uploaded image'}</p>
                          {photo.caption ? <p className="mt-1 text-xs text-slate-500">{photo.caption}</p> : null}
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(photo._id || photo.id)}
                          className="rounded-full border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition"
                        >
                          Delete
                        </button>
                      </div>
                      <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200">
                        <div className="relative h-48 w-full">
                          <Image src={photo.url} alt={photo.caption || 'Ticket attachment'} fill className="object-cover" />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {canAssign && (
              <div className="space-y-3 pt-2 border-t border-border">
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">Reassign to</label>
                  <select
                    className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-slate-800 transition"
                    value={ticket.assignedUserId?._id || ticket.assignedUserId || ''}
                    onChange={async (e) => {
                      const assignedUserId = e.target.value || null;
                      const updated = await assignTicket(ticket.id, {
                        assignedUserId,
                        assignedDepartmentId: ticket.assignedDepartmentId?._id || ticket.assignedDepartmentId || null,
                      });
                      setTicket(updated);
                    }}
                  >
                    <option value="">Department inbox (unassigned)</option>
                    {assignableUsers.map((assignee) => (
                      <option key={assignee._id} value={assignee._id}>
                        {formatAssigneeLabel(assignee)}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="mb-1 flex items-center gap-2 text-sm font-medium text-slate-700">Reassign Department</label>
                  <select className="w-full rounded border border-border bg-background px-3 py-2 text-sm text-slate-800 transition" value="" onChange={async (e) => {
                    if (e.target.value) {
                      const updated = await assignTicket(ticket.id, { assignedDepartmentId: e.target.value });
                      setTicket(updated);
                    }
                  }}>
                    <option value="">Select to reassign...</option>
                    {departments.map((dept) => <option key={dept._id} value={dept._id}>{dept.name}</option>)}
                  </select>
                </div>
              </div>
            )}
            <div className="space-y-2 border-t border-border pt-4 text-sm text-muted-foreground">
              <div className="flex items-center justify-between"><span className="flex items-center gap-2"><CalendarDays className="h-3.5 w-3.5 text-slate-400" /> Created</span><span>{new Date(ticket.createdAt).toLocaleString()}</span></div>
              <div className="flex items-center justify-between"><span className="flex items-center gap-2"><Clock className="h-3.5 w-3.5 text-slate-400" /> Updated</span><span>{new Date(ticket.updatedAt).toLocaleString()}</span></div>
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-lg border border-border bg-card p-5">
          <h3 className="text-lg font-semibold mb-4">Ticket History</h3>
          <div className="space-y-4">
            {ticket.history?.length > 0 ? (
              ticket.history.map((entry, idx) => {
                const changerName = entry.changedBy?.name || 'System';
                const changerRole = entry.changedBy?.role ? `(${entry.changedBy.role})` : '';
                const fromStatus = entry.fromStatusId?.name;
                const toStatus = entry.toStatusId?.name;

                return (
                  <div key={idx} className="border-b border-border pb-4 last:border-0 last:pb-0">
                    <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between text-sm">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-semibold text-slate-800 capitalize">
                          {entry.action.replace(/_/g, ' ')}
                        </span>
                        <span className="text-xs text-slate-400">
                          by <span className="font-medium text-slate-600">{changerName}</span> {changerRole}
                        </span>
                        {fromStatus && toStatus && (
                          <span className="text-xs rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 font-medium">
                            {fromStatus} → {toStatus}
                          </span>
                        )}
                      </div>
                      <span className="text-xs text-muted-foreground shrink-0">
                        {new Date(entry.createdAt).toLocaleString()}
                      </span>
                    </div>
                    {entry.note && (
                      <div className="text-xs italic bg-slate-50 border border-slate-100 rounded px-2.5 py-1.5 text-slate-600 mt-2">
                        Note: {entry.note}
                      </div>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="text-sm text-muted-foreground">No history available.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default function TicketDetailPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-muted-foreground">Loading ticket...</div>}>
      <TicketDetailContent />
    </Suspense>
  );
}
