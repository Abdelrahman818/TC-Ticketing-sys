'use client';

import { useEffect, useMemo, useState } from 'react';
import { DragDropContext, Droppable, Draggable } from '@hello-pangea/dnd';
import { API_ROUTES, apiRequest } from '@/config';
import { useTickets, changeTicketStatus } from '@/lib/tickets';
import { TicketCard } from '@/components/ticket-card';
import { STATUSES } from '@/lib/fallbackStatuses';

export function KanbanBoard({ searchQuery = '' }) {
  const { tickets, updateTicketLocally } = useTickets();
  const [stages, setStages] = useState([]);

  const loadStages = async () => {
    try {
      const response = await apiRequest(API_ROUTES.stages.list);
      setStages(response?.data?.stages || []);
    } catch {
      setStages([]);
    }
  };

  useEffect(() => {
    void loadStages();
  }, []);

  const orderedStages = useMemo(() => {
    return [...stages]
      .filter((stage) => stage.isActive !== false)
      .sort((a, b) => (a.order || 0) - (b.order || 0));
  }, [stages]);

  const columns = useMemo(() => {
    if (orderedStages.length) {
      return orderedStages.map((stage) => ({ key: stage.key, name: stage.name, id: stage._id }));
    }

    return STATUSES;
  }, [orderedStages]);

  const filteredTickets = useMemo(() => {
    const normalizedQuery = searchQuery.trim().toLowerCase();

    if (!normalizedQuery) {
      return tickets;
    }

    return tickets.filter((ticket) => {
      const haystack = [ticket.id, ticket.title, ticket.description, ticket.creatorName, ticket.assignedTo, ticket.priority, ticket.status]
        .join(' ')
        .toLowerCase();

      return haystack.includes(normalizedQuery);
    });
  }, [searchQuery, tickets]);

  const groupedTickets = useMemo(() => {
    return filteredTickets.reduce((acc, ticket) => {
      const key = ticket.status || 'todo';
      if (!acc[key]) acc[key] = [];
      acc[key].push(ticket);
      return acc;
    }, {});
  }, [filteredTickets]);

  const handleDragEnd = async (result) => {
    if (result.type === 'COLUMN') {
      const { destination, source, draggableId } = result;
      if (!destination || destination.index === source.index) return;

      const reorderedStages = [...orderedStages];
      const fromIndex = reorderedStages.findIndex((stage) => String(stage._id) === String(draggableId));
      const toIndex = destination.index;

      if (fromIndex < 0 || toIndex < 0) return;

      const [movedStage] = reorderedStages.splice(fromIndex, 1);
      reorderedStages.splice(toIndex, 0, movedStage);

      const nextStages = reorderedStages.map((stage, index) => ({ ...stage, order: index + 1 }));
      const updatePayload = nextStages.map((stage, index) => ({ stageId: stage._id, order: index + 1 }));
      setStages(nextStages);

      try {
        await apiRequest(API_ROUTES.stages.reorder, { method: 'PATCH', body: { stages: updatePayload } });
      } catch (error) {
        console.error('Failed to reorder columns', error);
        await loadStages();
      }
      return;
    }

    const { destination, source, draggableId } = result;

    if (!destination) return;

    if (destination.droppableId === source.droppableId && destination.index === source.index) {
      return;
    }

    const destinationStatusKey = destination.droppableId;
    const ticketId = draggableId;

    const targetTicket = tickets.find((t) => String(t.id) === String(ticketId));
    if (!targetTicket) return;

    const previousStatusKey = targetTicket.status;

    updateTicketLocally(ticketId, { status: destinationStatusKey });

    try {
      const destCol = columns.find((col) => col.key === destinationStatusKey);
      const stageId = destCol?.id || destinationStatusKey;
      await changeTicketStatus(ticketId, stageId);
    } catch (error) {
      console.error('Failed to update ticket status via drag-and-drop', error);
      updateTicketLocally(ticketId, { status: previousStatusKey });
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <Droppable droppableId="board-columns" direction="horizontal" type="COLUMN">
        {(provided) => (
          <div ref={provided.innerRef} {...provided.droppableProps} className="flex min-h-[calc(100vh-4rem)] gap-5 overflow-x-auto p-5">
            {columns.map((col, index) => (
              <Draggable key={col.id || col.key} draggableId={String(col.id || col.key)} index={index} type="COLUMN">
                {(dragProvided) => (
                  <div
                    ref={dragProvided.innerRef}
                    {...dragProvided.draggableProps}
                    className="flex min-w-70 max-w-[320px] flex-1 flex-col rounded-2xl border border-slate-200/80 bg-white/80 shadow-[0_10px_35px_rgba(15,23,42,0.04)]"
                  >
                    <div
                      {...dragProvided.dragHandleProps}
                      className="flex cursor-grab items-center justify-between border-b border-slate-200/80 px-4 py-3"
                    >
                      <h3 className="flex items-center gap-2 text-sm font-semibold tracking-wide text-slate-700">
                        {col.name}
                        <span className="rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[11px] font-mono text-slate-500">
                          {groupedTickets[col.key]?.length || 0}
                        </span>
                      </h3>
                      <span className="text-xs font-medium uppercase tracking-[0.2em] text-slate-400">
                        Drag
                      </span>
                    </div>

                    <Droppable droppableId={col.key}>
                      {(provided) => (
                        <div
                          ref={provided.innerRef}
                          {...provided.droppableProps}
                          className="flex flex-1 flex-col gap-3 overflow-y-auto p-3 min-h-37.5"
                        >
                          {groupedTickets[col.key]?.map((ticket, index) => (
                            <Draggable key={ticket.id} draggableId={String(ticket.id)} index={index}>
                              {(dragProvided) => (
                                <TicketCard
                                  ticket={ticket}
                                  statusOptions={columns}
                                  onStatusChange={updateTicketLocally}
                                  innerRef={dragProvided.innerRef}
                                  draggableProps={dragProvided.draggableProps}
                                  dragHandleProps={dragProvided.dragHandleProps}
                                />
                              )}
                            </Draggable>
                          ))}
                          {provided.placeholder}
                          {(!groupedTickets[col.key] || groupedTickets[col.key].length === 0) && (
                            <div className="flex h-24 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50/70 text-sm text-slate-400">
                              {searchQuery.trim() ? 'No tickets match that search' : 'No tickets'}
                            </div>
                          )}
                        </div>
                      )}
                    </Droppable>
                  </div>
                )}
              </Draggable>
            ))}
            {provided.placeholder}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
}
