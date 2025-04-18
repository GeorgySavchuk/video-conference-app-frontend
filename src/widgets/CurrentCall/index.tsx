'use client';
import {useEffect} from 'react';
import MeetingCard from '@/entities/MeetingCard';
import { useUnit } from 'effector-react';
import { 
  $currentMeeting,
  $meetingsError,
  getCurrentMeeting
} from '@/shared/store/meetings';
import { $user } from '@/shared/store/auth';

const CurrentCall = () => {
    const [currentMeeting, error, fetchCurrentMeeting, user] = useUnit([
        $currentMeeting,
        $meetingsError,
        getCurrentMeeting,
        $user,
    ]);

    useEffect(() => {
        fetchCurrentMeeting(String(user.ID));
    }, [fetchCurrentMeeting, user.ID]);
  
    if (error) {
        return null;
    }

    if (!currentMeeting || Object.keys(currentMeeting).length === 0) {
        return null;
    }

    return (
        <div className="p-4">
            <h2 className="text-3xl font-bold text-white mb-4">Текущая встреча</h2>
            <MeetingCard
                icon="/icons/upcoming.svg"
                title={currentMeeting.description || 'Текущая встреча'}
                date={formatMeetingTimeRange(
                    currentMeeting.date,
                    currentMeeting.start_time,
                    Number(currentMeeting.duration)
                )}
                link={currentMeeting.link}
                buttonText="Присоединиться"
                handleClick={() => {
                }}
            />
        </div>
    );
};

function formatMeetingTimeRange(dateStr: string, startTime: string, duration: number): string {
    try {
        const [hours, minutes] = startTime.split(':').map(Number);
        const startMinutes = hours * 60 + minutes;
        
        const endMinutes = startMinutes + duration;
        const endHours = Math.floor(endMinutes / 60);
        const endMins = endMinutes % 60;
        const endTime = `${endHours.toString().padStart(2, '0')}:${endMins.toString().padStart(2, '0')}`;
        
        return `${dateStr} ${startTime}-${endTime}`;
    } catch {
        return `${dateStr} ${startTime}`;
    }
}

export default CurrentCall;