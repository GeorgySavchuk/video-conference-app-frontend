'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';
import { Calendar as CalendarIcon, Plus } from 'lucide-react';
import { toast } from 'sonner';

import { normalizeTimeString } from '@/shared/lib/scheduleDefaults';
import { cn } from '@/shared/lib/utils';
import { Calendar } from '@/shared/ui/calendar';
import { Input } from '@/shared/ui/input';
import { Popover, PopoverContent, PopoverTrigger } from '@/shared/ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { Textarea } from '@/shared/ui/textarea';

export { normalizeTimeString } from '@/shared/lib/scheduleDefaults';

const INPUT_SHELL =
  'rounded-xl border border-white/10 bg-dark-1 text-white shadow-inner placeholder:text-zinc-500 focus-visible:border-[#0E78F9]/70 focus-visible:ring-2 focus-visible:ring-[#0E78F9]/25';

const SCROLL_LIST =
  'max-h-52 overflow-y-auto overscroll-contain [scrollbar-width:none] [-ms-overflow-style:none] [&::-webkit-scrollbar]:hidden';

const timeSlots = Array.from({ length: 48 }, (_, i) => {
  const hours = Math.floor(i / 2);
  const minutes = (i % 2) * 30;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
});

const DURATION_PRESETS = ['15', '30', '45', '60'] as const;

function emailValid(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s.trim());
}

function EmailChipsInput({
  emails,
  onChange,
}: {
  emails: string[];
  onChange: (next: string[]) => void;
}) {
  const [draft, setDraft] = useState('');

  const commit = useCallback(
    (raw: string) => {
      const t = raw.trim().replace(/,$/, '');
      if (!t) return;
      if (!emailValid(t)) {
        toast.error('Некорректный email');
        return;
      }
      const lower = t.toLowerCase();
      if (emails.some((e) => e.toLowerCase() === lower)) {
        setDraft('');
        return;
      }
      onChange([...emails, t.trim()]);
      setDraft('');
    },
    [emails, onChange]
  );

  return (
    <div
      className={cn(
        'flex min-h-[2.75rem] flex-wrap items-center gap-2 rounded-xl border border-white/10 bg-dark-1 px-2.5 py-2 shadow-inner',
        'focus-within:border-[#0E78F9]/60 focus-within:ring-2 focus-within:ring-[#0E78F9]/20'
      )}
    >
      {emails.map((em) => (
        <span
          key={em}
          className="inline-flex max-w-full items-center gap-1 rounded-lg border border-white/10 bg-dark-2/90 px-2 py-1 text-xs text-zinc-100 sm:text-sm"
        >
          <span className="truncate">{em}</span>
          <button
            type="button"
            className="shrink-0 cursor-pointer rounded p-0.5 text-zinc-500 transition hover:bg-white/10 hover:text-white"
            aria-label={`Удалить ${em}`}
            onClick={() => onChange(emails.filter((x) => x !== em))}
          >
            ×
          </button>
        </span>
      ))}
      <input
        className="min-w-[8rem] flex-1 bg-transparent py-0.5 text-sm text-white outline-none placeholder:text-zinc-500"
        placeholder="Введите email"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ',') {
            e.preventDefault();
            commit(draft);
          }
          if (e.key === 'Backspace' && !draft && emails.length) {
            onChange(emails.slice(0, -1));
          }
        }}
        onBlur={() => {
          if (draft.trim()) commit(draft);
        }}
      />
    </div>
  );
}

