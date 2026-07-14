'use client';

import { useEffect, useState } from 'react';
import { KanbanBoard } from '@/components/kanban-board';
import { Actionbar } from '@/components/Actionbar';
import { AuthGuard } from '@/components/auth-guard';
import { getTicketSummary, loadTickets } from '@/lib/tickets';

function DashboardContent() {
  const [tickets, setTickets] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState({});

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const items = await loadTickets();
        if (isMounted) {
          setTickets(items);
          setSummary(getTicketSummary(items));
        }
      } catch (error) {
        if (isMounted) {
          setTickets([]);
          setSummary({});
        }
      }
    }

    void loadData();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="flex h-full flex-col">
      <Actionbar searchQuery={searchQuery} onSearchChange={setSearchQuery} summary={summary} />

      <div className="flex-1 overflow-hidden bg-transparent">
        <KanbanBoard searchQuery={searchQuery} />
      </div>
    </div>
  );
}

export default function Home() {
  return (
    <AuthGuard>
      <DashboardContent />
    </AuthGuard>
  );
}
