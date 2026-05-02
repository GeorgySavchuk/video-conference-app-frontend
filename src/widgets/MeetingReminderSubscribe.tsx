'use client';

import React, { useEffect, useState } from 'react';
import { toast } from 'sonner';
import { api } from '@/shared/lib/api';
import { cn } from '@/shared/lib/utils';

const reminderDoneKey = (id: string) => `meetingReminderDone:${id}`;

type Props = {
  roomId: string;
  /** Почта из профиля — подставляется, пока поле пустое или совпадает с прошлым значением профиля. */
  defaultEmail?: string;
  /** После успешной подписки — обновить родителя (скрыть плашку по факту подписки). */
  onSubscribed?: () => void;
  className?: string;
};

export function MeetingReminderSubscribe({
  roomId,
  defaultEmail,
  onSubscribed,
  className,
}: Props) {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (sessionStorage.getItem(reminderDoneKey(roomId)) === '1') {
      setDismissed(true);
    }
  }, [roomId]);

  useEffect(() => {
    const next = defaultEmail?.trim() ?? '';
    if (!next) return;
    setEmail((prev) => {
      const p = prev.trim();
      if (p === '') return next;
      return p;
    });
  }, [defaultEmail]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = email.trim();
    if (!trimmed) {
      toast.error('Введите email');
      return;
    }
    setBusy(true);
    try {
      const { data, status } = await api.post<{ message?: string }>(
        '/meetings/reminders/subscribe',
        { room_id: roomId, email: trimmed }
      );
      toast.success(data.message || (status === 201 ? 'Подписка сохранена' : 'Готово'));
      try {
        sessionStorage.setItem(reminderDoneKey(roomId), '1');
      } catch {
        /* private mode */
      }
      onSubscribed?.();
      setDismissed(true);
    } catch (err: unknown) {
      const ax = err as { response?: { data?: { error?: string }; status?: number } };
      toast.error(ax.response?.data?.error || 'Не удалось подписаться');
    } finally {
      setBusy(false);
    }
  };

  if (dismissed) {
    return null;
  }

  return (
    <div
      className={cn(
        'shrink-0 border-b border-white/[0.08] bg-slate-950/70 px-3 py-2.5 backdrop-blur-md sm:px-4',
        className
      )}
    >
      <form
        onSubmit={onSubmit}
        className="mx-auto flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center sm:gap-3"
      >
        <p className="text-xs leading-snug text-slate-400 sm:max-w-[13rem] sm:shrink-0">
          Не в приложении в момент старта? Оставьте почту — пришлём напоминание за ~15 минут.
        </p>
        <div className="flex min-w-0 flex-1 gap-2">
          <input
            type="email"
            name="reminder-email"
            autoComplete="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy}
            className="min-w-0 flex-1 rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 text-sm text-white outline-none ring-white/20 placeholder:text-slate-500 focus:border-white/20 focus:ring-2 disabled:opacity-60"
          />
          <button
            type="submit"
            disabled={busy}
            className="shrink-0 rounded-xl border border-white/15 bg-white/[0.12] px-3 py-2 text-sm font-medium text-white transition hover:bg-white/[0.18] disabled:opacity-60 sm:px-4"
          >
            {busy ? '…' : 'Напомнить'}
          </button>
        </div>
      </form>
    </div>
  );
}
