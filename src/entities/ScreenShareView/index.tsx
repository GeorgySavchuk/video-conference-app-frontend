'use client';

import React, { useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { cn } from '@/shared/lib/utils';
import { BsCameraVideo } from 'react-icons/bs';

type Props = {
  stream: MediaStream | null;
  displayName?: string;
  isLocal: boolean;
  audioSinkId?: string;
  fillAvailable?: boolean;
  /** Один участник: нижний бар поверх када — поднимаем подпись над панелью */
  overlapBottomNav?: boolean;
  /** Внутри оболочки «докладчик» с rounded-2xl — без вложенного rounded-3xl */
  spotlightShell?: boolean;
};

const ScreenShareView = ({
  stream,
  displayName,
  isLocal,
  audioSinkId,
  fillAvailable = false,
  overlapBottomNav = false,
  spotlightShell = false,
}: Props) => {
  const screenShareAudioRef = useRef<HTMLAudioElement>(null);
  const inSpotlightShell = Boolean(fillAvailable && spotlightShell);

  useEffect(() => {
    const el = screenShareAudioRef.current;
    if (!el) return;
    if (stream && !isLocal) {
      const audioTracks = stream.getAudioTracks();
      if (audioTracks.length > 0) {
        el.srcObject = new MediaStream(audioTracks);
        el.play().catch(console.error);
        if (
          audioSinkId &&
          'setSinkId' in el &&
          typeof (el as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> })
            .setSinkId === 'function'
        ) {
          (el as HTMLAudioElement & { setSinkId: (id: string) => Promise<void> })
            .setSinkId(audioSinkId)
            .catch(console.error);
        }
      } else {
        el.srcObject = null;
      }
    } else {
      el.srcObject = null;
    }
    return () => {
      if (el) el.srcObject = null;
    };
  }, [stream, isLocal, audioSinkId]);

  return (
    <div
      className={cn(
        'relative w-full min-h-0',
        fillAvailable ? 'flex h-full min-h-0 flex-1 flex-col' : 'aspect-video max-h-full'
      )}
    >
      <div
        className={cn(
          'relative min-h-0 overflow-hidden bg-slate-950/95',
          'border border-emerald-400/50 ring-1 ring-inset ring-emerald-400/20',
          'shadow-[inset_0_0_52px_rgba(16,185,129,0.14)]',
          inSpotlightShell ? 'rounded-2xl' : 'rounded-3xl',
          fillAvailable ? 'flex min-h-0 flex-1 flex-col' : 'h-full w-full'
        )}
      >
          <audio ref={screenShareAudioRef} autoPlay playsInline muted={isLocal} />

          {stream ? (
            <div
              className={cn(
                'w-full overflow-hidden',
                'rounded-2xl',
                fillAvailable ? 'relative min-h-0 flex-1' : 'h-full'
              )}
            >
              <div className={cn(fillAvailable ? 'absolute inset-0' : 'h-full w-full')}>
                <ReactPlayer
                  playsinline
                  pip={false}
                  light={false}
                  controls={false}
                  muted
                  playing
                  url={stream}
                  width="100%"
                  height="100%"
                  style={{
                    borderRadius: inSpotlightShell ? 14 : 16,
                    objectFit: 'contain',
                  }}
                  onError={console.error}
                />
              </div>
              <div className="absolute left-4 top-4 flex items-center rounded-full bg-black bg-opacity-70 px-3 py-1 text-white">
                <BsCameraVideo className="mr-2 text-emerald-300" size={14} />
                <span className="text-sm font-medium">Демонстрация экрана</span>
              </div>
            </div>
          ) : (
            <div
              className={cn(
                'flex w-full items-center justify-center',
                fillAvailable ? 'min-h-[12rem] flex-1' : 'h-full'
              )}
            >
              <span className="text-xl text-white">
                {displayName || (isLocal ? 'Ваш экран' : 'Экран участника')}
              </span>
            </div>
          )}

          <div
            className={cn(
              'absolute flex items-end justify-between',
              overlapBottomNav && fillAvailable
                ? 'bottom-[calc(3.75rem+max(0.75rem,env(safe-area-inset-bottom,0px)))] left-5 right-5 sm:left-6 sm:right-6'
                : 'bottom-4 left-4 right-4',
            )}
          >
            <div className="rounded bg-black bg-opacity-50 px-2 py-1 text-white">
              {displayName || (isLocal ? 'Вы' : 'Пользователь')}
            </div>
          </div>
      </div>
    </div>
  );
};

export default ScreenShareView;
