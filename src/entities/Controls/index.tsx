'use client';

import React, { useEffect, useState } from 'react';
import { BsCameraVideoFill, BsCameraVideoOffFill, BsGearFill } from 'react-icons/bs';
import { FaMicrophoneSlash, FaMicrophone } from 'react-icons/fa6';
import { FaPhoneAlt, FaDesktop, FaHeadphones } from 'react-icons/fa';
import { IoChatbubbles } from 'react-icons/io5';
import { LayoutGrid, LayoutPanelTop, Link2 } from 'lucide-react';
import { cn } from '@/shared/lib/utils';
import { HellconfDialogAccent } from '@/shared/ui/hellconf-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/shared/ui/select';
import { useRouter } from 'next/navigation';
import { useUnit } from 'effector-react';
import {
  toggleMicrophone,
  toggleCamera,
  $mediaState,
  leaveMeetingFx,
} from '@/shared/store/meetings';
import { toast } from 'sonner';
import { useMediasoupMeeting } from '@/features/mediasoup/MediasoupMeetingContext';

export type MeetingVideoLayout = 'spotlight' | 'gridExtended';

type Props = {
  isScreenSharing: boolean;
  chatOpen: boolean;
  onToggleChat: () => void;
  /** Режим отображения видео (скрыть, если переключать нечего). */
  videoLayout: MeetingVideoLayout;
  onToggleVideoLayout: () => void;
  videoLayoutToggleHidden?: boolean;
};

type Device = {
  deviceId: string;
  label: string;
  kind: string;
};

type DeviceSelectSlot = 'camera' | 'mic' | 'speaker';

