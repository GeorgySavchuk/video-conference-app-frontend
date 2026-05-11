'use client';
import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import MeetingCard from '@/entities/MeetingCard';
import { useUnit } from 'effector-react';
import { toast } from 'sonner';
import { Button } from '@/shared/ui/button';
import {
    Dialog,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/shared/ui/dialog';
import { HellconfDialogActions, HellconfDialogContent } from '@/shared/ui/hellconf-dialog';
import { Calendar, CalendarX, Loader2 } from 'lucide-react';
import {
    $meetingsError,
    $meetingsLoading,
    $upcomingMeetings,
    cancelMeeting,
    cancelMeetingFx,
    getUpcomingMeetings,
} from '@/shared/store/meetings';
import { $user } from '@/shared/store/auth';
import { cn } from '@/shared/lib/utils';
import {
    canJoinMeetingSlot,
    formatMeetingTimeRange,
    isMeetingSlotNotEnded,
} from '@/shared/lib/meetingDisplay';

const LIST_CARD_SHELL = cn(
    'overflow-hidden rounded-2xl border border-white/[0.07]',
    'bg-[#12151f]/85 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl',
    'ring-1 ring-inset ring-white/[0.04]'
);

const CallList = () => {
    const router = useRouter();
    const [cancelTarget, setCancelTarget] = useState<{
        id: number;
        title: string;
    } | null>(null);
    const [apiMeetings, loading, error, fetchMeetings, user, cancelPending] = useUnit([
        $upcomingMeetings,
        $meetingsLoading,
        $meetingsError,
        getUpcomingMeetings,
        $user,
        cancelMeetingFx.pending,
    ]);

    useEffect(() => {
      if (!user?.ID) return;
      fetchMeetings(String(user.ID));
    }, [user?.ID, fetchMeetings]);

    /** Тик, чтобы после окончания слота карточка пропала без ручного refetch (локальное время). */
    const [slotTick, setSlotTick] = useState(0);
    useEffect(() => {
        const id = window.setInterval(() => setSlotTick((n) => n + 1), 1000);
        return () => window.clearInterval(id);
    }, []);

    useEffect(() => {
        const offFail = cancelMeetingFx.fail.watch(({ error }) => {
            const msg =
                error.response?.data?.error ||
                error.response?.data?.message ||
                error.message ||
                'Не удалось отменить встречу';
            toast.error(msg);
        });
        return () => offFail();
    }, []);

    useEffect(() => {
        return cancelMeetingFx.done.watch(({ result }) => {
            const sent = result.cancellation_emails_sent;
            const failedN = result.cancellation_emails_failed.length;
            if (failedN === 0 && sent > 0) {
                toast.success(
                    sent === 1
                        ? 'Встреча отменена. Уведомление ушло на почту подписчику.'
                        : `Встреча отменена. Уведомления отправлены (${sent} адресов).`,
                );
            } else if (sent > 0 && failedN > 0) {
                toast.warning(
                    `Встреча отменена. Писем доставлено: ${sent}, не доставлено: ${failedN}.`,
                );
            } else if (failedN > 0) {
                toast.warning('Встреча отменена. Часть писем об отмене не удалось доставить.');
            } else {
                toast.success('Встреча отменена.');
            }
        });
    }, []);

    const openMeeting = (link: string) => {
      const trimmed = link.trim();
      if (!trimmed) return;
      if (trimmed.startsWith('http')) {
        window.location.assign(trimmed);
      } else {
        router.push(trimmed.startsWith('/') ? trimmed : `/${trimmed}`);
      }
    };

    const visibleMeetings = useMemo(
        () =>
            apiMeetings.filter((m) =>
                isMeetingSlotNotEnded({
                    date: m.date,
                    start_time: m.start_time,
                    duration: Number(m.duration) || 0,
                }),
            ),
        [apiMeetings, slotTick],
    );

    const meetings = visibleMeetings.map((meeting) => ({
        id: meeting.id,
        date: meeting.date,
        start_time: meeting.start_time,
        duration: meeting.duration,
        description: meeting.description,
        link: meeting.link,
        canJoin: canJoinMeetingSlot({
            date: meeting.date,
            start_time: meeting.start_time,
            duration: Number(meeting.duration) || 0,
        }),
    }));

    const openCancelDialog = (meetingId: number, title: string) => {
        setCancelTarget({ id: meetingId, title });
    };

    const closeCancelDialog = () => {
        setCancelTarget(null);
    };

    const submitCancel = () => {
        if (!cancelTarget) return;
        cancelMeeting({ id: cancelTarget.id, creator_id: String(user.ID) });
        setCancelTarget(null);
    };

    const retryFetch = () => {
        fetchMeetings(String(user.ID));
    };

    return (
      <div className="flex w-full max-w-3xl flex-col gap-6">
        <Dialog
            open={cancelTarget !== null}
            onOpenChange={(open) => {
                if (!open) closeCancelDialog();
            }}
        >
            <HellconfDialogContent maxWidthClass="max-w-[440px]">
                    <DialogHeader className="gap-0 space-y-5 text-left">
                        <div className="flex gap-4">
                            <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-rose-500/25 bg-gradient-to-br from-rose-500/15 to-rose-600/5 shadow-inner shadow-rose-900/20"
                                aria-hidden
                            >
                                <CalendarX className="size-7 text-rose-300/95" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                                <DialogTitle className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                                    Отменить встречу?
                                </DialogTitle>
                                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                                    Действие необратимо
                                </p>
                            </div>
                        </div>
                        <DialogDescription asChild>
                            <div className="space-y-4 text-left">
                                <p className="text-sm leading-relaxed text-zinc-400">
                                    Встреча исчезнет из списка. Тем, кто подписался на напоминания по почте,
                                    отправим уведомление об отмене.
                                </p>
                                {cancelTarget ? (
                                    <div className="rounded-2xl border border-white/[0.08] bg-gradient-to-br from-[#1c2133] via-[#161925] to-[#151927] px-4 py-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
                                        <p className="text-[11px] font-medium uppercase tracking-wide text-zinc-500">
                                            Встреча
                                        </p>
                                        <p className="mt-1 line-clamp-3 text-base font-semibold leading-snug text-white">
                                            {cancelTarget.title}
                                        </p>
                                    </div>
                                ) : null}
                            </div>
                        </DialogDescription>
                    </DialogHeader>

                    <HellconfDialogActions className="mt-8">
                        <Button
                            type="button"
                            className="h-12 w-full rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110 focus-visible:ring-2 focus-visible:ring-[#0E78F9]/50"
                            onClick={closeCancelDialog}
                        >
                            Оставить встречу
                        </Button>
                        <Button
                            type="button"
                            variant="outline"
                            className="h-12 w-full rounded-2xl border-rose-500/35 bg-rose-950/25 text-base font-semibold text-rose-100 hover:bg-rose-950/40 hover:text-rose-50"
                            onClick={submitCancel}
                        >
                            Отменить встречу
                        </Button>
                    </HellconfDialogActions>
            </HellconfDialogContent>
        </Dialog>

        {loading ? (
          <div className={cn(LIST_CARD_SHELL, 'flex flex-col items-center justify-center gap-4 px-8 py-14')}>
            <Loader2 className="size-10 animate-spin text-[#6eb7fc]" aria-hidden />
            <p className="text-center text-sm font-medium text-zinc-400">Загружаем расписание…</p>
          </div>
        ) : error ? (
          <div className={cn(LIST_CARD_SHELL, 'space-y-5 px-8 py-10')}>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between sm:gap-6">
              <div className="space-y-2">
                <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">Ошибка</p>
                <p className="text-base leading-relaxed text-red-200/95">{error}</p>
              </div>
            </div>
            <Button
              type="button"
              onClick={retryFetch}
              className="h-11 w-full rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110 sm:w-auto sm:px-8"
            >
              Повторить
            </Button>
          </div>
        ) : meetings && meetings.length > 0 ? (
          meetings.map((meeting) => (
            (() => {
              const raw = meeting.description || '';
              const parts = raw.split('\n\n');
              const title = (parts[0] || '').trim() || 'Без названия';
              const subtitle = parts.slice(1).join('\n\n').trim() || undefined;
              return (
            <MeetingCard
              key={meeting.id}
              icon={'/icons/upcoming.svg'}
              title={title}
              subtitle={subtitle}
              date={formatMeetingTimeRange(meeting.date, meeting.start_time, Number(meeting.duration))}
              link={meeting.link}
              buttonText="Подключиться"
              isButtonDisabled={!meeting.canJoin}
              handleClick={() => openMeeting(meeting.link)}
              onCancel={() =>
                openCancelDialog(meeting.id, meeting.description?.trim() || 'Без описания')
              }
              cancelPending={cancelPending}
            />
              );
            })()
          ))
        ) : (
          <div className={cn(LIST_CARD_SHELL, 'relative px-8 py-12 text-center')}>
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage:
                  'radial-gradient(circle at 50% 35%, rgba(14,120,249,0.2) 0%, transparent 55%)',
              }}
              aria-hidden
            />
            <div className="relative mx-auto flex max-w-sm flex-col items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-[#0E78F9]/30 bg-gradient-to-br from-[#0E78F9]/20 to-[#0E78F9]/5 shadow-inner">
                <Calendar className="size-7 text-[#6eb7fc]" strokeWidth={1.75} aria-hidden />
              </div>
              <p className="text-lg font-medium leading-snug text-zinc-300">
                На ближайшее время встреч не запланировано
              </p>
            </div>
          </div>
        )}
      </div>
    );
};

export default CallList;
