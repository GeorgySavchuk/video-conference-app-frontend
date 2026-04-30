'use client';

import React, { useEffect, useRef } from 'react';
import ReactPlayer from 'react-player';
import { useUnit } from 'effector-react';
import { cn } from '@/shared/lib/utils';
import { FaMicrophone, FaMicrophoneSlash } from 'react-icons/fa';
import { BsCameraVideo, BsCameraVideoOff } from 'react-icons/bs';
import { $avatarImageNonce } from '@/shared/store/auth';
import { UserAvatarDisplay } from '@/shared/ui/user-avatar';

type Props = {
  displayName: string;
  videoStream: MediaStream | null;
  audioStream: MediaStream | null;
  isActiveSpeaker: boolean;
  micOn: boolean;
  webcamOn: boolean;
  isLocal?: boolean;
  mirrored?: boolean;
  /** Вывод удалённого аудио (Chrome: HTMLMediaElement.setSinkId). */
  audioSinkId?: string;
  /** Занять всю доступную высоту (один участник в комнате). */
  fillAvailable?: boolean;
  /** Маленькая плитка в боковой полосе / горизонтальной ленте. */
  variant?: 'default' | 'tile';
  /** Плитка поверх видео (фильмстрим): без лишней тени — её даёт обёртка. */
  floatTile?: boolean;
  /** Как в ЛК (`preset:` / `avatars/…`): показываем при выключенной камере. */
  profileAvatar?: string;
  /** Плитка в сетке «Расширенный» — на телефоне задаём минимальный размер, чтобы не схлопывалась и не «терялись» оверлеи. */
  gridCell?: boolean;
  /** Демонстрирует экран — рамка изумрудная (как у демонстрации), важнее чем «говорит». */
  isPresenting?: boolean;
  /** Нижний бар фиксирован поверх кадра — подпись выше, чтобы не перекрывалась плашкой Controls. */
  overlapBottomNav?: boolean;
  /**
   * Главный кадр внутри оболочки «докладчик» (rounded-2xl снаружи).
   * Без этого внутри включалось rounded-3xl — двойное скругление ломало стык с колонкой превью.
   */
  spotlightShell?: boolean;
};

type FrameEmphasis = 'idle' | 'speaking' | 'presenting';

function initialsFromDisplayName(name: string): string {
  const t = name.trim();
  if (!t) return '?';
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) {
    const a = parts[0][0];
    const b = parts[parts.length - 1][0];
    if (a && b) return (a + b).toUpperCase();
  }
  return t.slice(0, 2).toUpperCase();
}

