'use client'
import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Timer from '@/entities/Timer';
import MeetingTypeList from '@/entities/MeetingTypeList';
import CurrentCall from '@/widgets/CurrentCall';
import {
    $currentMeeting,
    $upcomingMeetings,
    getCurrentMeeting,
    getUpcomingMeetings,
} from '@/shared/store/meetings';
import { useUnit } from 'effector-react';
import { $user } from '@/shared/store/auth';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { HellconfDialogActions, HellconfDialogContent } from '@/shared/ui/hellconf-dialog';
import { Button } from '@/shared/ui/button';
import { SESSION_ENDED_QUERY_PARAM } from '@/shared/lib/sessionEndedNav';
import { TimerOff } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import {
    formatMeetingClockRange,
    isMeetingSlotActiveNow,
    parseMeetingTitle,
} from '@/shared/lib/meetingDisplay';
import Image from 'next/image';

const HomePage = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const [upcomingMeetings, fetchMeetings, user, currentMeeting] = useUnit([
        $upcomingMeetings,
        getUpcomingMeetings,
        $user,
        $currentMeeting,
    ]);
    const [sessionEndedOpen, setSessionEndedOpen] = useState(false);
    /** Перерисовка раз в секунду, чтобы скрыть «текущую встречу» сразу после окончания слота. */
    const [uiTick, setUiTick] = useState(0);

    useEffect(() => {
        const t = window.setInterval(() => setUiTick((n) => n + 1), 1000);
        return () => window.clearInterval(t);
    }, []);

    useEffect(() => {
        if (!user?.ID) return;
        const id = String(user.ID);
        const refreshMeetings = () => {
            fetchMeetings(id);
            getCurrentMeeting(id);
        };
        refreshMeetings();
        const poll = window.setInterval(refreshMeetings, 25_000);
        const onVis = () => {
            if (document.visibilityState === 'visible') refreshMeetings();
        };
        document.addEventListener('visibilitychange', onVis);
        return () => {
            window.clearInterval(poll);
            document.removeEventListener('visibilitychange', onVis);
        };
    }, [user?.ID, fetchMeetings, getCurrentMeeting]);

    useEffect(() => {
        if (searchParams?.get(SESSION_ENDED_QUERY_PARAM) !== '1') return;
        setSessionEndedOpen(true);
        router.replace('/', { scroll: false });
    }, [searchParams, router]);

    const nextMeeting = upcomingMeetings?.[0];
    const rawCurrentMeeting =
        currentMeeting && typeof currentMeeting === 'object' && Object.keys(currentMeeting).length > 0
            ? currentMeeting
            : null;
    const hasCurrentMeeting = useMemo(
        () => Boolean(rawCurrentMeeting && isMeetingSlotActiveNow(rawCurrentMeeting)),
        [rawCurrentMeeting, uiTick],
    );
    let statusPillText: string;
    if (hasCurrentMeeting && rawCurrentMeeting) {
        const title = parseMeetingTitle(rawCurrentMeeting.description) || 'Встреча';
        const range = formatMeetingClockRange(
            rawCurrentMeeting.start_time,
            Number(rawCurrentMeeting.duration)
        );
        statusPillText = `Сейчас идёт встреча «${title}» — ${range}`;
    } else if (nextMeeting) {
        statusPillText = `Следующая встреча в ${nextMeeting.start_time}`;
    } else {
        statusPillText = 'На сегодня встреч не запланировано';
    }

    return (
        <section className="relative flex size-full flex-col gap-10 text-white">
            <Dialog open={sessionEndedOpen} onOpenChange={setSessionEndedOpen}>
                <HellconfDialogContent maxWidthClass="max-w-md">
                    <DialogHeader className="gap-0 space-y-5 text-left">
                        <div className="flex gap-4">
                            <div
                                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-[#0E78F9]/30 bg-gradient-to-br from-[#0E78F9]/20 to-[#0E78F9]/5 shadow-inner"
                                aria-hidden
                            >
                                <TimerOff className="size-7 text-[#6eb7fc]" strokeWidth={1.75} />
                            </div>
                            <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                                <DialogTitle className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                                    Встреча завершена
                                </DialogTitle>
                                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                                    Время сессии истекло
                                </p>
                            </div>
                        </div>
                        <DialogDescription className="text-left text-sm leading-relaxed text-zinc-400">
                            Отведённое на эту встречу время закончилось — сессия в комнате завершена.
                        </DialogDescription>
                    </DialogHeader>
                    <HellconfDialogActions>
                        <Button
                            type="button"
                            className="h-12 w-full rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110"
                            onClick={() => setSessionEndedOpen(false)}
                        >
                            Понятно
                        </Button>
                    </HellconfDialogActions>
                </HellconfDialogContent>
            </Dialog>

            <div className="relative z-[1] flex flex-col gap-10">
                <div
                    className={cn(
                        'isolate overflow-hidden rounded-2xl border border-white/[0.07]',
                        'bg-[#12151f]/85 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl',
                        'ring-1 ring-inset ring-white/[0.04]'
                    )}
                >
                    <div className="flex flex-col lg:min-h-[min(260px,36vh)] lg:flex-row">
                        <div className="relative flex min-h-[160px] flex-col items-center justify-center border-b border-white/[0.06] bg-gradient-to-br from-[#0E78F9]/[0.12] via-[#12151f] to-[#12151f] px-8 py-10 lg:min-h-0 lg:w-[220px] lg:max-w-[38%] lg:shrink-0 lg:border-b-0 lg:border-r lg:border-white/[0.06]">
                            <div
                                className="pointer-events-none absolute inset-0 opacity-[0.45]"
                style={{
                                    backgroundImage:
                                        'radial-gradient(circle at 50% 42%, rgba(14,120,249,0.35) 0%, transparent 58%)',
                                }}
                                aria-hidden
                            />
                            <div className="relative flex h-[4.5rem] w-[4.5rem] items-center justify-center rounded-2xl border border-[#0E78F9]/35 bg-gradient-to-b from-white/[0.08] to-white/[0.02] shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] sm:h-20 sm:w-20">
                                <Image src="/icons/logo.svg" alt="" width={40} height={40} className="opacity-95" />
                            </div>
                            <p className="relative mt-4 text-[11px] font-semibold uppercase tracking-[0.22em] text-zinc-500">
                                HellConf
                            </p>
                        </div>

                        <div className="flex min-h-0 min-w-0 flex-1 flex-col justify-center gap-6 px-6 py-8 sm:px-10 sm:py-10">
                            <div className="min-w-0 space-y-3">
                                <div
                                    className={cn(
                                        'inline-flex max-w-full items-center rounded-full border border-white/[0.08]',
                                        'bg-white/[0.04] px-4 py-2.5 text-sm leading-snug text-zinc-300 backdrop-blur-sm',
                                        'break-words'
                                    )}
                                >
                                    {statusPillText}
                                </div>
                            </div>
                            <div>
                                <p className="mb-1 text-xs font-medium uppercase tracking-wider text-zinc-500">
                                    Сейчас
                                </p>
                                <h1 className="text-[clamp(2.25rem,8vw,4.5rem)] font-semibold tabular-nums tracking-tight text-white lg:text-6xl xl:text-7xl">
                                    <Timer />
                        </h1>
                            </div>
                        </div>
                    </div>
                </div>

                <MeetingTypeList />
                <CurrentCall />
            </div>
        </section>
    );
};

export default HomePage;