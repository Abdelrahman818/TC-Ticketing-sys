'use client';

import { Suspense, useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
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
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = searchParams.get('id');
  const ticketId = id || null;
  const [ticket, setTicket] = useState({});
  const [statusOptions, setStatusOptions] = useState([]);
  const [departments, setDepartments] = useState([]);
  const [assignableUsers, setAssignableUsers] = useState([]);
  const [comments, setComments] = useState([]);
  const [whatsappMessages, setWhatsappMessages] = useState([]);
  const [whatsappStatus, setWhatsappStatus] = useState(null);
  const [whatsappError, setWhatsappError] = useState('');
  const [newComment, setNewComment] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [ticketComment, setTicketComment] = useState('');
  const [submittingTicketComment, setSubmittingTicketComment] = useState(false);
  const user = getStoredUser();
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
  const isWhatsappTicket = ticket?.type === 'whatsapp';
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

  const loadWhatsappConversation = useCallback(async () => {
    if (!ticketId) return;
    const response = await apiRequest(API_ROUTES.tickets.whatsappConversation(ticketId));
    setWhatsappMessages(response?.data?.conversation?.messages || []);
  }, [ticketId]);

  useEffect(() => {
    if (!isWhatsappTicket || !ticketId) {
      return undefined;
    }

    const loadWhatsappState = async () => {
      try {
        const statusResponse = await apiRequest(API_ROUTES.whatsapp.status);
        setWhatsappStatus(statusResponse?.data?.whatsapp || null);
      } catch (error) {
        setWhatsappStatus({ state: 'error', error: error.message });
      }

      try {
        await loadWhatsappConversation();
      } catch (error) {
        console.error('Failed to load WhatsApp conversation', error);
      }
    };

    void loadWhatsappState();
    const interval = window.setInterval(loadWhatsappState, 3000);
    return () => window.clearInterval(interval);
  }, [isWhatsappTicket, ticketId, loadWhatsappConversation]);

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
      const users = await loadAssignableUsers(currentTicket.assignedDepartmentId?._id || currentTicket.assignedDepartmentId || null);
      if (isMounted) {
        setAssignableUsers(users);
      }
      
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
    router.replace('/');
  };

  const handleSendWhatsappMessage = async () => {
    const body = newComment.trim();
    if (!body || submittingComment) {
      return;
    }

    setSubmittingComment(true);
    setWhatsappError('');
    try {
      await apiRequest(API_ROUTES.whatsapp.sendMessage(ticketId), {
        method: 'POST',
        body: { body },
      });
      setNewComment('');
      await loadWhatsappConversation();
    } catch (error) {
      setWhatsappError(error.message || 'Unable to send WhatsApp message');
      console.error('Failed to send WhatsApp message', error);
    } finally {
      setSubmittingComment(false);
    }
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

        {isWhatsappTicket && (
          <section className="rounded-lg border border-green-200 bg-green-50/60 p-5">
            <div className="mb-4 flex items-center gap-2 text-green-700">
              <MessageSquare className="h-4 w-4" />
              <h2 className="text-sm font-semibold uppercase tracking-[0.12em]">WhatsApp request</h2>
            </div>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-700/70">Name</p><p className="mt-1 font-semibold text-slate-800">{ticket.clientName || '—'}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-700/70">Phone</p><p className="mt-1 font-semibold text-slate-800">{ticket.clientPhone || '—'}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-700/70">Area</p><p className="mt-1 font-semibold text-slate-800">{ticket.clientArea || '—'}</p></div>
              <div><p className="text-xs font-semibold uppercase tracking-[0.12em] text-green-700/70">Inquiry</p><p className="mt-1 font-semibold text-slate-800">{ticket.inquiry || '—'}</p></div>
            </div>
          </section>
        )}

        <div className="grid gap-6 lg:grid-cols-[2fr_1fr]">
          {isWhatsappTicket ? (
            <div className="flex h-screen flex-col overflow-hidden rounded-lg border border-green-200 bg-[#efeae2] shadow-sm">
              <div className="flex items-center gap-3 border-b border-green-200 bg-green-700 px-5 py-4 text-white">
                <div className="flex h-10 w-10 items-center justify-center rounded-full bg-white/15"><MessageSquare className="h-5 w-5" /></div>
                <div>
                  <h2 className="text-sm font-semibold">WhatsApp conversation</h2>
                  <p className="text-xs text-green-100">{ticket.clientName || 'Client'} · {ticket.clientPhone || 'Phone unavailable'}</p>
                </div>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto p-5">
                {whatsappMessages.length > 0 ? whatsappMessages.map((message) => {
                  const isClientMessage = message.direction === 'client';
                  const isBotMessage = message.direction === 'bot';
                  return (
                    <div key={message._id || `${message.createdAt}-${message.body}`} className={`flex ${isClientMessage ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[82%] rounded-2xl px-4 py-2.5 text-sm shadow-sm ${isClientMessage ? 'rounded-tl-sm bg-white text-slate-700' : isBotMessage ? 'rounded-tr-sm bg-green-100 text-green-950' : 'rounded-tr-sm bg-indigo-100 text-indigo-950'}`}>
                        <p className="mb-1 text-[10px] font-semibold uppercase tracking-[0.12em] opacity-60">{isClientMessage ? 'Client' : isBotMessage ? 'Bot' : 'Employee'}</p>
                        <p className="whitespace-pre-wrap leading-relaxed">{message.body}</p>
                        <p className="mt-1 text-right text-[10px] opacity-50">{new Date(message.createdAt).toLocaleString()}</p>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="flex h-full items-center justify-center text-sm text-slate-500">No messages yet</div>
                )}
              </div>

              <div className="border-t border-slate-300/70 bg-[#f7f4ef] p-4">
                <div className="flex items-end gap-3">
                  <textarea
                    className="min-h-12 flex-1 resize-none rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition focus:border-green-500 focus:ring-2 focus:ring-green-500/20"
                    placeholder="Write a WhatsApp message..."
                    value={newComment}
                    onChange={(e) => setNewComment(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
                        e.preventDefault();
                        void handleSendWhatsappMessage();
                      }
                    }}
                  />
                  <button type="button" onClick={handleSendWhatsappMessage} disabled={submittingComment || !newComment.trim() || whatsappStatus?.state !== 'connected'} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-green-600 text-white shadow-sm transition hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-40" title="Send WhatsApp message">
                    {submittingComment ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : <Send className="h-4 w-4" />}
                  </button>
                </div>
                {whatsappStatus?.state && whatsappStatus.state !== 'connected' && (
                  <p className="mt-2 text-xs text-amber-700">WhatsApp is {whatsappStatus.state.replace('_', ' ')}. Sending is temporarily unavailable.</p>
                )}
                {whatsappError && <p className="mt-2 text-xs text-red-700">{whatsappError}</p>}
              </div>
            </div>
          ) : (
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
          )}

          <div className={`rounded-lg border border-border bg-card overflow-hidden ${isWhatsappTicket ? 'lg:col-start-2 lg:row-start-1' : ''}`}>
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
                    value={ticketComment}
                    onChange={(e) => setTicketComment(e.target.value)}
                    onKeyDown={(e) => {
                      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter' && ticketComment.trim() && !submittingTicketComment) {
                        e.preventDefault();
                        e.target.closest('div').querySelector('button').click();
                      }
                    }}
                  />
                </div>
                <button
                  type="button"
                  disabled={submittingTicketComment || !ticketComment.trim()}
                  onClick={async () => {
                    if (!ticketComment.trim()) return;
                    setSubmittingTicketComment(true);
                    try {
                      await apiRequest(API_ROUTES.tickets.comments(ticketId), {
                        method: 'POST',
                        body: { body: ticketComment, visibility: 'public' },
                      });
                      setTicketComment('');
                      await loadComments();
                    } catch (error) {
                      console.error('Failed to post comment', error);
                    } finally {
                      setSubmittingTicketComment(false);
                    }
                  }}
                  className="self-end flex items-center justify-center h-10 w-10 rounded-xl bg-indigo-600 text-white shadow-sm hover:bg-indigo-700 active:scale-95 transition-all disabled:opacity-40 disabled:pointer-events-none"
                  title="Post comment (Ctrl+Enter)"
                >
                  {submittingTicketComment ? (
                    <span className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                  ) : (
                    <Send className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className={`space-y-4 rounded-lg border border-border bg-card p-5 ${isWhatsappTicket ? 'lg:col-start-2 lg:row-start-2' : ''}`}>
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
            {!isWhatsappTicket && <div className="space-y-4 border-t border-border pt-4">
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
            </div>}
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
