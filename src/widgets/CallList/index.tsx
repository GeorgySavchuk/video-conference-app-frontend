'use client';
import { useEffect } from 'react';
import MeetingCard from '@/entities/MeetingCard';
import { useUnit } from 'effector-react';
import { $meetingsError, $meetingsLoading, $upcomingMeetings, getUpcomingMeetings } from '@/shared/store/meetings';
import { $user } from '@/shared/store/auth';

const CallList = () => {
    const [apiMeetings, loading, error, fetchMeetings, user] = useUnit([$upcomingMeetings, $meetingsLoading, $meetingsError, getUpcomingMeetings, $user]);

    useEffect(() => {
      fetchMeetings(String(user.ID));
    }, [fetchMeetings, user.ID]);

    const isMeetingStarted = (date: string, startTime: string) => {
      const meetingDateTime = new Date(`${date}T${startTime}`);
      return meetingDateTime <= new Date();
    };

    const meetings = apiMeetings.map(meeting => ({
      date: meeting.date,
      start_time: meeting.start_time,
      duration: meeting.duration,
      description: meeting.description,
      link: meeting.link,
      isActive: isMeetingStarted(meeting.date, meeting.start_time)
    }));

    if (loading) {
      return <div className="text-white">Загрузка встреч...</div>;
    }
  
    if (error) {
      return <div className="text-red-500">Ошибка: {error}</div>;
    }

    return (
      <div className="flex flex-col gap-4 py-4">
        {meetings && meetings.length > 0 ? (
          meetings.map((meeting, idx) => (
            <MeetingCard
              key={idx}
              icon={'/icons/upcoming.svg'}
              title={meeting.description || 'Без описания'}
              date={formatMeetingTimeRange(meeting.date, meeting.start_time, Number(meeting.duration))}
              link={meeting.link}
              buttonText="Подключиться"
              isButtonDisabled={!meeting.isActive}
              handleClick={() => {}}
            />
          ))
        ) : (
          <h1 className="text-2xl font-bold text-white">На ближайшее время встреч не запланировано</h1>
        )}
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

export default CallList;