'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { IoClose } from 'react-icons/io5';
import ParticipantView from '@/entities/ParticipantView';
import ScreenShareView from '@/entities/ScreenShareView';
import RoomChat from '@/entities/RoomChat';
import Controls, { type MeetingVideoLayout } from '@/entities/Controls';
import { toast } from 'sonner';
import { useMediasoupMeeting } from '@/features/mediasoup/MediasoupMeetingContext';
import { cn } from '@/shared/lib/utils';
import { Button } from '@/shared/ui/button';
import {
  Dialog,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/shared/ui/dialog';
import { HellconfDialogActions, HellconfDialogContent } from '@/shared/ui/hellconf-dialog';
import { Clock } from 'lucide-react';
import { MeetingHeader } from '@/widgets/MeetingRoom/MeetingHeader';
import { ExtendedModeGrid } from '@/widgets/MeetingRoom/ExtendedModeGrid';

const SESSION_END_SOON_MS = 5 * 60 * 1000;
/** Последняя минута — таймер в баннере подсвечивается красным */
const SESSION_END_CRITICAL_MS = 60 * 1000;

function formatSessionCountdown(remainingMs: number) {
  const totalSec = Math.max(0, Math.floor(remainingMs / 1000));
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function MeetingScheduledLobby({ untilMs }: { untilMs: number }) {
  const router = useRouter();
  const [, setTick] = useState(0);

  useEffect(() => {
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, []);

  const leftMs = Math.max(0, untilMs - Date.now());
  const totalSec = Math.ceil(leftMs / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  const startLabel = new Date(untilMs).toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-6 px-6 py-10 text-center">
      <div className="max-w-md space-y-3">
        <h2 className="text-2xl font-semibold tracking-tight text-white">Встреча ещё не началась</h2>
        <p className="text-sm leading-relaxed text-zinc-400">
          Камера и микрофон включатся автоматически в запланированное время. Сейчас вы в комнате ожидания —
          без трансляции видео и звука.
        </p>
        <p className="text-xs text-zinc-500">Старт по расписанию: {startLabel}</p>
      </div>
      <div
        className="rounded-2xl border border-white/10 bg-white/[0.06] px-8 py-5 font-mono text-3xl font-semibold tabular-nums text-white"
        aria-live="polite"
      >
        {m > 0 ? `${m} мин ` : ''}
        {s} сек
      </div>
      <Button
        type="button"
        variant="outline"
        className="rounded-xl border-white/15 bg-transparent text-white hover:bg-white/10"
        onClick={() => router.push('/')}
      >
        На главную
      </Button>
    </div>
  );
}

type MeetingRoomProps = {
  sessionEndsAtMs: number;
  sessionStartMs: number;
  meetingTitle?: string;
};

const MeetingRoom = ({
  sessionEndsAtMs,
  sessionStartMs,
  meetingTitle = 'Встреча',
}: MeetingRoomProps) => {
  const router = useRouter();
  const {
    initialized,
    joinError,
    waitingScheduledLobby,
    scheduledJoinAtMs,
    peersById,
    orderedPeerIds,
    presenterPeerId,
    localPeerId,
    activeSpeakerId,
    speakingPeerId,
    sendChat,
    chatMessages,
    audioOutputDeviceId,
    markChatRead,
  } = useMediasoupMeeting();

  const [chatOpen, setChatOpen] = useState(false);
  const [videoLayout, setVideoLayout] = useState<MeetingVideoLayout>('spotlight');

  useEffect(() => {
    if (!chatOpen) return;
    markChatRead();
  }, [chatOpen, chatMessages, markChatRead]);

  useEffect(() => {
    if (joinError) {
      toast.error(joinError);
    }
  }, [joinError]);

  const prevPresenter = React.useRef<string | null>(null);
  useEffect(() => {
    if (presenterPeerId && presenterPeerId !== prevPresenter.current) {
      toast.success('Включена демонстрация экрана');
    }
    if (!presenterPeerId && prevPresenter.current) {
      toast.info('Демонстрация экрана остановлена');
    }
    prevPresenter.current = presenterPeerId;
  }, [presenterPeerId]);

  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const remainingMs = Math.max(0, sessionEndsAtMs - now);
  const timerSoon = remainingMs > 0 && remainingMs <= SESSION_END_SOON_MS;
  const timerCritical = remainingMs > 0 && remainingMs <= SESSION_END_CRITICAL_MS;

  const [endingDialogDismissed, setEndingDialogDismissed] = useState(false);
  useEffect(() => {
    if (remainingMs > SESSION_END_SOON_MS) setEndingDialogDismissed(false);
  }, [remainingMs]);

  const showEndingWarningDialog =
    remainingMs > 0 && remainingMs <= SESSION_END_SOON_MS && !endingDialogDismissed;

  /** Без отдельного useState: иначе на первом кадре null → otherParticipants считались неверно; в Safari заметнее. */
  const mainId = useMemo(() => {
    if (presenterPeerId) return presenterPeerId;
    if (activeSpeakerId && peersById[activeSpeakerId]) return activeSpeakerId;
    return localPeerId;
  }, [presenterPeerId, activeSpeakerId, peersById, localPeerId]);

  // При шаринге: в ленте не показываем демонстрирующего (центр уже занят экраном — иначе дубль с вебкой).
  const otherParticipants = orderedPeerIds.filter((id) =>
    presenterPeerId ? id !== presenterPeerId : id !== mainId
  );

  const soloConference = !presenterPeerId && otherParticipants.length === 0;

  const isGridLayout = videoLayout === 'gridExtended' && !soloConference;

  const showSpotlightStrip =
    videoLayout === 'spotlight' && otherParticipants.length > 0;

  const showLayoutMenu = orderedPeerIds.length >= 2;

  if (joinError) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-4 text-center text-white">
        <p>Не удалось подключиться: {joinError}</p>
        <Button
          type="button"
          variant="outline"
          className="rounded-xl border-white/15 text-white hover:bg-white/10"
          onClick={() => router.push('/')}
        >
          На главную
        </Button>
      </div>
    );
  }

  if (waitingScheduledLobby && scheduledJoinAtMs != null) {
    return <MeetingScheduledLobby untilMs={scheduledJoinAtMs} />;
  }

  if (remainingMs <= 0) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-4 px-6 py-12 text-center">
        <h2 className="text-2xl font-semibold tracking-tight text-white">Встреча завершена</h2>
        <p className="max-w-md text-sm leading-relaxed text-zinc-400">
          Отведённое на сессию время истекло. Вы можете вернуться на главную.
        </p>
        <Button
          type="button"
          className="mt-2 h-12 rounded-2xl border-0 bg-blue-1 px-8 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110"
          onClick={() => router.push('/')}
        >
          На главную
        </Button>
      </div>
    );
  }

  if (!initialized) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center gap-3 text-zinc-400">
        <p className="text-sm">Подключение к комнате…</p>
      </div>
    );
  }

  const mainPeer = peersById[mainId] ?? null;

  const renderStripTile = (participantId: string) => {
    const peer = peersById[participantId];
    if (!peer) return null;
    return (
      <div
        key={participantId}
        className="meeting-webcam-slot meeting-webcam-slot--sidebar max-md:snap-start w-full max-w-full shrink-0"
      >
        <div className="meeting-webcam-fill">
          <ParticipantView
            displayName={peer.displayName}
            videoStream={peer.videoStream}
            audioStream={peer.audioStream}
            isActiveSpeaker={speakingPeerId === participantId}
            isPresenting={presenterPeerId === participantId}
            micOn={peer.micOn}
            webcamOn={peer.webcamOn}
            isLocal={participantId === localPeerId}
            audioSinkId={audioOutputDeviceId || undefined}
            profileAvatar={peer.profileAvatar}
            variant="tile"
            floatTile
          />
        </div>
      </div>
    );
  };

  const mainStage = (
    <div className="flex h-full min-h-0 w-full max-w-full flex-1 flex-col items-stretch">
      {presenterPeerId ? (
        <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
          <ScreenShareView
            stream={peersById[presenterPeerId]?.screenStream ?? null}
            displayName={peersById[presenterPeerId]?.displayName}
            isLocal={presenterPeerId === localPeerId}
            audioSinkId={audioOutputDeviceId || undefined}
            fillAvailable
            overlapBottomNav={soloConference}
            spotlightShell={showSpotlightStrip}
          />
        </div>
      ) : (
        mainPeer && (
          <div className="flex h-full min-h-0 w-full max-w-full flex-1 flex-col [&>*]:min-h-0 [&>*]:flex-1">
            <ParticipantView
              displayName={mainPeer.displayName}
              videoStream={mainPeer.videoStream}
              audioStream={mainPeer.audioStream}
              isActiveSpeaker={speakingPeerId === mainId}
              isPresenting={presenterPeerId === mainId}
              micOn={mainPeer.micOn}
              webcamOn={mainPeer.webcamOn}
              isLocal={mainId === localPeerId}
              audioSinkId={audioOutputDeviceId || undefined}
              profileAvatar={mainPeer.profileAvatar}
              fillAvailable
              overlapBottomNav={soloConference}
              spotlightShell={showSpotlightStrip}
            />
          </div>
        )
      )}
    </div>
  );

  return (
    <div
      className={cn(
        'relative flex h-full min-h-0 w-full flex-1 flex-col gap-0 px-0 pt-0',
        /* один участник: кадр на всю высоту, нижний бар поверх видео (без отступа снизу) */
        soloConference
          ? 'pb-0'
          : [
              'pb-[calc(6.5rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(6.75rem+env(safe-area-inset-bottom,0px))]',
              isGridLayout &&
                'pb-[calc(9.25rem+env(safe-area-inset-bottom,0px))] md:pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))]',
            ],
      )}
    >
      <MeetingHeader
        title={meetingTitle}
        participantCount={orderedPeerIds.length}
        sessionStartMs={sessionStartMs}
        now={now}
        remainingMs={remainingMs}
        timerSoon={timerSoon}
        timerCritical={timerCritical}
        videoLayout={videoLayout}
        onVideoLayout={setVideoLayout}
        showLayoutMenu={showLayoutMenu}
        layoutLockedByScreenShare={false}
      />

      <Dialog
        open={showEndingWarningDialog}
        onOpenChange={(open) => {
          if (!open) setEndingDialogDismissed(true);
        }}
      >
        <HellconfDialogContent maxWidthClass="max-w-md">
          <DialogHeader className="gap-0 space-y-5 text-left">
            <div className="flex gap-4">
              <div
                className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl border border-amber-400/35 bg-gradient-to-br from-amber-500/25 to-amber-600/5 shadow-inner"
                aria-hidden
              >
                <Clock className="size-7 text-amber-200/90" strokeWidth={1.75} />
              </div>
              <div className="min-w-0 flex-1 space-y-1 pt-0.5">
                <DialogTitle className="text-xl font-bold tracking-tight text-white sm:text-2xl">
                  Встреча скоро закончится
                </DialogTitle>
                <p className="text-xs font-medium uppercase tracking-wider text-zinc-500">
                  Осталось мало времени
                </p>
              </div>
            </div>
            <DialogDescription className="text-left text-sm leading-relaxed text-zinc-400">
              До автоматического завершения осталось{' '}
              <span className="font-mono font-semibold tabular-nums text-amber-200">
                {formatSessionCountdown(remainingMs)}
              </span>
              . Вы можете завершить звонок сами или дождаться конца сессии.
            </DialogDescription>
          </DialogHeader>
          <HellconfDialogActions>
            <Button
              type="button"
              className="h-12 w-full rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-md hover:brightness-110"
              onClick={() => setEndingDialogDismissed(true)}
            >
              Понятно
            </Button>
          </HellconfDialogActions>
        </HellconfDialogContent>
      </Dialog>
      <div
        className={cn(
          'flex min-h-0 min-w-0 flex-1 flex-col',
          isGridLayout
            ? 'h-full min-h-0 overflow-hidden'
            : showSpotlightStrip
              ? 'overflow-hidden'
              : 'overflow-visible',
        )}
      >
        {isGridLayout ? (
          <ExtendedModeGrid
            peerIds={orderedPeerIds}
            renderTile={(participantId) => {
              const peer = peersById[participantId];
              if (!peer) return null;
              if (presenterPeerId === participantId && peer.screenStream) {
                return (
                  <div className="flex h-full min-h-0 w-full flex-col">
                    <ScreenShareView
                      stream={peer.screenStream}
                      displayName={peer.displayName}
                      isLocal={participantId === localPeerId}
                      audioSinkId={audioOutputDeviceId || undefined}
                      fillAvailable
                      overlapBottomNav={false}
                      spotlightShell={false}
                    />
                  </div>
                );
              }
              return (
                <ParticipantView
                  displayName={peer.displayName}
                  videoStream={peer.videoStream}
                  audioStream={peer.audioStream}
                  isActiveSpeaker={speakingPeerId === participantId}
                  isPresenting={presenterPeerId === participantId}
                  micOn={peer.micOn}
                  webcamOn={peer.webcamOn}
                  isLocal={participantId === localPeerId}
                  audioSinkId={audioOutputDeviceId || undefined}
                  profileAvatar={peer.profileAvatar}
                  gridCell
                />
              );
            }}
          />
        ) : showSpotlightStrip ? (
          <div
            className={cn(
              'flex min-h-0 flex-1 gap-2 overflow-hidden p-1 sm:p-2',
              /* Телефон (портрет): как реф. — большой кадр сверху, остальные столбиком снизу.
                 md+: основной слева, колонка превью справа */
              'flex-col md:flex-row md:gap-4',
            )}
          >
            <div
              className={cn(
                'flex min-h-0 min-w-0 flex-col overflow-hidden rounded-2xl p-[2px] sm:p-[3px]',
                'min-h-[46svh] flex-1 md:min-h-0',
              )}
            >
              {mainStage}
            </div>
            <aside
              className={cn(
                'meeting-sidebar-scroll-x flex shrink-0 rounded-2xl border border-white/[0.08] bg-gradient-to-b from-white/[0.06] to-transparent p-2 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] sm:p-3',
                /* телефон: горизонтальная лента превью */
                'max-md:snap-x max-md:snap-mandatory max-md:flex-row max-md:flex-nowrap max-md:gap-3 max-md:overflow-x-auto max-md:overflow-y-hidden max-md:overscroll-x-contain max-md:pb-1 max-md:[-webkit-overflow-scrolling:touch]',
                'max-md:max-h-none max-md:w-full',
                /* десктоп: колонка со скроллом по вертикали */
                'md:h-full md:w-[min(30%,380px)] md:min-w-[220px] md:max-w-[400px]',
                'md:max-h-none md:flex-col md:gap-3 md:overflow-y-auto md:overflow-x-hidden md:overscroll-y-contain',
              )}
              aria-label="Остальные участники"
            >
              {otherParticipants.map((id) => renderStripTile(id))}
            </aside>
          </div>
        ) : (
          <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
            <div
              className={cn(
                'flex min-h-0 min-w-0 flex-1 flex-col items-stretch overflow-hidden',
                soloConference ? '' : 'min-h-[36vh] md:min-h-0',
              )}
            >
              {mainStage}
            </div>
          </div>
        )}
      </div>

      {/* Чат — единый всплывающий слой (модалка на десктопе, шторка на телефоне) */}
      {chatOpen ? (
        <div
          className="fixed inset-0 z-40 flex flex-col justify-end sm:justify-center sm:p-4"
          role="presentation"
        >
          <button
            type="button"
            className="absolute inset-0 !cursor-pointer bg-slate-950/75 backdrop-blur-[2px] transition-opacity"
            aria-label="Закрыть чат"
            onClick={() => setChatOpen(false)}
          />
          <div
            className="relative z-50 mx-auto flex h-[min(560px,82dvh)] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl border border-white/10 bg-slate-900 shadow-[0_-8px_40px_rgba(0,0,0,0.45)] ring-1 ring-white/5 sm:h-[560px] sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl sm:shadow-2xl"
            role="dialog"
            aria-modal="true"
            aria-labelledby="meeting-chat-title"
          >
            <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 bg-gradient-to-r from-slate-900 to-slate-800 px-4 py-3">
              <div>
                <h2 id="meeting-chat-title" className="text-base font-semibold tracking-tight text-white">
                  Чат встречи
                </h2>
                <p className="text-xs text-slate-400">Сообщения видят все участники</p>
              </div>
              <button
                type="button"
                onClick={() => setChatOpen(false)}
                className="flex h-10 w-10 shrink-0 !cursor-pointer items-center justify-center rounded-xl text-slate-300 transition hover:bg-white/10 hover:text-white"
                aria-label="Закрыть"
              >
                <IoClose className="text-2xl" />
              </button>
            </div>
            <div className="flex min-h-0 flex-1 flex-col bg-slate-950/40">
              <RoomChat messages={chatMessages} onSend={sendChat} embedded />
            </div>
          </div>
        </div>
      ) : null}

      <Controls
        isScreenSharing={presenterPeerId === localPeerId}
        chatOpen={chatOpen}
        onToggleChat={() => setChatOpen((v) => !v)}
        videoLayout={videoLayout}
        onToggleVideoLayout={() =>
          setVideoLayout((v) => (v === 'spotlight' ? 'gridExtended' : 'spotlight'))
        }
        videoLayoutToggleHidden
      />
    </div>
  );
};

export default MeetingRoom;
