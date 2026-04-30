'use client';

import Link from 'next/link';
import { Button } from '@/shared/ui/button';

type Props = {
  variant: 'ended' | 'cancelled';
  meetingTitle?: string;
};

export function MeetingLinkUnavailable({ variant, meetingTitle }: Props) {
  const title =
    variant === 'ended'
      ? 'Встреча завершена'
      : 'Встреча отменена';
  const description =
    variant === 'ended'
      ? 'Отведённое на эту встречу время истекло. Новое подключение по этой ссылке недоступно.'
      : 'Организатор отменил встречу. Подключение по этой ссылке недоступно.';

  return (
    <div className="relative flex min-h-full w-full flex-1 flex-col items-center justify-center overflow-hidden px-4 py-16">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,rgba(14,120,249,0.14),transparent)]"
        aria-hidden
      />
      <div className="relative z-[1] w-full max-w-md rounded-3xl border border-white/[0.08] bg-[#12151f]/90 px-8 py-10 text-center shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl ring-1 ring-white/[0.04]">
        <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
          HellConf
        </p>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{title}</h1>
        {meetingTitle && meetingTitle !== 'Встреча' ? (
          <p className="mt-2 text-base text-zinc-300">{meetingTitle}</p>
        ) : null}
        <p className="mt-4 text-sm leading-relaxed text-zinc-400">{description}</p>
        <Button
          type="button"
          className="mt-8 h-12 w-full rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110"
          asChild
        >
          <Link href="/">На главную</Link>
        </Button>
      </div>
    </div>
  );
}
