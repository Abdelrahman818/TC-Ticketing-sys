'use client';

import Image from 'next/image';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, LoaderCircle, MessageCircle, Radio, Send, Ticket, Wifi } from 'lucide-react';
import { AuthGuard } from '@/components/auth-guard';
import { API_ROUTES, apiRequest } from '@/config';
import { useEffect, useState } from 'react';

function WhatsappContent() {
  const [status, setStatus] = useState(null);
  const [connecting, setConnecting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    let isMounted = true;

    async function loadStatus() {
      try {
        const response = await apiRequest(API_ROUTES.whatsapp.status);
        const whatsapp = response?.data?.whatsapp || null;
        if (isMounted) {
          setStatus(whatsapp);

          if (whatsapp?.state === 'qr_ready' && !whatsapp.qrCode) {
            const qrResponse = await apiRequest(API_ROUTES.whatsapp.qr);
            const qrWhatsapp = qrResponse?.data?.whatsapp || whatsapp;
            if (isMounted) {
              setStatus(qrWhatsapp);
            }
          }
        }
      } catch (error) {
        if (isMounted) {
          setStatus({ state: 'error', error: error.message || 'Unable to load WhatsApp status' });
        }
      }
    }

    void loadStatus();
    const interval = window.setInterval(loadStatus, 3000);
    return () => {
      isMounted = false;
      window.clearInterval(interval);
    };
  }, []);

  const handleConnect = async () => {
    setConnecting(true);
    try {
      const response = await apiRequest(API_ROUTES.whatsapp.connect, {
        method: 'POST',
        body: { force: true },
      });
      setStatus(response?.data?.whatsapp || null);
    } catch (error) {
      setStatus((current) => ({
        ...(current || {}),
        state: 'error',
        error: error.message || 'Unable to start WhatsApp connection',
      }));
    } finally {
      setConnecting(false);
    }
  };

  const handleLogout = async () => {
    const confirmed = window.confirm('This will clear the WhatsApp auth and cache. Continue?');
    if (!confirmed) {
      return;
    }

    setLoggingOut(true);
    try {
      const response = await apiRequest(API_ROUTES.whatsapp.logout, {
        method: 'POST',
      });
      setStatus(response?.data?.whatsapp || { state: 'logged_out' });
    } catch (error) {
      setStatus((current) => ({
        ...(current || {}),
        state: 'error',
        error: error.message || 'Unable to clear WhatsApp session',
      }));
    } finally {
      setLoggingOut(false);
    }
  };

  const isConnected = status?.state === 'connected';
  const hasQrCode = status?.state === 'qr_ready' && status.qrCode;
  const isNotStarted = status?.state === 'not_started';
  const isStarting = status?.state === 'starting';
  const isError = status?.state === 'error' || status?.state === 'disconnected';

  return (
    <div className="min-h-screen bg-slate-50">
      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition-colors hover:text-slate-900">
          <ArrowLeft className="h-4 w-4" />
          Back to board
        </Link>

        <div className="mb-8 flex items-start justify-between gap-4">
          <div>
            <div className="mb-3 inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-green-100 text-green-700">
              <MessageCircle className="h-6 w-6" />
            </div>
            <h1 className="text-2xl font-semibold tracking-tight text-slate-900">WhatsApp CRM</h1>
            <p className="mt-1 text-sm text-slate-500">Manage conversations that arrive through your connected WhatsApp account.</p>
          </div>
          <div className="flex items-center gap-3">
            <span className={`inline-flex items-center gap-2 rounded-full border px-3 py-2 text-xs font-semibold ${isConnected ? 'border-emerald-200 bg-emerald-50 text-emerald-700' : 'border-amber-200 bg-amber-50 text-amber-700'}`}>
              <Radio className="h-3.5 w-3.5" />
              {isConnected ? 'Connected' : hasQrCode ? 'Waiting for scan' : isStarting ? 'Starting' : 'Setup required'}
            </span>
            <button type="button" onClick={handleLogout} disabled={loggingOut} className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-3 py-2 text-xs font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60">
              {loggingOut ? 'Clearing...' : 'Logout / Clear Session'}
            </button>
          </div>
        </div>

        {isConnected ? (
          <section className="mb-5 overflow-hidden rounded-3xl border border-emerald-200 bg-white shadow-[0_12px_40px_rgba(16,185,129,0.1)]">
            <div className="relative overflow-hidden bg-emerald-600 px-6 py-8 text-white sm:px-8">
              <div className="absolute -right-12 -top-16 h-48 w-48 rounded-full border-[20px] border-white/10" />
              <div className="absolute -bottom-24 right-24 h-48 w-48 rounded-full border-[20px] border-white/10" />
              <div className="relative flex flex-col justify-between gap-6 sm:flex-row sm:items-center">
                <div className="flex items-center gap-4">
                  <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25">
                    <CheckCircle2 className="h-8 w-8" />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-emerald-100">WhatsApp channel</p>
                    <h2 className="mt-1 text-2xl font-semibold tracking-tight">Connected and ready</h2>
                  </div>
                </div>
                <div className="inline-flex w-fit items-center gap-2 rounded-full bg-white/15 px-3 py-2 text-sm font-medium ring-1 ring-white/20">
                  <span className="h-2 w-2 rounded-full bg-white shadow-[0_0_0_4px_rgba(255,255,255,0.2)]" />
                  Live
                </div>
              </div>
            </div>

            <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
              <div className="bg-white p-5 sm:p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
                  <Wifi className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Connection</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Online</p>
              </div>
              <div className="bg-white p-5 sm:p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
                  <Ticket className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Automation</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Tickets enabled</p>
              </div>
              <div className="bg-white p-5 sm:p-6">
                <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-sky-50 text-sky-600">
                  <Send className="h-5 w-5" />
                </div>
                <p className="text-xs font-semibold uppercase tracking-[0.14em] text-slate-400">Inbox flow</p>
                <p className="mt-1 text-lg font-semibold text-slate-900">Messages monitored</p>
              </div>
            </div>

            <div className="flex flex-col gap-4 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
              <div>
                <p className="font-semibold text-slate-900">Your CRM bridge is active</p>
                <p className="mt-1 text-sm text-slate-500">New direct messages can now flow into the ticket inbox automatically.</p>
              </div>
              <div className="inline-flex items-center gap-2 text-sm font-medium text-emerald-700">
                <MessageCircle className="h-4 w-4" />
                Listening for messages
              </div>
            </div>
          </section>
        ) : (
          <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            {hasQrCode ? (
              <div className="flex flex-col items-center gap-4 text-center">
                <div>
                  <h2 className="font-semibold text-slate-900">Scan to connect WhatsApp</h2>
                  <p className="mt-1 text-sm text-slate-500">Open WhatsApp on your phone, choose Linked devices, then scan this code.</p>
                </div>
                <Image src={status.qrCode} alt="WhatsApp connection QR code" width={256} height={256} unoptimized className="h-64 w-64 rounded-xl border border-slate-200 p-2" />
              </div>
            ) : (
              <div className="flex flex-col gap-4 text-sm text-slate-600 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-3">
                  <Radio className="h-5 w-5 text-amber-600" />
                  <div>
                    <h2 className="font-semibold text-slate-900">{isError ? 'WhatsApp connection failed' : isNotStarted ? 'WhatsApp bot is not running' : isStarting ? 'WhatsApp is starting' : 'Waiting for WhatsApp setup'}</h2>
                    <p className="mt-1">{status?.error || (isStarting ? 'If this takes too long, retry the connection.' : isError ? 'Try reconnecting to generate a fresh QR code.' : 'Start the connection to generate a QR code.')}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <button type="button" onClick={handleConnect} disabled={connecting} className="inline-flex items-center justify-center gap-2 rounded-full bg-green-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-green-700 disabled:cursor-wait disabled:opacity-60">
                    {connecting && <LoaderCircle className="h-4 w-4 animate-spin" />}
                    {connecting ? 'Connecting...' : isStarting || isError ? 'Retry connection' : 'Connect WhatsApp'}
                  </button>
                  <button type="button" onClick={handleLogout} disabled={loggingOut} className="inline-flex items-center justify-center rounded-full border border-red-200 bg-red-50 px-4 py-2.5 text-sm font-semibold text-red-700 transition hover:bg-red-100 disabled:cursor-wait disabled:opacity-60">
                    {loggingOut ? 'Clearing...' : 'Logout / Clear Session'}
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

      </main>
    </div>
  );
}

export default function WhatsappPage() {
  return (
    <AuthGuard allowedRoles={['owner', 'manager']}>
      <WhatsappContent />
    </AuthGuard>
  );
}