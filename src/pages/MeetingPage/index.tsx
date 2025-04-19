'use client'
import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import { useUnit } from 'effector-react';
import { $user } from '@/shared/store/auth';
import { checkMediaPermissionsFx } from '@/shared/store/meetings';
import { $videoSDKToken } from '@/shared/store/videosdk';
import { v4 as uuidv4 } from 'uuid';
import dynamic from 'next/dynamic';

const MeetingProvider = dynamic(
  () => import('@videosdk.live/react-sdk').then(mod => mod.MeetingProvider),
  { ssr: false }
);

const MeetingRoom = dynamic(
  () => import('@/widgets/MeetingRoom'),
  { ssr: false }
);

const MeetingPage = () => {
  const [isBrowser, setIsBrowser] = useState(false);
  const [participantId, setParticipantId] = useState<string>('');
  
  const pathname = usePathname();
  const meetingId = pathname?.split('/').pop() || '';
  
  const [user] = useUnit([$user, $videoSDKToken]);
  const checkPermissions = useUnit(checkMediaPermissionsFx);

  useEffect(() => {
    setIsBrowser(true);
    
    if (!meetingId) return;

    checkPermissions();
    setParticipantId(uuidv4());

    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, [meetingId, checkPermissions]);

  if (!isBrowser || !meetingId) {
    return null;
  }

  return (
    <MeetingProvider
      config={{
        meetingId,
        micEnabled: false,
        webcamEnabled: false,
        debugMode: false,
        multiStream: true,
        name: user?.username || "Пользователь",
        participantId,
      }}
      token={process.env.NEXT_PUBLIC_AUTH_TOKEN || ''}
      reinitialiseMeetingOnConfigChange={true}
      joinWithoutUserInteraction={true}
    >
      <MeetingRoom />
    </MeetingProvider>
  );
}

export default MeetingPage;