/** Не нативный select — выпадающий список в стиле HellConf (Radix UI). */
function HellconfDeviceSelect({
  value,
  onSelect,
  devices,
  disabled,
  emptyText,
  fallbackPrefix,
  open,
  onOpenChange,
}: {
  value: string;
  onSelect: (deviceId: string) => void;
  devices: Device[];
  disabled?: boolean;
  emptyText: string;
  fallbackPrefix: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const list = devices
    .filter((d) => d.deviceId)
    .map((d, i) => ({
      id: d.deviceId,
      label: d.label?.trim() || `${fallbackPrefix} ${i + 1}`,
    }));

  if (list.length === 0) {
    return <p className="text-sm text-zinc-500">{emptyText}</p>;
  }

  const resolved = list.some((o) => o.id === value) ? value : list[0]!.id;

  return (
    <Select
      key={list.map((o) => o.id).join('|')}
      value={resolved}
      onValueChange={onSelect}
      disabled={disabled}
      open={open}
      onOpenChange={onOpenChange}
    >
      <SelectTrigger
        className={cn(
          'rounded-xl !h-auto min-h-[2.75rem] w-full min-w-0 max-w-full border border-white/[0.12] bg-white/[0.06] py-2.5 pl-3 pr-2 text-left text-sm font-normal text-white shadow-none',
          'focus-visible:border-sky-400/45 focus-visible:ring-2 focus-visible:ring-sky-500/25 focus-visible:ring-offset-0',
          'data-[size=default]:!h-auto disabled:cursor-not-allowed disabled:opacity-45',
          '[&_[data-slot=select-value]]:line-clamp-2 [&_[data-slot=select-value]]:min-w-0 [&_[data-slot=select-value]]:break-words [&_[data-slot=select-value]]:text-left',
          '[&_svg]:shrink-0 [&_svg]:text-zinc-500'
        )}
        size="default"
      >
        <SelectValue />
      </SelectTrigger>
      <SelectContent
        position="popper"
        sideOffset={6}
        className="z-[100] max-h-[min(40vh,320px)] w-[var(--radix-select-trigger-width)] min-w-[var(--radix-select-trigger-width)] overflow-y-auto rounded-xl border border-white/[0.12] bg-[#1a1f2e] p-1 text-white shadow-2xl ring-1 ring-white/[0.08]"
      >
        {list.map((o) => (
          <SelectItem
            key={o.id}
            value={o.id}
            className="cursor-pointer rounded-lg py-2.5 pl-2 pr-8 text-sm text-zinc-100 focus:bg-white/[0.12] focus:text-white data-[highlighted]:bg-white/[0.1] data-[state=checked]:bg-white/[0.06]"
          >
            {o.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

const Controls = ({
  isScreenSharing,
  chatOpen,
  onToggleChat,
  videoLayout,
  onToggleVideoLayout,
  videoLayoutToggleHidden = false,
}: Props) => {
  const router = useRouter();
  const {
    presenterPeerId,
    localPeerId,
    toggleMic,
    toggleWebcam,
    toggleScreenShare,
    changeMic,
    changeWebcam,
    leave: leaveMediasoup,
    localMicOn,
    localWebcamOn,
    unreadChatCount,
    initialized,
    getActiveInputDeviceIds,
    audioOutputDeviceId,
    setAudioOutputDeviceId,
    copyRoomInviteLink,
  } = useMediasoupMeeting();

  const { hasCameraPermission, hasMicrophonePermission } = useUnit($mediaState);
  const leaveMeeting = useUnit(leaveMeetingFx);
  const [showDeviceSettings, setShowDeviceSettings] = useState(false);
  const [openDeviceSelect, setOpenDeviceSelect] = useState<DeviceSelectSlot | null>(
    null,
  );
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedMic, setSelectedMic] = useState('');
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedSpeaker, setSelectedSpeaker] = useState('');
  const [isChangingDevice, setIsChangingDevice] = useState(false);

  const isSomeoneElseScreenSharing =
    presenterPeerId != null && presenterPeerId !== localPeerId;

  const getDevices = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: true,
        video: true,
      });
      stream.getTracks().forEach((track) => track.stop());

      const list = await navigator.mediaDevices.enumerateDevices();
      setDevices(list);

      const cameras = list.filter((d) => d.kind === 'videoinput');
      const mics = list.filter((d) => d.kind === 'audioinput');
      const speakers = list.filter((d) => d.kind === 'audiooutput');

      const active = getActiveInputDeviceIds();
      setSelectedCamera((prev) => {
        if (prev && cameras.some((c) => c.deviceId === prev)) return prev;
        if (active.video && cameras.some((c) => c.deviceId === active.video)) return active.video;
        return cameras[0]?.deviceId ?? '';
      });
      setSelectedMic((prev) => {
        if (prev && mics.some((m) => m.deviceId === prev)) return prev;
        if (active.audio && mics.some((m) => m.deviceId === active.audio)) return active.audio;
        return mics[0]?.deviceId ?? '';
      });
      setSelectedSpeaker((prev) => {
        if (prev && speakers.some((s) => s.deviceId === prev)) return prev;
        if (
          audioOutputDeviceId &&
          speakers.some((s) => s.deviceId === audioOutputDeviceId)
        )
          return audioOutputDeviceId;
        return speakers[0]?.deviceId ?? '';
      });
    } catch (error) {
      console.error('Error getting devices:', error);
    }
  };

  useEffect(() => {
    void getDevices();
    const handleDeviceChange = () => void getDevices();
    navigator.mediaDevices.addEventListener('devicechange', handleDeviceChange);
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handleDeviceChange);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!initialized) return;
    const active = getActiveInputDeviceIds();
    if (active.audio) setSelectedMic((p) => (p === active.audio ? p : active.audio!));
    if (active.video) setSelectedCamera((p) => (p === active.video ? p : active.video!));
  }, [initialized, getActiveInputDeviceIds]);

  useEffect(() => {
    if (!showDeviceSettings) return;
    void getDevices();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showDeviceSettings]);

  useEffect(() => {
    if (!showDeviceSettings) setOpenDeviceSelect(null);
  }, [showDeviceSettings]);

  const handleToggleCamera = async () => {
    try {
      await toggleWebcam();
      toggleCamera(!localWebcamOn);
    } catch (error) {
      console.error('Camera toggle error:', error);
    }
  };

  const handleToggleMic = async () => {
    try {
      await toggleMic();
      toggleMicrophone(!localMicOn);
    } catch (error) {
      console.error('Mic toggle error:', error);
    }
  };

  const handleToggleScreenShare = async () => {
    try {
      if (isSomeoneElseScreenSharing && !isScreenSharing) {
        toast.error('Только один участник может демонстрировать экран');
        return;
      }
      await toggleScreenShare();
    } catch (error) {
      console.error('Screen share error:', error);
      toast.error('Ошибка при демонстрации экрана');
    }
  };

  const handleLeave = async () => {
    try {
      if (localWebcamOn) await toggleWebcam();
      if (localMicOn) await toggleMic();
      await leaveMeeting();
      leaveMediasoup();
      router.push('/');
    } catch (error) {
      console.error('Leave error:', error);
      leaveMediasoup();
      router.push('/');
    }
  };

  const handleMicChange = async (deviceId: string) => {
    if (isChangingDevice) return;
    try {
      setIsChangingDevice(true);
      await changeMic(deviceId);
      setSelectedMic(deviceId);
      toast.success('Микрофон переключён');
    } catch (error) {
      console.error('Error changing microphone:', error);
      toast.error((error as Error).message || 'Не удалось сменить микрофон');
    } finally {
      setIsChangingDevice(false);
    }
  };

  const handleCameraChange = async (deviceId: string) => {
    if (isChangingDevice) return;
    try {
      setIsChangingDevice(true);
      await changeWebcam(deviceId);
      setSelectedCamera(deviceId);
      toast.success('Камера переключена');
    } catch (error) {
      console.error('Error changing camera:', error);
      toast.error((error as Error).message || 'Не удалось сменить камеру');
    } finally {
      setIsChangingDevice(false);
    }
  };

  const handleSpeakerChange = (deviceId: string) => {
    setSelectedSpeaker(deviceId);
    setAudioOutputDeviceId(deviceId);
    toast.success('Выход аудио переключён');
  };

  const cameras = devices.filter((d) => d.kind === 'videoinput');
  const mics = devices.filter((d) => d.kind === 'audioinput');
  const speakers = devices.filter((d) => d.kind === 'audiooutput');
  const isScreenShareDisabled = isSomeoneElseScreenSharing && !isScreenSharing;

  return (
    <>
      <div className="pointer-events-none fixed inset-x-0 bottom-0 z-30 flex justify-center px-2 pb-[max(0.75rem,env(safe-area-inset-bottom,0px))] pt-10 md:px-4 md:pt-12">
        <div
          className={cn(
            'pointer-events-auto relative flex max-w-[calc(100vw-0.75rem)] flex-wrap items-center justify-center gap-2 rounded-[1.65rem] border border-white/[0.13]',
            'bg-gradient-to-b from-white/[0.15] to-white/[0.05]',
            'px-2.5 py-2 shadow-[0_12px_48px_rgba(0,0,0,0.5)] backdrop-blur-2xl backdrop-saturate-150 sm:gap-2.5 sm:rounded-[1.85rem] sm:px-3 sm:py-2.5 md:gap-3'
          )}
        >
          <button
            type="button"
            className={cn(
              'flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2.5 text-white shadow-md transition-all duration-300 hover:scale-110 hover:brightness-110 sm:p-3 md:p-3.5',
              {
                'bg-green-400 hover:bg-green-600': localWebcamOn,
                'bg-red-600 hover:bg-red-700': !localWebcamOn,
                'cursor-not-allowed opacity-50 hover:scale-100': !hasCameraPermission,
              }
            )}
            onClick={() => void handleToggleCamera()}
            disabled={!hasCameraPermission || isChangingDevice}
            aria-label="Toggle camera"
          >
            {localWebcamOn ? (
              <BsCameraVideoFill className="text-lg sm:text-xl md:text-2xl" />
            ) : (
              <BsCameraVideoOffFill className="text-lg sm:text-xl md:text-2xl" />
            )}
          </button>

          <button
            type="button"
            className={cn(
              'flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2.5 text-white shadow-md transition-all duration-300 hover:scale-110 hover:brightness-110 sm:p-3 md:p-3.5',
              {
                'bg-green-400 hover:bg-green-600': localMicOn,
                'bg-red-600 hover:bg-red-700': !localMicOn,
                'cursor-not-allowed opacity-50 hover:scale-100': !hasMicrophonePermission,
              }
            )}
            onClick={() => void handleToggleMic()}
            disabled={!hasMicrophonePermission || isChangingDevice}
            aria-label="Toggle microphone"
          >
            {localMicOn ? (
              <FaMicrophone className="text-lg sm:text-xl md:text-2xl" />
            ) : (
              <FaMicrophoneSlash className="text-lg sm:text-xl md:text-2xl" />
            )}
          </button>

          <button
            type="button"
            className={cn(
              'flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2.5 text-white shadow-md transition-all duration-300 hover:scale-110 hover:brightness-110 sm:p-3 md:p-3.5',
              {
                'bg-green-400 hover:bg-green-600': isScreenSharing,
                'bg-blue-600 hover:bg-blue-700': !isScreenSharing,
                'cursor-not-allowed opacity-50 hover:scale-100': isScreenShareDisabled,
              }
            )}
            onClick={() => void handleToggleScreenShare()}
            disabled={isChangingDevice || isScreenShareDisabled}
            aria-label="Toggle screen share"
          >
            <FaDesktop className="text-lg sm:text-xl md:text-2xl" />
          </button>

          <button
            type="button"
            className={cn(
              'flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2.5 text-white shadow-md transition-all duration-300 hover:scale-110 hover:brightness-110 sm:p-3 md:p-3.5',
              'bg-sky-600 hover:bg-sky-500',
              {
                'cursor-not-allowed opacity-50 hover:scale-100': isChangingDevice,
              }
            )}
            onClick={() => copyRoomInviteLink()}
            disabled={isChangingDevice}
            title="Скопировать ссылку на эту комнату"
            aria-label="Скопировать ссылку на встречу"
          >
            <Link2 className="h-[1.1rem] w-[1.1rem] sm:h-5 sm:w-5 md:h-6 md:w-6" strokeWidth={2.25} />
          </button>

          {!videoLayoutToggleHidden ? (
            <button
              type="button"
              className={cn(
                'flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2.5 text-white shadow-md transition-all duration-300 hover:scale-110 hover:brightness-110 sm:p-3 md:p-3.5',
                videoLayout === 'gridExtended'
                  ? 'bg-violet-600 hover:bg-violet-500'
                  : 'bg-slate-600 hover:bg-slate-700'
              )}
              onClick={() => onToggleVideoLayout()}
              disabled={isChangingDevice}
              aria-pressed={videoLayout === 'gridExtended'}
              aria-label={
                videoLayout === 'spotlight'
                  ? 'Расширенная сетка'
                  : 'Режим докладчика'
              }
              title={
                videoLayout === 'spotlight'
                  ? 'Расширенный: сетка'
                  : 'Докладчик: крупный кадр и лента'
              }
            >
              {videoLayout === 'spotlight' ? (
                <LayoutGrid className="h-[1.1rem] w-[1.1rem] sm:h-5 sm:w-5 md:h-6 md:w-6" strokeWidth={2.25} />
              ) : (
                <LayoutPanelTop className="h-[1.1rem] w-[1.1rem] sm:h-5 sm:w-5 md:h-6 md:w-6" strokeWidth={2.25} />
              )}
            </button>
          ) : null}

          <button
            type="button"
            className={cn(
              'relative flex shrink-0 cursor-pointer items-center justify-center rounded-full p-2.5 text-white shadow-md transition-all duration-300 hover:scale-110 hover:brightness-110 sm:p-3 md:p-3.5',
              chatOpen ? 'bg-amber-500 hover:bg-amber-600' : 'bg-slate-600 hover:bg-slate-700'
            )}
            onClick={onToggleChat}
            disabled={isChangingDevice}
            aria-label={
              chatOpen
                ? 'Скрыть чат'
                : unreadChatCount > 0
                  ? `Открыть чат, непрочитанных: ${unreadChatCount}`
                  : 'Открыть чат'
            }
            aria-pressed={chatOpen}
          >
            <IoChatbubbles className="text-lg sm:text-xl md:text-2xl" />
            {!chatOpen && unreadChatCount > 0 ? (
              <span className="absolute -right-0.5 -top-0.5 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold leading-none text-white shadow ring-2 ring-white/25">
                {unreadChatCount > 99 ? '99+' : unreadChatCount}
              </span>
            ) : null}
          </button>

          <button
            type="button"
            className={cn(
              'flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-slate-600 p-2.5 text-white shadow-md transition-all duration-300 hover:scale-110 hover:bg-slate-700 hover:brightness-110 sm:p-3 md:p-3.5',
              {
                'cursor-not-allowed opacity-50 hover:scale-100': isChangingDevice,
              }
            )}
            onClick={() => setShowDeviceSettings(!showDeviceSettings)}
            disabled={isChangingDevice}
            aria-label="Device settings"
          >
            <BsGearFill className="text-lg sm:text-xl md:text-2xl" />
          </button>

          <button
            type="button"
            className={cn(
              'flex shrink-0 cursor-pointer items-center justify-center rounded-full bg-red-600 p-2.5 text-white shadow-md transition-all duration-300 hover:scale-110 hover:bg-red-700 hover:brightness-110 sm:p-3 md:p-3.5',
              {
                'cursor-not-allowed opacity-50 hover:scale-100': isChangingDevice,
              }
            )}
            onClick={() => void handleLeave()}
            disabled={isChangingDevice}
            aria-label="Leave meeting"
          >
            <FaPhoneAlt className="text-lg sm:text-xl md:text-2xl" />
          </button>

          {showDeviceSettings && (
            <div
              className={cn(
                'absolute bottom-full left-1/2 z-50 mb-3 w-[min(100vw-1rem,420px)] max-w-[calc(100vw-1rem)] -translate-x-1/2 overflow-hidden rounded-3xl border border-white/[0.09]',
                'bg-gradient-to-b from-[#1e2438] to-[#141722] text-white shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/[0.06]'
              )}
              role="dialog"
              aria-label="Настройки устройств"
            >
              <HellconfDialogAccent />
              <div className="relative px-4 pb-4 pt-9">
                <h2 className="mb-4 flex items-center justify-center gap-2 text-center text-base font-semibold tracking-tight text-white sm:text-lg">
                  <BsGearFill className="size-5 shrink-0 text-sky-400" aria-hidden />
                  Настройки устройств
                </h2>

                <div className="max-h-[min(55vh,400px)] min-w-0 space-y-4 overflow-y-auto overflow-x-hidden overscroll-contain pr-0.5">
                  <div className="min-w-0">
                    <h3 className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 sm:text-xs">
                      <BsCameraVideoFill className="size-4 shrink-0 text-sky-400" aria-hidden />
                      Камера
                    </h3>
                    <HellconfDeviceSelect
                      value={selectedCamera}
                      onSelect={(id) => void handleCameraChange(id)}
                      devices={cameras}
                      disabled={!hasCameraPermission || isChangingDevice}
                      emptyText="Нет доступных камер"
                      fallbackPrefix="Камера"
                      open={openDeviceSelect === 'camera'}
                      onOpenChange={(next) =>
                        setOpenDeviceSelect(next ? 'camera' : null)
                      }
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 sm:text-xs">
                      <FaMicrophone className="size-4 shrink-0 text-sky-400" aria-hidden />
                      Микрофон
                    </h3>
                    <HellconfDeviceSelect
                      value={selectedMic}
                      onSelect={(id) => void handleMicChange(id)}
                      devices={mics}
                      disabled={!hasMicrophonePermission || isChangingDevice}
                      emptyText="Нет доступных микрофонов"
                      fallbackPrefix="Микрофон"
                      open={openDeviceSelect === 'mic'}
                      onOpenChange={(next) => setOpenDeviceSelect(next ? 'mic' : null)}
                    />
                  </div>

                  <div className="min-w-0">
                    <h3 className="mb-1.5 flex items-center gap-2 text-[11px] font-medium uppercase tracking-wide text-zinc-400 sm:text-xs">
                      <FaHeadphones className="size-4 shrink-0 text-sky-400" aria-hidden />
                      Наушники / колонки
                    </h3>
                    <HellconfDeviceSelect
                      value={selectedSpeaker}
                      onSelect={handleSpeakerChange}
                      devices={speakers}
                      disabled={isChangingDevice}
                      emptyText="Нет доступных выходов (в браузере недоступно перечисление)"
                      fallbackPrefix="Выход"
                      open={openDeviceSelect === 'speaker'}
                      onOpenChange={(next) =>
                        setOpenDeviceSelect(next ? 'speaker' : null)
                      }
                    />
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setShowDeviceSettings(false)}
                  className="mt-5 w-full rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 py-2.5 text-sm font-medium text-white shadow-lg shadow-black/25 transition hover:brightness-110 disabled:opacity-50"
                  disabled={isChangingDevice}
                >
                  {isChangingDevice ? 'Применяем…' : 'Готово'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Controls;