function StartDateTimePickers({
  date,
  onDateChange,
  selectedTime,
  onSelectedTimeChange,
}: {
  date: Date | undefined;
  onDateChange: (d: Date | undefined) => void;
  selectedTime: string;
  onSelectedTimeChange: (t: string) => void;
}) {
  const [timeOpen, setTimeOpen] = useState(false);
  const [dateOpen, setDateOpen] = useState(false);
  const [timeDraft, setTimeDraft] = useState(selectedTime);
  const listRef = useRef<HTMLDivElement>(null);
  const prevTimeOpen = useRef(false);
  /** Список времени без Portal — иначе Radix Popover + Dialog закрывает выпадашку на первом клике */
  const timeShellRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const n = normalizeTimeString(selectedTime);
    setTimeDraft(n ?? selectedTime);
  }, [selectedTime]);

  useEffect(() => {
    if (!timeOpen) return;
    const closeIfOutside = (ev: PointerEvent) => {
      const shell = timeShellRef.current;
      if (!shell?.contains(ev.target as Node)) {
        setTimeOpen(false);
      }
    };
    document.addEventListener('pointerdown', closeIfOutside, true);
    return () => document.removeEventListener('pointerdown', closeIfOutside, true);
  }, [timeOpen]);

  useEffect(() => {
    if (!timeOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setTimeOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [timeOpen]);

  useEffect(() => {
    const justOpened = timeOpen && !prevTimeOpen.current;
    prevTimeOpen.current = timeOpen;
    if (!justOpened || !listRef.current) return;
    const norm = normalizeTimeString(selectedTime) ?? selectedTime;
    const id = requestAnimationFrame(() => {
      listRef.current?.querySelector<HTMLElement>(`[data-time="${norm}"]`)?.scrollIntoView({
        block: 'nearest',
      });
    });
    return () => cancelAnimationFrame(id);
  }, [timeOpen, selectedTime]);

  const dateStr = useMemo(() => {
    if (!date) return '—';
    return format(date, 'dd.MM.yyyy');
  }, [date]);

  const focused = timeOpen || dateOpen;

  const commitTimeDraft = () => {
    const n = normalizeTimeString(timeDraft);
    if (n) {
      onSelectedTimeChange(n);
      setTimeDraft(n);
    } else if (timeDraft.trim()) {
      toast.error('Время в формате ЧЧ:ММ, например 14:30');
      setTimeDraft(normalizeTimeString(selectedTime) ?? selectedTime);
    }
  };

  return (
    <div
      className={cn(
        'flex min-h-11 min-w-0 w-full items-stretch rounded-xl border border-white/10 bg-dark-1 text-sm text-white transition-shadow',
        focused ? 'border-[#0E78F9]/50 ring-2 ring-[#0E78F9]/20' : ''
      )}
    >
      <div ref={timeShellRef} className="relative flex min-h-11 min-w-0 flex-1">
        <input
          type="text"
          inputMode="numeric"
          autoComplete="off"
          aria-label="Время начала"
          aria-expanded={timeOpen}
          aria-haspopup="listbox"
          placeholder="ЧЧ:ММ"
          value={timeDraft}
          onChange={(e) => setTimeDraft(e.target.value)}
          onFocus={() => setTimeOpen(true)}
          onBlur={() => {
            commitTimeDraft();
          }}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault();
              commitTimeDraft();
              setTimeOpen(false);
            }
            if (e.key === 'Escape') {
              setTimeOpen(false);
            }
          }}
          className="min-w-0 flex-1 cursor-text bg-transparent px-3 py-2.5 text-center font-medium tabular-nums outline-none placeholder:text-zinc-500 focus:bg-white/[0.04]"
        />
        {timeOpen ? (
          <div
            className="absolute left-0 right-0 top-full z-[200] mt-1 overflow-hidden rounded-xl border border-white/10 bg-dark-2 py-1 shadow-xl"
            role="presentation"
          >
            <div
              ref={listRef}
              role="listbox"
              className={cn(SCROLL_LIST, 'py-1')}
              onWheel={(e) => e.stopPropagation()}
            >
              {timeSlots.map((slot) => {
                const norm = normalizeTimeString(selectedTime) ?? selectedTime;
                return (
                  <button
                    key={slot}
                    type="button"
                    role="option"
                    aria-selected={slot === norm}
                    data-time={slot}
                    className={cn(
                      'block w-full cursor-pointer rounded-lg px-3 py-2 text-left text-sm text-white hover:bg-white/10',
                      slot === norm && 'bg-[#0E78F9]/35 font-semibold'
                    )}
                    onMouseDown={(e) => {
                      e.preventDefault();
                    }}
                    onClick={() => {
                      onSelectedTimeChange(slot);
                      setTimeDraft(slot);
                      setTimeOpen(false);
                    }}
                  >
                    {slot}
                  </button>
                );
              })}
            </div>
          </div>
        ) : null}
      </div>
      <div className="w-px shrink-0 bg-white/10" aria-hidden />
      <Popover open={dateOpen} onOpenChange={setDateOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="flex min-w-0 flex-1 cursor-pointer items-center justify-center gap-1.5 px-2 py-2.5 hover:bg-white/[0.06]"
          >
            <CalendarIcon className="size-3.5 shrink-0 text-[#0E78F9]" aria-hidden />
            <span className="tabular-nums">{dateStr}</span>
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="end"
          sideOffset={6}
          onWheel={(e) => e.stopPropagation()}
          className="z-[120] w-auto border border-white/10 bg-dark-2 p-0 text-white shadow-xl"
        >
          <Calendar
            mode="single"
            selected={date}
            onSelect={(d) => {
              onDateChange(d);
              setDateOpen(false);
            }}
            locale={ru}
            initialFocus
            className="rounded-lg border-0 bg-dark-2 p-2 text-white"
            classNames={{
              caption_label: 'text-sm font-semibold capitalize text-white',
              head_cell: 'text-zinc-300 rounded-md w-9 font-normal text-[0.75rem]',
              day: cn(
                'size-9 rounded-lg p-0 font-normal text-white',
                'hover:bg-white/10 aria-selected:opacity-100'
              ),
              day_selected: 'bg-blue-1 text-white hover:bg-blue-1 hover:text-white focus:bg-blue-1',
              day_today: 'bg-[#0E78F9]/20 text-white',
              nav_button: cn(
                'inline-flex size-8 items-center justify-center rounded-lg border border-white/10 bg-transparent text-white',
                'hover:bg-white/10 opacity-90'
              ),
              day_outside: 'text-slate-600 opacity-60',
              day_disabled: 'text-slate-600 opacity-40',
            }}
          />
        </PopoverContent>
      </Popover>
    </div>
  );
}

