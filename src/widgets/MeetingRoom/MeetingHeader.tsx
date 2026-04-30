'use client';

import React from 'react';
import { ChevronDown, Grid3x3, LayoutPanelTop } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/shared/ui/dropdown-menu';
import { cn } from '@/shared/lib/utils';
import type { MeetingVideoLayout } from '@/entities/Controls';

function formatElapsed(elapsedMs: number) {
  const totalSec = Math.max(0, Math.floor(elapsedMs / 1000));
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function participantWord(n: number) {
  const mod10 = n % 10;
  const mod100 = n % 100;
  if (mod100 >= 11 && mod100 <= 14) return 'участников';
  if (mod10 === 1) return 'участник';
  if (mod10 >= 2 && mod10 <= 4) return 'участника';
  return 'участников';
}

type Props = {
  title: string;
  participantCount: number;
  sessionStartMs: number;
  now: number;
  remainingMs: number;
  timerSoon: boolean;
  timerCritical: boolean;
  videoLayout: MeetingVideoLayout;
  onVideoLayout: (layout: MeetingVideoLayout) => void;
  showLayoutMenu: boolean;
  layoutLockedByScreenShare: boolean;
};

export function MeetingHeader({
  title,
  participantCount,
  sessionStartMs,
  now,
  remainingMs,
  timerSoon,
  timerCritical,
  videoLayout,
  onVideoLayout,
  showLayoutMenu,
  layoutLockedByScreenShare,
}: Props) {
  const elapsedMs = Math.max(0, now - sessionStartMs);
  const elapsedLabel = formatElapsed(elapsedMs);

  const layoutLabel = videoLayout === 'spotlight' ? 'Докладчик' : 'Расширенный';
  const LayoutIcon = videoLayout === 'spotlight' ? LayoutPanelTop : Grid3x3;

  const timerPillClass = cn(
    'rounded-lg border px-3 py-1.5 font-mono text-sm font-semibold tabular-nums tracking-tight sm:text-base sm:px-4 sm:py-2',
    timerCritical
      ? 'animate-pulse border-red-500/50 bg-red-950/60 text-red-200 shadow-[0_0_20px_rgba(239,68,68,0.25)] ring-1 ring-red-400/35'
      : timerSoon
        ? 'border-amber-500/40 bg-amber-950/45 text-amber-100 ring-1 ring-amber-400/25'
        : 'border-white/[0.08] bg-dark-2 text-white ring-1 ring-white/[0.04]',
  );

  const effectiveLayout = layoutLockedByScreenShare ? 'spotlight' : videoLayout;

  return (
    <header
      className={cn(
        'z-20 shrink-0 border-b border-white/[0.06] bg-dark-1',
        'px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top,0px))] sm:px-5 sm:py-3',
      )}
    >
      <div className="mx-auto flex w-full max-w-[1600px] items-center gap-3 sm:gap-6">
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-sm font-semibold tracking-tight text-white sm:text-base">{title}</h1>
          <p className="truncate text-xs text-slate-400 sm:text-sm">{participantCount} {participantWord(participantCount)}</p>
        </div>

        <div className="flex shrink-0 items-center justify-center">
          <div
            className={timerPillClass}
            aria-label={
              timerSoon
                ? `Прошло времени ${elapsedLabel}, до конца встречи осталось ${Math.ceil(remainingMs / 60000)} минут`
                : `Прошло времени с начала встречи: ${elapsedLabel}`
            }
          >
            {elapsedLabel}
          </div>
        </div>

        <div className="flex min-w-0 flex-1 justify-end">
          {showLayoutMenu && (
            <DropdownMenu>
              <DropdownMenuTrigger
                type="button"
                disabled={layoutLockedByScreenShare}
                aria-label={
                  layoutLockedByScreenShare
                    ? 'Раскладка недоступна при демонстрации экрана'
                    : `Раскладка: ${layoutLabel}. Открыть меню`
                }
                className={cn(
                  'flex max-w-full cursor-pointer items-center gap-2 rounded-xl border border-white/[0.08] bg-[#161922] text-xs font-medium text-white shadow-sm transition-colors sm:px-2.5 sm:py-2 sm:text-sm md:px-3',
                  /* телефон: только иконка, компактная кнопка */
                  'justify-center p-2 sm:justify-start',
                  'hover:border-white/[0.18] hover:bg-[#252a38]',
                  'data-[state=open]:border-white/[0.14] data-[state=open]:bg-[#1e2433]',
                  'outline-none before:hidden after:hidden focus-visible:ring-2 focus-visible:ring-white/25 focus-visible:ring-offset-0',
                  layoutLockedByScreenShare && 'cursor-not-allowed opacity-60 hover:bg-[#161922]',
                )}
                title={
                  layoutLockedByScreenShare
                    ? 'При демонстрации экрана доступен только режим докладчика'
                    : `Раскладка: ${layoutLabel}`
                }
              >
                <LayoutIcon
                  className="h-5 w-5 shrink-0 text-slate-300 sm:h-4 sm:w-4"
                  aria-hidden
                />
                <span className="hidden max-w-[12rem] truncate sm:inline">{layoutLabel}</span>
                <ChevronDown
                  className="hidden h-3.5 w-3.5 shrink-0 text-slate-500 sm:block"
                  aria-hidden
                />
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align="end"
                className="min-w-[12.5rem] border border-white/[0.08] bg-dark-1 p-1 text-slate-100 shadow-lg"
              >
                <DropdownMenuItem
                  onClick={() => onVideoLayout('spotlight')}
                  className={cn(
                    'cursor-pointer gap-2 rounded-lg py-2 pl-2 pr-2 text-sm focus:bg-white/[0.06] focus:text-white',
                    'hover:bg-white/[0.08]',
                    effectiveLayout === 'spotlight' &&
                      'border border-white/[0.12] bg-white/[0.14] hover:bg-white/[0.16]',
                  )}
                >
                  <LayoutPanelTop className="h-4 w-4 text-slate-400" />
                  Докладчик
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={!!layoutLockedByScreenShare}
                  onClick={() => onVideoLayout('gridExtended')}
                  className={cn(
                    'cursor-pointer gap-2 rounded-lg py-2 pl-2 pr-2 text-sm focus:bg-white/[0.06] focus:text-white',
                    'hover:bg-white/[0.08]',
                    effectiveLayout === 'gridExtended' &&
                      'border border-white/[0.12] bg-white/[0.14] hover:bg-white/[0.16]',
                  )}
                >
                  <Grid3x3 className="h-4 w-4 text-slate-400" />
                  Расширенный
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>
      </div>
    </header>
  );
}
