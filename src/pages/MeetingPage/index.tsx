'use client'
import React, { useEffect, useState } from 'react';
import { MeetingProvider } from "@videosdk.live/react-sdk";
import MeetingRoom from '@/widgets/MeetingRoom';
import { useUnit } from 'effector-react';
import { $user } from '@/shared/store/auth';
import { $mediaState, checkMediaPermissionsFx } from '@/shared/store/meetings';
import { $videoSDKToken } from '@/shared/store/videosdk';
import { api } from '@/shared/lib/api';

type Props = {
    meetingId: string;
}

const MeetingPage = ({ meetingId }: Props) => {
    const [user] = useUnit([$user, $videoSDKToken]);
    
    const [participantId] = useState(() => crypto.randomUUID());
    const [meetingInfo, setMeetingInfo] = useState<{
        date: string;
        startTime: string;
        isActive: boolean;
    } | null>(null);
    const [loading, setLoading] = useState(true);
    
    const checkPermissions = useUnit(checkMediaPermissionsFx);

    useEffect(() => {
        const fetchMeetingData = async () => {
            try {
                const response = await api.get(`/meetings/${meetingId}`);
                console.log(response, '---RESP');
                const meeting = response.data.meeting;
                
                const now = new Date();
                const meetingDateTime = new Date(`${meeting.date}T${meeting.start_time}`);
                const meetingEndTime = new Date(meetingDateTime);
                meetingEndTime.setMinutes(meetingEndTime.getMinutes() + meeting.duration);
                
                setMeetingInfo({
                    date: meeting.date,
                    startTime: meeting.start_time,
                    isActive: now >= meetingDateTime && now <= meetingEndTime
                });
            } catch (error) {
                console.error('Ошибка при получении информации о встрече:', error);
                // Если не удалось получить данные, считаем что встреча активна
                setMeetingInfo({
                    date: '',
                    startTime: '',
                    isActive: true
                });
            } finally {
                setLoading(false);
            }
        };

        fetchMeetingData();
        checkPermissions();
        
        window.history.pushState(null, '', window.location.href);
        const handlePopState = () => {
            window.history.pushState(null, '', window.location.href);
        };
        window.addEventListener('popstate', handlePopState);
        
        return () => {
            window.removeEventListener('popstate', handlePopState);
        };
    }, [meetingId, participantId]);

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-2xl text-white">Загрузка информации о встрече...</div>
            </div>
        );
    }

    if (!meetingInfo?.isActive && meetingInfo) {
        return (
            <div className="flex items-center justify-center h-screen">
                <div className="text-center">
                    <h1 className="text-3xl font-bold text-white mb-4">
                        {new Date(`${meetingInfo.date}T${meetingInfo.startTime}`) > new Date() 
                            ? "Встреча еще не началась" 
                            : "Встреча уже завершилась"}
                    </h1>
                    <p className="text-xl text-gray-300">
                        Запланированное время: {meetingInfo.date} в {meetingInfo.startTime}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <MeetingProvider
            key={meetingId}
            config={{
                meetingId,
                micEnabled: false,
                webcamEnabled: false,
                debugMode: false,
                multiStream: true,
                name: user?.username || "Пользователь",
                participantId,
            }}
            token={process.env.NEXT_PUBLIC_AUTH_TOKEN as string}
        >
            <MeetingRoom />
        </MeetingProvider>
    );
}

export default MeetingPage;