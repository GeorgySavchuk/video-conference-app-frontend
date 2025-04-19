'use client'
import React, { useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import { useUnit } from 'effector-react';
import { $user } from '@/shared/store/auth';
import { checkMediaPermissionsFx } from '@/shared/store/meetings';
import { $videoSDKToken } from '@/shared/store/videosdk';
import { v4 as uuidv4 } from 'uuid';
const MeetingProvider = dynamic(
    () => import("@videosdk.live/react-sdk").then((mod) => mod.MeetingProvider),
    { ssr: false }
  );
  const MeetingRoom = dynamic(() => import('@/widgets/MeetingRoom'), { ssr: false });

type Props = {
    meetingId: string;
}

const MeetingPage = ({ meetingId }: Props) => {
    const [user] = useUnit([$user, $videoSDKToken]);
    const [mounted, setMounted] = useState(false);
    
    const [participantId] = useState(() => mounted ? uuidv4() : '');
    
    const checkPermissions = useUnit(checkMediaPermissionsFx);

    useEffect(() => {
        setMounted(true);
        checkPermissions();
        
        if (typeof window !== 'undefined') {
            window.history.pushState(null, '', window.location.href);
            const handlePopState = () => {
                window.history.pushState(null, '', window.location.href);
            };
            window.addEventListener('popstate', handlePopState);
            
            return () => {
                window.removeEventListener('popstate', handlePopState);
            };
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [meetingId]);

    if (!mounted) {
        return <div className="flex items-center justify-center h-screen">Loading...</div>;
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
                maxResolution: 'hd',
                mode: 'SEND_AND_RECV',
            }}
            token={process.env.NEXT_PUBLIC_AUTH_TOKEN || ''}
        >
            <MeetingRoom />
        </MeetingProvider>
    );
}

export default MeetingPage;