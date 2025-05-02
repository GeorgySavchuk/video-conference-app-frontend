'use client'
import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useUnit } from 'effector-react';
import { $user } from '@/shared/store/auth';
import { checkMediaPermissionsFx } from '@/shared/store/meetings';
import { $videoSDKToken } from '@/shared/store/videosdk';
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
  const router = useRouter()
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const meetingId = pathname?.split('/').pop() || '';
  
  const [user] = useUnit([$user, $videoSDKToken]);
  const checkPermissions = useUnit(checkMediaPermissionsFx);

  const startTime = searchParams ? Number(searchParams.get('start')) : null;
  const duration = searchParams ? Number(searchParams.get('duration')) : null;

  const [timeLeft, setTimeLeft] = useState<number>(() => {
    if (!startTime || !duration) return 0;
    const endTime = startTime + duration * 60000;
    return Math.max(0, Math.floor((endTime - Date.now()) / 60000));
  });

  useEffect(() => {
    if (!meetingId) return;
    checkPermissions();
     // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [meetingId]);

  useEffect(() => {
    const handlePopState = () => {
      window.history.pushState(null, '', window.location.href);
    };

    window.history.pushState(null, '', window.location.href);
    window.addEventListener('popstate', handlePopState);
    
    return () => {
      window.removeEventListener('popstate', handlePopState);
    };
  }, []);

  useEffect(() => {
    if (!startTime || !duration) return;

    const timer = setInterval(() => {
      const endTime = startTime + duration * 60000;
      const remaining = Math.floor((endTime - Date.now()) / 60000);
      
      if (remaining <= 0) {
        clearInterval(timer);
        router.push('/');
        return;
      }
      
      setTimeLeft(remaining);
    }, 30000);

    return () => clearInterval(timer);
  }, [startTime, duration, router]);

  if (!meetingId || !startTime || !duration) {
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
      }}
      token={process.env.NEXT_PUBLIC_AUTH_TOKEN || ''}
      reinitialiseMeetingOnConfigChange={true}
      joinWithoutUserInteraction={true}
    >
      <MeetingRoom 
        timeLeft={timeLeft}
      />
    </MeetingProvider>
  );
}

export default MeetingPage;