const ParticipantView = ({
  displayName,
  videoStream,
  audioStream,
  isActiveSpeaker,
  micOn,
  webcamOn,
  isLocal = false,
  mirrored = true,
  audioSinkId,
  fillAvailable = false,
  variant = 'default',
  floatTile = false,
  profileAvatar,
  gridCell = false,
  isPresenting = false,
  overlapBottomNav = false,
  spotlightShell = false,
}: Props) => {
  const avatarNonce = useUnit($avatarImageNonce);
  const isTile = variant === 'tile' && !fillAvailable;
  const inSlot = floatTile;
  const micRef = useRef<HTMLAudioElement>(null);

  const gridExtendedSizing =
    gridCell && !fillAvailable && !inSlot && !isTile;

  const inSpotlightShell = Boolean(fillAvailable && spotlightShell);
  /** Скругление как у оболочки MeetingRoom (rounded-2xl), иначе border + overflow родителя обрезают углы */
  const mainStageRadius = inSpotlightShell
    ? 'rounded-2xl'
    : fillAvailable
      ? 'rounded-3xl'
      : null;

  useEffect(() => {
    const el = micRef.current;
    if (!el) return;
    if (audioStream && micOn) {
      el.srcObject = audioStream;
      el.play().catch(console.error);
      if (
        !isLocal &&
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
    return () => {
      if (micRef.current) micRef.current.srcObject = null;
    };
  }, [audioStream, micOn, audioSinkId, isLocal]);

  const videoTrack = videoStream?.getVideoTracks()[0];
  /** Продюсер на паузе / трек без кадров — не считаем «есть видео», показываем заглушку. */
  const videoRenderable = Boolean(
    videoTrack && videoTrack.readyState === 'live' && !videoTrack.muted,
  );
  const showVideo = Boolean(webcamOn && videoRenderable);
  const cameraConnecting = Boolean(webcamOn && !videoRenderable && !videoStream);
  const videoTrackKey =
    videoTrack?.id ?? videoStream?.id ?? 'no-video';

  const emphasis: FrameEmphasis = isPresenting
    ? 'presenting'
    : isActiveSpeaker
      ? 'speaking'
      : 'idle';

  const meetingFrameBorder =
    emphasis === 'presenting'
      ? 'border border-emerald-400/45 ring-1 ring-inset ring-emerald-400/18'
      : emphasis === 'speaking'
        ? 'border-2 border-[color:var(--color-blue-1)] ring-2 ring-inset ring-[rgba(14,120,249,0.42)]'
        : 'border border-white/[0.14] ring-1 ring-inset ring-white/[0.06]';

  /* Внешнее свечение обрезается overflow-hidden у сетки/докладчика — inset в тоне --color-blue-1 */
  const meetingFrameShadow = cn(
    emphasis === 'speaking' &&
      'shadow-[inset_0_0_72px_rgba(14,120,249,0.22),inset_0_0_0_1px_rgba(14,120,249,0.5)]',
    emphasis === 'presenting' && 'shadow-[inset_0_0_52px_rgba(16,185,129,0.15)]',
    emphasis === 'idle' &&
      (isTile
        ? floatTile
          ? undefined
          : 'shadow-lg shadow-black/35'
        : gridExtendedSizing
          ? 'shadow-[inset_0_0_0_1px_rgba(255,255,255,0.06)]'
          : fillAvailable && inSpotlightShell
            ? 'shadow-[inset_0_0_32px_rgba(0,0,0,0.25)]'
            : 'shadow-[0_12px_40px_-16px_rgba(0,0,0,0.55)]'),
  );

  return (
    <div
      className={cn(
        'relative w-full min-h-0',
        fillAvailable
          ? 'flex h-full min-h-0 flex-1 flex-col'
          : inSlot
            ? 'h-full w-full min-h-0 overflow-hidden'
            : isTile
              ? 'aspect-video min-h-0 overflow-hidden'
              : gridExtendedSizing
                ? /* заполняем ячейку CSS Grid (1fr), иначе aspect-video даёт микро-высоту и пустоту под сеткой */
                  'flex h-full min-h-0 w-full flex-col overflow-hidden'
                : 'aspect-video w-full min-h-0 overflow-hidden',
        isTile && !floatTile && 'drop-shadow-sm'
      )}
    >
      <div
        className={cn(
          'relative overflow-hidden transition-all duration-300',
          meetingFrameBorder,
          meetingFrameShadow,
          fillAvailable
            ? cn(
                'flex min-h-0 flex-1 flex-col',
                inSpotlightShell ? 'rounded-2xl' : 'rounded-3xl',
              )
            : gridExtendedSizing
              ? 'flex h-full min-h-0 w-full min-w-0 flex-1 flex-col rounded-3xl'
              : isTile
                ? 'h-full w-full min-h-0 min-w-0 rounded-2xl'
                : 'h-full w-full min-h-0 min-w-0 rounded-3xl',
        )}
      >
        <audio ref={micRef} autoPlay playsInline muted={isLocal} />

        {showVideo && videoStream ? (
          <div
            className={cn(
              'w-full overflow-hidden',
              isTile ? 'rounded-xl' : mainStageRadius ?? 'rounded-2xl',
              fillAvailable || gridExtendedSizing ? 'relative min-h-0 flex-1' : 'h-full',
              mirrored ? 'scale-x-[-1] transform' : ''
            )}
          >
            <div
              className={cn(
                'h-full w-full overflow-hidden',
                fillAvailable || gridExtendedSizing ? 'absolute inset-0' : '',
                '[&_video]:block [&_video]:h-full [&_video]:w-full [&_video]:object-cover'
              )}
            >
              <ReactPlayer
                key={videoTrackKey}
                playsinline
                pip={false}
                light={false}
                controls={false}
                muted
                playing
                url={videoStream}
                width="100%"
                height="100%"
                style={{
                  width: '100%',
                  height: '100%',
                  borderRadius: inSpotlightShell ? 14 : fillAvailable ? 24 : isTile ? 10 : 12,
                }}
                onError={console.error}
              />
            </div>
          </div>
        ) : cameraConnecting ? (
          <div
            className={cn(
              'flex min-h-[12rem] w-full flex-1 flex-col items-center justify-center gap-3 bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950 px-4 text-center',
              isTile ? 'rounded-xl' : mainStageRadius ?? 'rounded-2xl',
            )}
          >
            <div className="h-10 w-10 animate-pulse rounded-full border-2 border-white/20 border-t-blue-400" />
            <p className="text-sm text-slate-400">Камера подключается…</p>
          </div>
        ) : (
          <div
            className={cn(
              'flex w-full items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950',
              isTile ? 'rounded-xl' : mainStageRadius ?? 'rounded-2xl',
              fillAvailable ? 'min-h-[12rem] flex-1' : gridExtendedSizing ? 'min-h-0 flex-1' : 'h-full'
            )}
          >
            {isTile ? (
              <div className="flex flex-col items-center gap-2 px-2">
                {profileAvatar ? (
                  <UserAvatarDisplay
                    avatar={profileAvatar}
                    displayName={displayName || (isLocal ? 'Вы' : 'У')}
                    imageNonce={isLocal ? avatarNonce : 0}
                    className="h-14 w-14 sm:h-16 sm:w-16"
                  />
                ) : (
                  <>
                    <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/90 to-violet-600/90 text-lg font-semibold tracking-tight text-white shadow-inner sm:h-16 sm:w-16 sm:text-xl">
                      {initialsFromDisplayName(displayName || (isLocal ? 'Вы' : 'У'))}
                    </div>
                    <span className="max-w-full truncate text-center text-[11px] font-medium text-slate-300 sm:text-xs">
                      {displayName || (isLocal ? 'Вы' : 'Участник')}
                    </span>
                  </>
                )}
              </div>
            ) : profileAvatar ? (
              <UserAvatarDisplay
                avatar={profileAvatar}
                displayName={displayName || 'Пользователь'}
                imageNonce={isLocal ? avatarNonce : 0}
                className={
                  fillAvailable
                    ? 'h-36 w-36 sm:h-44 sm:w-44'
                    : gridExtendedSizing
                      ? 'h-32 w-32 sm:h-36 sm:w-36'
                      : 'h-28 w-28 sm:h-32 sm:w-32'
                }
              />
            ) : (
              <div className="flex flex-col items-center gap-3 px-4">
                <div className="flex h-28 w-28 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500/90 to-violet-600/90 text-2xl font-semibold tracking-tight text-white shadow-inner sm:h-32 sm:w-32 sm:text-3xl md:h-36 md:w-36">
                  {initialsFromDisplayName(displayName || (isLocal ? 'Вы' : 'У'))}
                </div>
                <span className="max-w-full truncate text-center text-sm text-slate-300 sm:text-base">
                  {displayName || (isLocal ? 'Вы' : 'Пользователь')}
                </span>
              </div>
            )}
          </div>
        )}

        <div
          className={cn(
            'absolute flex items-end text-white',
            !isTile &&
              (overlapBottomNav && fillAvailable
                ? /* fixed Controls: pb + высота плашки; без лишнего запаса под pt-10 обёртки — иначе подпись «висит» слишком высоко */
                  'bottom-[calc(3.75rem+max(0.75rem,env(safe-area-inset-bottom,0px)))] left-4 right-4 justify-between sm:left-5 sm:right-5'
                : fillAvailable
                  ? 'bottom-7 left-5 right-5 justify-between sm:bottom-8 sm:left-6 sm:right-6'
                  : 'bottom-4 left-4 right-4 justify-between max-md:bottom-5'),
            isTile && 'bottom-1.5 left-1.5 right-1.5 justify-between gap-1',
          )}
        >
          <div
            className={cn(
              'flex min-w-0 max-w-[calc(100%-3rem)] items-center rounded-lg border border-white/10 bg-black/35 px-1.5 py-0.5 backdrop-blur-md',
              !isTile && 'px-2 py-1',
            )}
          >
            <span className={cn('truncate', isTile ? 'text-[10px] font-medium sm:text-xs' : '')}>
              {displayName || (isLocal ? 'Вы' : 'Пользователь')}
            </span>
          </div>

          {!isLocal && (
            <div
              className={cn(
                'flex shrink-0 gap-0.5 rounded-lg border border-white/10 bg-black/35 p-0.5 backdrop-blur-md',
                !isTile && 'gap-2 p-1'
              )}
            >
              <div
                className={cn(
                  'rounded-full p-0.5',
                  !isTile && 'p-1',
                  micOn ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {micOn ? (
                  <FaMicrophone size={isTile ? 11 : 14} />
                ) : (
                  <FaMicrophoneSlash size={isTile ? 11 : 14} />
                )}
              </div>
              <div
                className={cn(
                  'rounded-full p-0.5',
                  !isTile && 'p-1',
                  webcamOn ? 'text-emerald-400' : 'text-red-400'
                )}
              >
                {webcamOn ? (
                  <BsCameraVideo size={isTile ? 11 : 14} />
                ) : (
                  <BsCameraVideoOff size={isTile ? 11 : 14} />
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ParticipantView;
