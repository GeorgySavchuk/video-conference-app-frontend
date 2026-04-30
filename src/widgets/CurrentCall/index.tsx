'use client';
import { useEffect, useState } from 'react';
import MeetingCard from '@/entities/MeetingCard';
import { cn } from '@/shared/lib/utils';
import { useUnit } from 'effector-react';
import { $currentMeeting, $meetingsError } from '@/shared/store/meetings';
import { useRouter } from 'next/navigation';
import { formatMeetingTimeRange, isMeetingSlotActiveNow, parseMeetingTitle } from '@/shared/lib/meetingDisplay';

const CurrentCall = () => {
    const [currentMeeting, error] = useUnit([$currentMeeting, $meetingsError]);
    const router = useRouter();
    const [, setUiTick] = useState(0);

    useEffect(() => {
        if (!currentMeeting || Object.keys(currentMeeting).length === 0) return;
        const t = window.setInterval(() => setUiTick((n) => n + 1), 1000);
        return () => window.clearInterval(t);
    }, [currentMeeting?.id]);

    if (error) {
        return null;
    }

    if (!currentMeeting || Object.keys(currentMeeting).length === 0) {
        return null;
    }

    if (!isMeetingSlotActiveNow(currentMeeting)) {
        return null;
    }

    const handleJoinMeeting = () => {
        if (currentMeeting.link) {
            if (currentMeeting.link.startsWith('http')) {
                window.open(currentMeeting.link, '_blank');
            } else {
                router.push(currentMeeting.link);
            }
        }
    };

    const raw = currentMeeting.description || '';
    const parts = raw.split('\n\n');
    const title = parseMeetingTitle(raw) || 'Текущая встреча';
    const subtitle = parts.slice(1).join('\n\n').trim() || undefined;

    return (
        <div
            className={cn(
                'overflow-hidden rounded-2xl border border-white/[0.07] p-6 sm:p-8',
                'bg-[#12151f]/90 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl',
                'ring-1 ring-white/[0.04]'
            )}
        >
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-zinc-500">
                Текущая встреча
            </p>
            <div className="mt-4">
                <MeetingCard
                    icon="/icons/upcoming.svg"
                    title={title}
                    subtitle={subtitle}
                    date={formatMeetingTimeRange(
                        currentMeeting.date,
                        currentMeeting.start_time,
                        Number(currentMeeting.duration)
                    )}
                    link={currentMeeting.link}
                    buttonText="Присоединиться"
                    handleClick={handleJoinMeeting}
                />
            </div>
        </div>
    );
};

export default CurrentCall;