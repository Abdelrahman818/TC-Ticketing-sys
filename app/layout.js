import { Geist, Geist_Mono } from 'next/font/google';
import { Analytics } from "@vercel/analytics/next"
import './globals.css';

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
});

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
});

export const metadata = {
  title: {
    default: 'TaskBoard | Ticket Management System',
    template: '%s | TaskBoard',
  },
  description: 'TaskBoard helps teams track work, manage ticket workflows, and keep departments aligned with a modern kanban experience.',
  keywords: ['ticket management', 'kanban board', 'team workflow', 'task tracking', 'department collaboration'],
  alternates: {
    canonical: 'https://taskboard.example.com',
  },
  openGraph: {
    title: 'TaskBoard | Ticket Management System',
    description: 'Manage tickets, monitor progress, and keep your team aligned with a streamlined task board.',
    type: 'website',
    siteName: 'TaskBoard',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'TaskBoard | Ticket Management System',
    description: 'A modern ticketing and workflow platform for fast-moving teams.',
  },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <Analytics />
        {children}
      </body>
    </html>
  );
}
