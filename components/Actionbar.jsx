'use client';

import { Navbar } from '@/components/Navbar';

export function Actionbar({ searchQuery, onSearchChange }) {
  return <Navbar searchQuery={searchQuery} onSearchChange={onSearchChange} />;
}
