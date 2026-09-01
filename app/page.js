'use client';

import { useEffect, useState } from 'react';
import { KanbanBoard } from '@/components/kanban-board';
import { Actionbar } from '@/components/Actionbar';
import { AuthGuard } from '@/components/auth-guard';
import { getTicketSummary, loadTickets } from '@/lib/tickets';

function DashboardContent() {
  const [searchQuery, setSearchQuery] = useState('');
  const [summary, setSummary] = useState({});

  useEffect(() => {
    let isMounted = true;

    async function loadData() {
      try {
        const items = await loadTickets();
        if (isMounted) {
          setSummary(getTicketSummary(items));
        }
      } catch {
        if (isMounted) {
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
