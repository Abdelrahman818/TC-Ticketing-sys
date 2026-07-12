'use client';

import { useEffect, useState } from 'react';
import { API_ROUTES, apiRequest } from '@/config';

function normalizeTicket(ticket) {
  if (!ticket) {
    return null;
  }

  return {
    ...ticket,
    id: ticket._id || ticket.id,
    ticketNumber: ticket.ticketNumber,
    status: ticket.status || ticket.statusId?.key || 'todo',
    statusId: ticket.statusId?._id || ticket.statusId || null,
    statusName: ticket.statusId?.name || ticket.statusName || '',
    assignedTo: ticket.assignedUserId?.name || ticket.assignedTo || '',
    assignedUserId: ticket.assignedUserId?._id || ticket.assignedUserId || null,
    assignedDepartmentId:
      ticket.assignedDepartmentId && typeof ticket.assignedDepartmentId === 'object'
        ? { _id: ticket.assignedDepartmentId._id, name: ticket.assignedDepartmentId.name }
        : ticket.assignedDepartmentId || null,
    creatorName: ticket.creatorId?.name || ticket.creatorName || '',
  };
}

function buildQueryString(params = {}) {
  const query = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== '') {
      query.append(key, value);
    }
  });

  return query.toString();
}

export async function loadTickets(query = {}) {
  const queryString = buildQueryString(query);
  const url = queryString ? `${API_ROUTES.tickets.list}?${queryString}` : API_ROUTES.tickets.list;
  const payload = await apiRequest(url);
  const items = payload?.data?.items || [];
  return items.map(normalizeTicket).filter(Boolean);
}

function buildTicketPayload(input = {}) {
  const payload = {
    title: input.title,
    description: input.description,
    priority: input.priority || 'medium',
  };

  if (input.assignedDepartmentId) {
    payload.assignedDepartmentId = input.assignedDepartmentId;
  }

  if (input.assignedUserId) {
    payload.assignedUserId = input.assignedUserId;
  }

  return payload;
}

export async function loadAssignableUsers(departmentId = null) {
  const queryString = buildQueryString({ departmentId });
  const url = queryString
    ? `${API_ROUTES.users.assignable}?${queryString}`
    : API_ROUTES.users.assignable;
  const payload = await apiRequest(url);
  return payload?.data?.users || [];
}

export async function createTicket(input) {
  const payload = await apiRequest(API_ROUTES.tickets.list, {
    method: 'POST',
    body: buildTicketPayload(input),
  });

  return normalizeTicket(payload?.data?.ticket);
}

export async function getTicketById(id) {
  const payload = await apiRequest(API_ROUTES.tickets.byId(id));
  return normalizeTicket(payload?.data?.ticket);
}

export async function updateTicket(id, changes) {
  const payload = await apiRequest(API_ROUTES.tickets.byId(id), {
    method: 'PATCH',
    body: changes,
  });

  return normalizeTicket(payload?.data?.ticket);
}

export async function changeTicketStatus(id, statusId, note = '') {
  const payload = await apiRequest(API_ROUTES.tickets.status(id), {
    method: 'PATCH',
    body: {
      statusId,
      note,
    },
  });

  return normalizeTicket(payload?.data?.ticket);
}

export async function assignTicket(id, assignment) {
  const payload = await apiRequest(API_ROUTES.tickets.assign(id), {
    method: 'PATCH',
    body: assignment,
  });

  return normalizeTicket(payload?.data?.ticket);
}

export async function deleteTicket(id) {
  await apiRequest(API_ROUTES.tickets.byId(id), {
    method: 'DELETE',
  });
}

export function getTicketSummary(tickets = []) {
  return (tickets || []).reduce(
    (summary, ticket) => {
      const status = ticket?.status || 'todo';
      summary[status] = (summary[status] || 0) + 1;
      return summary;
    },
    {
      todo: 0,
      in_progress: 0,
      in_review: 0,
      done: 0,
    }
  );
}

export function useTickets() {
  const [tickets, setTickets] = useState([]);

  useEffect(() => {
    let isMounted = true;

    loadTickets()
      .then((items) => {
        if (isMounted) {
          setTickets(items);
        }
      })
      .catch(() => {
        if (isMounted) {
          setTickets([]);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const updateTicketLocally = (id, changes) => {
    setTickets((prev) =>
      prev.map((t) => (t.id === id ? { ...t, ...changes } : t))
    );
  };

  const removeTicketLocally = (id) => {
    setTickets((prev) => prev.filter((t) => t.id !== id));
  };

  return { tickets, updateTicketLocally, removeTicketLocally };
}