export type ScheduleMeetingFormProps = {
  meetingTitle: string;
  onMeetingTitleChange: (v: string) => void;
  description: string;
  onDescriptionChange: (v: string) => void;
  showDescription: boolean;
  onShowDescriptionChange: (v: boolean) => void;
  startDate: Date | undefined;
  onStartDateChange: (d: Date | undefined) => void;
  startTime: string;
  onStartTimeChange: (t: string) => void;
  duration: string;
  onDurationChange: (d: string) => void;
  inviteEmails: string[];
  onInviteEmailsChange: (emails: string[]) => void;
};

export function ScheduleMeetingForm({
  meetingTitle,
  onMeetingTitleChange,
  description,
  onDescriptionChange,
  showDescription,
  onShowDescriptionChange,
  startDate,
  onStartDateChange,
  startTime,
  onStartTimeChange,
  duration,
  onDurationChange,
  inviteEmails,
  onInviteEmailsChange,
}: ScheduleMeetingFormProps) {
  return (
    <div className="flex flex-col gap-5">
      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">Название</label>
        <Input
          value={meetingTitle}
          onChange={(e) => onMeetingTitleChange(e.target.value)}
          placeholder="Введите название"
          className={cn('h-11 border-white/10 px-3', INPUT_SHELL)}
        />
      </div>

      {!showDescription ? (
        <button
          type="button"
          className="inline-flex cursor-pointer items-center gap-1.5 self-start rounded-lg border border-[#0E78F9]/35 px-3 py-2 text-sm text-zinc-200 transition hover:border-[#0E78F9]/55 hover:bg-[#0E78F9]/10 hover:text-white"
          onClick={() => onShowDescriptionChange(true)}
        >
          <Plus className="size-4 text-[#0E78F9]" />
          Добавить описание
        </button>
      ) : (
        <div className="space-y-2">
          <label className="text-xs font-medium text-zinc-400">Описание</label>
          <Textarea
            value={description}
            onChange={(e) => onDescriptionChange(e.target.value)}
            placeholder="Дополнительные детали для участников…"
            className={cn('min-h-[88px] resize-none px-3 py-2.5', INPUT_SHELL)}
          />
        </div>
      )}

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">Время и дата</label>
        <StartDateTimePickers
          date={startDate}
          onDateChange={onStartDateChange}
          selectedTime={startTime}
          onSelectedTimeChange={onStartTimeChange}
        />
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">Длительность</label>
        <Select value={duration} onValueChange={onDurationChange}>
          <SelectTrigger
            className={cn(
              'h-11 w-fit min-w-[7.25rem] max-w-[11rem] cursor-pointer text-white [&_[data-slot=select-value]]:text-white',
              INPUT_SHELL
            )}
          >
            <SelectValue placeholder="Длительность" />
          </SelectTrigger>
          <SelectContent
            position="popper"
            className="z-[200] border border-white/10 bg-dark-2 text-white shadow-xl [&_[data-slot=select-item]]:text-white"
          >
            <SelectGroup>
              {DURATION_PRESETS.map((v) => (
                <SelectItem
                  key={v}
                  value={v}
                  className={cn(
                    'cursor-pointer text-white [&_svg]:text-white',
                    'focus:bg-[#0E78F9]/50 focus:text-white',
                    'data-[highlighted]:bg-[#0E78F9]/45 data-[highlighted]:text-white'
                  )}
                >
                  {v} мин
                </SelectItem>
              ))}
            </SelectGroup>
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <label className="text-xs font-medium text-zinc-400">Участники</label>
        <EmailChipsInput emails={inviteEmails} onChange={onInviteEmailsChange} />
      </div>
    </div>
  );
}
