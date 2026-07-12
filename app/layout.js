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
  title: 'Task Board',
  description: 'Simple kanban board for tickets',
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
