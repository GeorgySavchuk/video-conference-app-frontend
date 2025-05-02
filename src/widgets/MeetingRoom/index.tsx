'use client'
import React, { useEffect, useState, useRef } from 'react';
import ParticipantView from '@/entities/ParticipantView';
import ScreenShareView from '@/entities/ScreenShareView';
import { useMeeting } from '@videosdk.live/react-sdk';
import Controls from '@/entities/Controls';
import { toast } from 'sonner';

const MeetingRoom = ({ timeLeft }: { 
    timeLeft: number,  
}) => {
    const [presenterId, setPresenterId] = useState<string | null>(null);
    const [participantsList, setParticipantsList] = useState<string[]>([]);
    const [mainParticipantId, setMainParticipantId] = useState<string | null>(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const lastActiveSpeakerId = useRef<string | null>(null);
    
    const { participants, activeSpeakerId, localParticipant, leave } = useMeeting({
        onPresenterChanged: (presenterId) => {
            setPresenterId(presenterId);
            if (presenterId) {
                toast.success('Включена демонстрация экрана');
            } else {
                toast.info('Демонстрация экрана остановлена');
            }
        },
        onMeetingJoined: () => {
            console.log("Успешное подключение");
            setIsInitialized(true);
        },
        onMeetingLeft: () => {
            console.log("Отключился от встречи");
            setIsInitialized(false);
        },
        onError: (error) => {
            console.error("Ошибка в Meeting:", error);
            toast.error(`Ошибка: ${error.message}`);
            setIsInitialized(false);
        },
    });

    useEffect(() => {
        if (timeLeft <= 5) {
          toast.warning(`До конца встречи осталось ${timeLeft} мин`);
        }
        if (timeLeft === 0) {
          leave();
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [timeLeft]);
  
    useEffect(() => {
        setParticipantsList([...participants.keys()]);
    }, [participants]);

    useEffect(() => {
        if (presenterId) {
            setMainParticipantId(presenterId);
        } else if (activeSpeakerId) {
            lastActiveSpeakerId.current = activeSpeakerId;
            setMainParticipantId(activeSpeakerId);
        } else if (!mainParticipantId) {
            setMainParticipantId(localParticipant?.id || null);
        }
    }, [presenterId, activeSpeakerId, mainParticipantId, localParticipant]);

    const otherParticipants = participantsList.filter(id => presenterId ? id : id !== mainParticipantId);

    if (!isInitialized) {
        return null;
    }

    return (
        <div className='relative flex gap-10 h-full'>
            <div className="flex-1 flex items-center justify-center">
                {presenterId ? (
                    <ScreenShareView 
                        participantId={presenterId}
                        isLocal={presenterId === localParticipant?.id}
                    />
                ) : mainParticipantId && (
                    <ParticipantView 
                        participantId={mainParticipantId}
                        isActiveSpeaker={activeSpeakerId === mainParticipantId}
                    />
                )}
            </div>
            
            {otherParticipants.length > 0 && (
                <div className="w-[300px] border-l border-gray-700 bg-gray-800 flex flex-col overflow-y-auto mt-5 mr-5 mb-5 space-y-4 rounded-3xl">
                    {otherParticipants.map(participantId => (
                        <ParticipantView
                            key={participantId}
                            participantId={participantId}
                            isActiveSpeaker={false}
                        />
                    ))}
                </div>
            )}
            
            <Controls 
                isScreenSharing={presenterId === localParticipant?.id}
            />
        </div>
    );
};

export default MeetingRoom;