import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { changeTicketStatus, assignTicket } from '@/lib/tickets';
import { getStoredUser } from '@/config';

const PRIORITY_STYLES = {
  low: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  medium: 'border-sky-200 bg-sky-50 text-sky-700',
  high: 'border-amber-200 bg-amber-50 text-amber-700',
  urgent: 'border-rose-200 bg-rose-50 text-rose-700',
};

const STATUS_STYLES = {
  todo: 'border-slate-200 bg-slate-50 text-slate-600',
  in_progress: 'border-sky-200 bg-sky-50 text-sky-700',
  in_review: 'border-violet-200 bg-violet-50 text-violet-700',
  done: 'border-emerald-200 bg-emerald-50 text-emerald-700',
};

export function TicketCard({ ticket, statusOptions = [], onStatusChange, draggableProps = {}, dragHandleProps = {}, innerRef }) {
  const router = useRouter();
  const [currentTicket, setCurrentTicket] = useState(ticket);

  useEffect(() => {
    // eslint-disable-next-line
    setCurrentTicket(ticket);
  }, [ticket]);

  const statusChoices = statusOptions.length
    ? statusOptions.map((option) => ({ value: option.key, label: option.name, id: option.id }))
    : [
        { value: 'todo', label: 'To Do', id: null },
        { value: 'in_progress', label: 'In Progress', id: null },
        { value: 'done', label: 'Done', id: null },
      ];

  const handleStatusChange = async (e) => {
    e.preventDefault();
    e.stopPropagation();
    const newStatusKey = e.target.value;

    if (newStatusKey === currentTicket.status) return;

    const previousStatus = currentTicket.status;
    setCurrentTicket({ ...currentTicket, status: newStatusKey });

    if (onStatusChange) {
      onStatusChange(ticket.id, { status: newStatusKey });
    }

    try {
      // Find the stage _id to send to the API
      const choice = statusChoices.find((c) => c.value === newStatusKey);
      const stageId = choice?.id || newStatusKey;
      const updatedTicket = await changeTicketStatus(ticket.id, stageId);
      setCurrentTicket(updatedTicket);
    } catch (err) {
      setCurrentTicket({ ...currentTicket, status: previousStatus });
      if (onStatusChange) {
        onStatusChange(ticket.id, { status: previousStatus });
      }
      console.error('Failed to update status', err);
    }
  };

  const handleCardClick = async () => {
    let currentAssigneeId = currentTicket.assignedUserId;
    if (!currentAssigneeId) {
      const currentUser = getStoredUser();
      if (currentUser && (currentUser._id || currentUser.id)) {
        const userId = currentUser._id || currentUser.id;
        try {
          const updated = await assignTicket(ticket.id, { assignedUserId: userId });
          if (onStatusChange) {
            onStatusChange(ticket.id, {
              assignedTo: currentUser.name,
              assignedUserId: userId
            });
          }
          setCurrentTicket(updated);
        } catch (err) {
          console.error('Failed to auto-assign ticket on click', err);
        }
      }
    }
    router.push(`/ticket-details?id=${ticket.id}`);
  };

  return (
    <div
      ref={innerRef}
      {...draggableProps}
      {...dragHandleProps}
      className="rounded-2xl border border-slate-200/80 bg-white p-3 shadow-[0_8px_24px_rgba(15,23,42,0.05)] transition-transform duration-200 hover:-translate-y-0.5 hover:shadow-[0_12px_32px_rgba(15,23,42,0.08)]"
    >
      <div className="mb-2 flex items-start justify-between">
        <div className="flex items-center gap-2 text-xs font-mono text-slate-400">
          <span className="font-semibold text-indigo-600">TC-{ticket.ticketNumber || ticket.id}</span>
          <span className={`rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${PRIORITY_STYLES[currentTicket.priority] || PRIORITY_STYLES.medium}`}>
            {currentTicket.priority === 'urgent' ? 'Urgent' : currentTicket.priority === 'high' ? 'High' : currentTicket.priority === 'medium' ? 'Medium' : 'Low'}
          </span>
        </div>

        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 text-slate-400"
          onClick={(e) => {
            e.preventDefault();
            e.stopPropagation();
            router.push(`/ticket-details?id=${ticket.id}`);
          }}
        >
          ⋯
        </Button>
      </div>

      <div className="block cursor-pointer" onClick={handleCardClick}>
        <h4 className="mb-1.5 text-sm font-semibold leading-snug text-slate-800">{ticket.title}</h4>
        <p className="mb-4 text-xs leading-relaxed text-slate-500">{ticket.description}</p>
      </div>

      <div className="flex flex-col justify-center border-t border-slate-100 pt-2 text-xs text-slate-500 gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-col gap-0.5">
          <div className="flex items-center gap-1.5">
            <div className="flex h-5 w-5 items-center justify-center rounded-full bg-indigo-100 text-[9px] font-bold uppercase text-indigo-700 shrink-0">
              {ticket.assignedTo?.charAt(0) || 'U'}
            </div>
            <span className="max-w-28 truncate font-medium text-slate-600">{ticket.assignedTo || 'Unassigned'}</span>
          </div>
          {ticket.assignedDepartmentId && (
            <span className="text-[10px] text-slate-400 truncate max-w-28 pl-6.5 ml-[1.625rem]">
              {ticket.assignedDepartmentId.name}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
