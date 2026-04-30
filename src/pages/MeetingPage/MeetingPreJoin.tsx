'use client';

import React, { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useUnit } from 'effector-react';
import { $avatarImageNonce, $isAuthenticated } from '@/shared/store/auth';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { UserAvatarDisplay } from '@/shared/ui/user-avatar';
import { cn } from '@/shared/lib/utils';

const INPUT_SHELL =
  'rounded-xl border border-white/10 bg-dark-1 text-white shadow-inner placeholder:text-zinc-500 focus-visible:border-[#0E78F9]/70 focus-visible:ring-2 focus-visible:ring-[#0E78F9]/25';

function formatHmsCountdown(targetMs: number) {
  const left = Math.max(0, targetMs - Date.now());
  const totalSec = Math.floor(left / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function initialsFromName(name: string) {
  const t = name.trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    return (parts[0][0] + parts[1][0]).toUpperCase().slice(0, 2);
  }
  return t.slice(0, 2).toUpperCase();
}

export type MeetingPreJoinPayload = {
  displayName: string;
};

type Props = {
  meetingTitle: string;
  defaultDisplayName: string;
  defaultReminderEmail?: string;
  isInstantMeeting: boolean;
  showReminderEmail: boolean;
  /** Подписка на напоминание уже есть — показываем короткое подтверждение */
  reminderAlreadySaved?: boolean;
  scheduledStartMs?: number;
  onJoin: (payload: MeetingPreJoinPayload) => void;
  /** Сохранить email для напоминания до старта встречи (отдельно от входа) */
  onReminderSubscribe?: (email: string) => Promise<void>;
  joinBusy?: boolean;
  reminderBusy?: boolean;
  showGuestAuthChoice?: boolean;
  signInHref?: string;
  signUpHref?: string;
  profileAvatar?: string;
};

export function MeetingPreJoin({
  meetingTitle,
  defaultDisplayName,
  defaultReminderEmail,
  isInstantMeeting,
  showReminderEmail,
  reminderAlreadySaved = false,
  scheduledStartMs,
  onJoin,
  onReminderSubscribe,
  joinBusy = false,
  reminderBusy = false,
  showGuestAuthChoice = false,
  signInHref,
  signUpHref,
  profileAvatar,
}: Props) {
  const isAuthenticated = useUnit($isAuthenticated);
  const avatarNonce = useUnit($avatarImageNonce);
  const [displayName, setDisplayName] = useState(defaultDisplayName);
  const [nameTouched, setNameTouched] = useState(false);
  const [reminderEmail, setReminderEmail] = useState(defaultReminderEmail?.trim() ?? '');
  const [emailTouched, setEmailTouched] = useState(false);
  const [showNameError, setShowNameError] = useState(false);

  /** Обновление раз в секунду, чтобы таймер до старта шёл в реальном времени */
  const [, setCountdownTick] = useState(0);

  useEffect(() => {
    if (nameTouched) return;
    setDisplayName(defaultDisplayName);
  }, [defaultDisplayName, nameTouched]);

  useEffect(() => {
    if (emailTouched) return;
    const next = defaultReminderEmail?.trim() ?? '';
    if (!next) return;
    setReminderEmail((prev) => (prev.trim() === '' ? next : prev));
  }, [defaultReminderEmail, emailTouched]);

  const waitingForScheduledStart =
    !isInstantMeeting &&
    scheduledStartMs != null &&
    Number.isFinite(scheduledStartMs) &&
    Date.now() < scheduledStartMs;

  const canJoinNow =
    isInstantMeeting ||
    scheduledStartMs == null ||
    !Number.isFinite(scheduledStartMs) ||
    Date.now() >= scheduledStartMs;

  const didJoinRef = useRef(false);

  useEffect(() => {
    if (!waitingForScheduledStart) return;
    const id = setInterval(() => setCountdownTick((n) => n + 1), 1000);
    return () => clearInterval(id);
  }, [waitingForScheduledStart]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = displayName.trim();
    if (!trimmed) {
      setShowNameError(true);
      return;
    }
    if (!canJoinNow) return;
    setShowNameError(false);
    if (!didJoinRef.current) {
      didJoinRef.current = true;
      onJoin({ displayName: trimmed });
    }
  };

  const handleSaveReminder = async () => {
    const emailTrim = reminderEmail.trim();
    if (!emailTrim || !onReminderSubscribe) return;
    await onReminderSubscribe(emailTrim.toLowerCase());
  };

  const initials = initialsFromName(displayName);

  const reminderEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(reminderEmail.trim());

  return (
    <div className="relative flex min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-10 sm:px-6">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,120,249,0.18),transparent)]"
        aria-hidden
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent via-dark-2/80 to-dark-2" aria-hidden />

      <div className="relative z-[1] w-full max-w-[min(100%,52rem)]">
        {isAuthenticated ? (
          <Link
            href="/"
            className="mb-6 inline-flex items-center gap-1.5 text-sm text-zinc-500 transition hover:text-[#7eb8fc]"
          >
            <span aria-hidden className="text-base leading-none">
              ←
            </span>
            На главную
          </Link>
        ) : null}

        <div
          className={cn(
            'overflow-hidden rounded-3xl border border-white/[0.07]',
            'bg-[#12151f]/90 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl',
            'ring-1 ring-white/[0.04]'
          )}
        >
          <div className="grid gap-0 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
            <div className="relative flex min-h-[220px] flex-col items-center justify-center border-b border-white/[0.06] bg-gradient-to-br from-[#0E78F9]/[0.07] via-dark-2/40 to-dark-2 px-8 py-12 lg:min-h-[min(420px,52vh)] lg:border-b-0 lg:border-r lg:border-white/[0.06]">
              <div
                className="pointer-events-none absolute inset-0 opacity-[0.35]"
                style={{
                  backgroundImage: `radial-gradient(circle at 50% 40%, rgba(14,120,249,0.25) 0%, transparent 55%)`,
                }}
                aria-hidden
              />
              <div className="relative flex h-32 w-32 items-center justify-center sm:h-40 sm:w-40">
                <div className="absolute inset-0 rounded-full bg-[#0E78F9]/20 blur-2xl" aria-hidden />
                {isAuthenticated ? (
                  <UserAvatarDisplay
                    avatar={profileAvatar}
                    displayName={displayName || defaultDisplayName || '?'}
                    imageNonce={avatarNonce}
                    className="relative z-[1] h-32 w-32 border border-[#0E78F9]/35 shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] sm:h-40 sm:w-40"
                    fallbackClassName="text-3xl sm:text-4xl"
                  />
                ) : (
                  <div
                    className={cn(
                      'relative z-[1] flex h-full w-full items-center justify-center rounded-full',
                      'border border-[#0E78F9]/35 bg-gradient-to-b from-white/[0.08] to-white/[0.02]',
                      'text-3xl font-semibold tracking-tight text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)]',
                      'sm:text-4xl'
                    )}
                  >
                    {initials}
                  </div>
                )}
              </div>
            </div>

            <div className="flex flex-col justify-center px-6 py-8 sm:px-10 sm:py-10">
              <div className="mb-6 space-y-1">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                  Вход во встречу
                </p>
                {!isInstantMeeting ? (
                  <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
                    {meetingTitle}
                  </h1>
                ) : null}
              </div>

              {showGuestAuthChoice && signInHref && signUpHref ? (
                <div className="mb-6 rounded-2xl border border-white/[0.06] bg-white/[0.03] p-4">
                  <p className="text-center text-sm text-zinc-400">Уже есть аккаунт?</p>
                  <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-white/12 bg-white/[0.04] text-[15px] text-white hover:bg-white/[0.08]"
                      asChild
                    >
                      <Link href={signInHref}>Войти</Link>
                    </Button>
                    <Button
                      variant="outline"
                      className="h-11 rounded-xl border-white/12 bg-white/[0.04] text-[15px] text-white hover:bg-white/[0.08]"
                      asChild
                    >
                      <Link href={signUpHref}>Регистрация</Link>
                    </Button>
                  </div>
                  <p className="mt-3 text-center text-xs leading-relaxed text-zinc-500">
                    Или продолжите как гость — укажите имя ниже
                  </p>
                </div>
              ) : null}

              <form
                onSubmit={handleSubmit}
                className={cn('flex flex-col gap-5', showGuestAuthChoice && signInHref ? '' : 'mt-1')}
              >
                <div className="space-y-2">
                  <label htmlFor="prejoin-display-name" className="sr-only">
                    Отображаемое имя
                  </label>
                  <Input
                    id="prejoin-display-name"
                    name="displayName"
                    autoComplete="nickname"
                    placeholder="Как вас видят другие"
                    value={displayName}
                    onChange={(e) => {
                      setNameTouched(true);
                      setDisplayName(e.target.value);
                      if (showNameError && e.target.value.trim()) setShowNameError(false);
                    }}
                    disabled={joinBusy}
                    aria-invalid={showNameError}
                    className={cn(
                      'h-12 text-base md:text-sm',
                      INPUT_SHELL,
                      showNameError &&
                        'border-red-500/80 focus-visible:border-red-500/80 focus-visible:ring-red-500/25'
                    )}
                  />
                  {showNameError ? (
                    <p className="text-xs text-red-400">Введите имя — так вас увидят участники</p>
                  ) : (
                    <p className="text-xs leading-relaxed text-zinc-500">
                      {defaultDisplayName
                        ? 'Можно изменить только для этой встречи'
                        : 'Имя будет видно всем в комнате'}
                    </p>
                  )}
                </div>

                {reminderAlreadySaved ? (
                  <p className="rounded-xl border border-emerald-500/25 bg-emerald-950/25 px-4 py-3 text-sm text-emerald-200/95">
                    Примерно за 15 минут до начала встречи пришлём на вашу почту напоминание о её начале.
                  </p>
                ) : showReminderEmail ? (
                  <div className="space-y-2">
                    <label htmlFor="prejoin-reminder-email" className="text-sm text-zinc-400">
                      Email для напоминания (необязательно)
                    </label>
                    <Input
                      id="prejoin-reminder-email"
                      type="email"
                      name="reminderEmail"
                      autoComplete="email"
                      placeholder="you@example.com"
                      value={reminderEmail}
                      onChange={(e) => {
                        setEmailTouched(true);
                        setReminderEmail(e.target.value);
                      }}
                      disabled={reminderBusy || joinBusy}
                      className={cn('h-12 text-base md:text-sm', INPUT_SHELL)}
                    />
                    <p className="text-xs text-zinc-500">
                      Письмо с напоминанием придёт на этот адрес примерно за 15 минут до старта
                    </p>
                    {waitingForScheduledStart && onReminderSubscribe ? (
                      <Button
                        type="button"
                        disabled={!reminderEmailValid || reminderBusy}
                        onClick={() => void handleSaveReminder()}
                        className="h-11 w-full rounded-xl border border-white/[0.12] bg-white/[0.06] text-[15px] font-semibold text-white hover:bg-white/[0.1] disabled:opacity-40"
                      >
                        {reminderBusy ? 'Сохранение…' : 'Сохранить напоминание'}
                      </Button>
                    ) : null}
                  </div>
                ) : null}

                {waitingForScheduledStart ? (
                  <p className="text-center text-sm text-zinc-300">
                    Встреча начнётся через{' '}
                    <span className="font-mono font-semibold tabular-nums text-white">
                      {formatHmsCountdown(scheduledStartMs!)}
                    </span>
                  </p>
                ) : null}

                {!waitingForScheduledStart ? (
                  <Button
                    type="submit"
                    disabled={joinBusy || !displayName.trim() || !canJoinNow}
                    className="mt-1 h-12 w-full rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110 disabled:opacity-40"
                  >
                    {joinBusy ? 'Подключение…' : 'Подключиться'}
                  </Button>
                ) : null}
              </form>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
