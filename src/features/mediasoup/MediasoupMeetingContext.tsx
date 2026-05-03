'use client';

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useUnit } from 'effector-react';
import { toast } from 'sonner';
import * as mediasoupClient from 'mediasoup-client';
import type { types } from 'mediasoup-client';
import { AxiosError } from 'axios';
import { api } from '@/shared/lib/api';
import { formatMeetingJoinError } from '@/shared/lib/meetingJoinErrors';
import { ensureMediaDevices } from '@/shared/lib/media/ensureMediaDevices';
import { $avatarImageNonce } from '@/shared/store/auth';

export type ChatMessage = {
  id: string;
  peerId: string;
  displayName: string;
  text: string;
  ts: number;
  isSelf: boolean;
};

export type PeerMedia = {
  peerId: string;
  displayName: string;
  /** Значение как в профиле (`preset:` или `avatars/…`) — для плейсхолдера при выкл. камере. */
  profileAvatar?: string;
  videoStream: MediaStream | null;
  screenStream: MediaStream | null;
  audioStream: MediaStream | null;
  micOn: boolean;
  webcamOn: boolean;
};

type MediasoupMeetingContextValue = {
  initialized: boolean;
  joinError: string | null;
  /** Ожидание запланированного старта (`?p=` или legacy `?start=`) — WebRTC и камера ещё не запущены. */
  waitingScheduledLobby: boolean;
  /** Метка времени начала встречи из ссылки (для обратного отсчёта в лобби). */
  scheduledJoinAtMs: number | null;
  localPeerId: string;
  peersById: Record<string, PeerMedia>;
  orderedPeerIds: string[];
  presenterPeerId: string | null;
  /** Кого держим в центре в «Докладчик» (последний спикер, пока не заговорит другой). */
  activeSpeakerId: string | null;
  /** Кто реально говорит сейчас (RMS > порога) — обводка и индикатор волны. */
  speakingPeerId: string | null;
  localMicOn: boolean;
  localWebcamOn: boolean;
  isScreenSharing: boolean;
  chatMessages: ChatMessage[];
  /** Сообщения от других после последнего «прочитано» (чат закрыт). */
  unreadChatCount: number;
  /** Пометить чат прочитанным (при открытии панели и при новых сообщениях, пока открыт). */
  markChatRead: () => void;
  leave: () => void;
  toggleMic: () => Promise<void>;
  toggleWebcam: () => Promise<void>;
  toggleScreenShare: () => Promise<void>;
  changeMic: (deviceId: string) => Promise<void>;
  changeWebcam: (deviceId: string) => Promise<void>;
  sendChat: (text: string) => Promise<void>;
  /** Активные deviceId с текущего getUserMedia-потока (для синхронизации селектов). */
  getActiveInputDeviceIds: () => { audio?: string; video?: string };
  /** sinkId для удалённого аудио (HTMLMediaElement.setSinkId). */
  audioOutputDeviceId: string;
  setAudioOutputDeviceId: (deviceId: string) => void;
  /** Копирует текущий URL комнаты (полная ссылка в адресной строке). */
  copyRoomInviteLink: () => void;
};

const MediasoupMeetingContext =
  createContext<MediasoupMeetingContextValue | null>(null);

type WsRequest = {
  type: 'request';
  id: number;
  method: string;
  data?: Record<string, unknown>;
};

type WsResponse = {
  id: number;
  result?: unknown;
  error?: { message: string };
};

type WsNotification = {
  type: 'notification';
  event: string;
  data: Record<string, unknown>;
};

type ApiChatRow = {
  id: string;
  peerId: string;
  displayName: string;
  text: string;
  ts: number;
  userId: number;
};

function mapApiChatRow(
  row: ApiChatRow,
  selfUserId?: string | number | null,
  selfGuestPeerId?: string | null
): ChatMessage {
  let isSelf = false;
  if (selfUserId !== undefined && selfUserId !== null && String(selfUserId).trim() !== '') {
    isSelf = String(row.userId) === String(selfUserId);
  } else if (selfGuestPeerId && row.peerId === selfGuestPeerId) {
    isSelf = true;
  }
  return {
    id: row.id,
    peerId: row.peerId,
    displayName: row.displayName,
    text: row.text,
    ts: row.ts,
    isSelf,
  };
}

function buildWsUrl(roomId: string, peerId: string) {
  const raw = (
    process.env.NEXT_PUBLIC_SIGNALING_URL || 'ws://127.0.0.1:4443'
  ).replace(/\/$/, '');
  if (raw.endsWith('/ws')) {
    return `${raw}?roomId=${encodeURIComponent(roomId)}&peerId=${encodeURIComponent(peerId)}`;
  }
  return `${raw}/ws?roomId=${encodeURIComponent(roomId)}&peerId=${encodeURIComponent(peerId)}`;
}

/**
 * Захват вебки: 1080p по ideal при поддерживаемой камерой — меньше апскейла в UI и артефактов VP8.
 * При слабом железе браузер сам опустится до 720p.
 */
const WEBCAM_CAPTURE = {
  width: { ideal: 1920, max: 1920 },
  height: { ideal: 1080, max: 1080 },
  aspectRatio: { ideal: 16 / 9 },
  frameRate: { ideal: 30, max: 60 },
  /** Chromium: не масштабировать кадр лишний раз на входе конвейера */
  resizeMode: 'none',
} as MediaTrackConstraints;

function webcamVideoConstraints(deviceId?: string): MediaTrackConstraints {
  if (deviceId) {
    return { ...WEBCAM_CAPTURE, deviceId: { ideal: deviceId } };
  }
  return { ...WEBCAM_CAPTURE };
}

/** Исходящий VP8-слой вебки: выше битрейт — меньше «зернистости» от агрессивного сжатия при 720p/1080p. */
const WEBCAM_SEND_ENCODING: types.RtpEncodingParameters = {
  maxBitrate: 4_200_000,
  maxFramerate: 30,
};

type Props = {
  roomId: string;
  displayName: string;
  /** ID пользователя из сессии — для isSelf и загрузки чата с API */
  userId?: string | number;
  /** Аватар из ЛК (как `user.avatar`) — уходит в join и в плейсхолдер при выкл. вебке. */
  profileAvatar?: string;
  /**
   * Если в URL есть запланированный старт (`?p=` base64 или legacy `?start=<unix ms>`) в будущем —
   * подключение к комнате и getUserMedia откладываются до этого момента (лобби без камеры).
   */
  deferJoinUntilMs?: number;
  children: React.ReactNode;
};

export function MediasoupMeetingProvider({
  roomId,
  displayName,
  userId,
  profileAvatar,
  deferJoinUntilMs,
  children,
}: Props) {
  const avatarImageNonce = useUnit($avatarImageNonce);
  const userIdRef = useRef(userId);
  userIdRef.current = userId;
  const profileAvatarRef = useRef(profileAvatar);
  profileAvatarRef.current = profileAvatar;

  /** Стабильный peerId: авторизованный → user-<id>; гость → один id на комнату в localStorage (вторая вкладка заменяет первую на сервере). */
  const [localPeerId, setLocalPeerId] = useState<string | null>(null);
  const localPeerIdRef = useRef<string | null>(null);
  localPeerIdRef.current = localPeerId;

  useEffect(() => {
    if (userId !== undefined && userId !== null && String(userId).trim() !== '') {
      setLocalPeerId(`user-${String(userId)}`);
      return;
    }
    const key = `hellconf-anon-peer-${roomId}`;
    try {
      let id = window.localStorage.getItem(key);
      if (!id) {
        id = crypto.randomUUID();
        window.localStorage.setItem(key, id);
      }
      setLocalPeerId(id);
    } catch {
      setLocalPeerId(crypto.randomUUID());
    }
  }, [roomId, userId]);
  const [initialized, setInitialized] = useState(false);
  const [joinError, setJoinError] = useState<string | null>(null);
  const [waitingScheduledLobby, setWaitingScheduledLobby] = useState(false);
  const [scheduledJoinAtMs, setScheduledJoinAtMs] = useState<number | null>(null);
  const [peersById, setPeersById] = useState<Record<string, PeerMedia>>({});
  const [presenterPeerId, setPresenterPeerId] = useState<string | null>(null);
  /** Определяется по уровню аудио (Web Audio API) — подсветка рамкой и «главный» кадр в режиме докладчика. */
  const [activeSpeakerId, setActiveSpeakerId] = useState<string | null>(null);
  const [speakingPeerId, setSpeakingPeerId] = useState<string | null>(null);
  const [localMicOn, setLocalMicOn] = useState(true);
  const [localWebcamOn, setLocalWebcamOn] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  /** ID последнего прочитанного сообщения (с сервера, таблица room_chat_reads). */
  const [lastReadMessageId, setLastReadMessageId] = useState(0);
  const [audioOutputDeviceId, setAudioOutputDeviceId] = useState('');

  const activeSpeakerCtxRef = useRef<AudioContext | null>(null);
  const activeSpeakerChainsRef = useRef<
    Map<
      string,
      {
        source: MediaStreamAudioSourceNode;
        analyser: AnalyserNode;
        streamId: string;
      }
    >
  >(new Map());
  const activeSpeakerLastIdRef = useRef<string | null>(null);
  const activeSpeakerRmsBufRef = useRef<Float32Array>(new Float32Array(512));
  const activeSpeakerLastChangeAtMsRef = useRef(0);
  const speakingPeerLastRef = useRef<string | null>(null);

  const copyRoomInviteLink = useCallback(() => {
    if (typeof window === 'undefined') return;
    void navigator.clipboard.writeText(window.location.href);
    toast.success('Ссылка скопирована');
  }, []);

  useEffect(() => {
    let cancelled = false;

    const hasAccount =
      userId !== undefined && userId !== null && String(userId).trim() !== '';
    if (!hasAccount && !localPeerId) {
      return;
    }

    (async () => {
      try {
        const { data } = await api.get<{
          messages: ApiChatRow[];
          lastReadMessageId?: string;
        }>(`/rooms/${encodeURIComponent(roomId)}/chat`);
        if (cancelled) return;
        const rows = data.messages || [];
        setChatMessages(
          rows.map((r) =>
            mapApiChatRow(
              r,
              hasAccount ? userIdRef.current : null,
              hasAccount ? null : localPeerId
            )
          )
        );
        const lr = Number(data.lastReadMessageId);
        setLastReadMessageId(Number.isFinite(lr) && lr > 0 ? lr : 0);
      } catch (e) {
        if (!cancelled) {
          setChatMessages([]);
          setLastReadMessageId(0);
          const status = (e as AxiosError)?.response?.status;
          if (status !== 401 && status !== 403) {
            toast.error('Не удалось загрузить историю чата');
          }
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [roomId, userId, localPeerId]);

  useEffect(() => {
    setChatMessages((prev) =>
      prev.map((m) => ({
        ...m,
        isSelf:
          (userId !== undefined &&
            userId !== null &&
            userId !== '' &&
            m.peerId === `user-${String(userId)}`) ||
          (localPeerId != null && localPeerId !== '' && m.peerId === localPeerId),
      }))
    );
  }, [userId, localPeerId]);

  const markChatRead = useCallback(() => {
    const ids = chatMessages
      .map((m) => Number(m.id))
      .filter((n) => Number.isFinite(n) && n > 0);
    if (ids.length === 0) return;
    const maxId = Math.max(...ids);
    void (async () => {
      try {
        const { data } = await api.put<{ lastReadMessageId: string }>(
          `/rooms/${encodeURIComponent(roomId)}/chat/read`,
          { lastReadMessageId: maxId }
        );
        const v = Number(data.lastReadMessageId);
        setLastReadMessageId(Number.isFinite(v) ? v : maxId);
      } catch {
        setLastReadMessageId((prev) => (maxId > prev ? maxId : prev));
      }
    })();
  }, [roomId, chatMessages]);

  const unreadChatCount = useMemo(
    () =>
      chatMessages.filter((m) => {
        if (m.isSelf) return false;
        const mid = Number(m.id);
        return Number.isFinite(mid) && mid > lastReadMessageId;
      }).length,
    [chatMessages, lastReadMessageId]
  );

  const wsRef = useRef<WebSocket | null>(null);
  const nextReqId = useRef(1);
  const pending = useRef(
    new Map<number, { resolve: (v: unknown) => void; reject: (e: Error) => void }>()
  );

  const deviceRef = useRef<types.Device | null>(null);
  const sendTransportRef = useRef<types.Transport | null>(null);
  const recvTransportRef = useRef<types.Transport | null>(null);
  const recvBootstrappedRef = useRef<Promise<types.Transport> | null>(null);

  const localAudioProducerRef = useRef<types.Producer | null>(null);
  const localVideoProducerRef = useRef<types.Producer | null>(null);
  const localScreenProducerRef = useRef<types.Producer | null>(null);
  const localStreamRef = useRef<MediaStream | null>(null);
  const screenStreamRef = useRef<MediaStream | null>(null);

  const consumersRef = useRef(
    new Map<
      string,
      { consumer: types.Consumer; peerId: string; isScreen: boolean }
    >()
  );

  const mergePeer = useCallback(
    (
      pid: string,
      patch: Partial<PeerMedia> & { displayName?: string }
    ) => {
      setPeersById((prev) => {
        const cur = prev[pid] || {
          peerId: pid,
          displayName: patch.displayName || 'Участник',
          profileAvatar: patch.profileAvatar,
          videoStream: null,
          screenStream: null,
          audioStream: null,
          micOn: true,
          /* Пока нет потребителя видео — «выкл», иначе новый зритель видит вечный «Камера подключается…» */
          webcamOn: false,
        };
        return { ...prev, [pid]: { ...cur, ...patch } };
      });
    },
    []
  );

  /** Плейсхолдер при выкл. камере: держим в sync с ЛК и с `forceAvatarDisplayRefresh` (смена файла / пресета). */
  useEffect(() => {
    if (!localPeerId) return;
    const av =
      typeof profileAvatarRef.current === 'string' && profileAvatarRef.current.length > 0
        ? profileAvatarRef.current
        : typeof profileAvatar === 'string' && profileAvatar.length > 0
          ? profileAvatar
          : undefined;
    mergePeer(localPeerId, { profileAvatar: av });
  }, [profileAvatar, avatarImageNonce, localPeerId, mergePeer]);

  const removePeer = useCallback((pid: string) => {
    setPeersById((prev) => {
      const next = { ...prev };
      delete next[pid];
      return next;
    });
    setPresenterPeerId((p) => (p === pid ? null : p));
  }, []);

  const applyConsumerRemoved = useCallback(
    (pid: string, kind: types.MediaKind, isScreen: boolean) => {
      if (kind === 'audio') {
        mergePeer(pid, { audioStream: null, micOn: false });
      } else if (isScreen) {
        mergePeer(pid, { screenStream: null });
        setPresenterPeerId((p) => (p === pid ? null : p));
      } else {
        mergePeer(pid, { videoStream: null, webcamOn: false });
      }
    },
    [mergePeer]
  );

  useEffect(() => {
    if (!localPeerId) return;

    let cancelled = false;
    let joinTimer: ReturnType<typeof setTimeout> | undefined;

    const target =
      deferJoinUntilMs != null && Number.isFinite(deferJoinUntilMs)
        ? Number(deferJoinUntilMs)
        : null;
    const waitMs =
      target != null && target > Date.now()
        ? Math.min(target - Date.now(), 86_400_000)
        : 0;

    if (waitMs > 0) {
      setScheduledJoinAtMs(target);
      setWaitingScheduledLobby(true);
    } else {
      setScheduledJoinAtMs(null);
      setWaitingScheduledLobby(false);
    }

    const begin = () => {
      if (cancelled) return;
      setWaitingScheduledLobby(false);
      setScheduledJoinAtMs(null);

      const ws = new WebSocket(buildWsUrl(roomId, localPeerId));
      wsRef.current = ws;

    const request = (method: string, data?: Record<string, unknown>) => {
      if (!ws || ws.readyState !== WebSocket.OPEN) {
        return Promise.reject(new Error('Нет соединения с сервером сигналинга'));
      }
      const id = nextReqId.current++;
      const payload: WsRequest = { type: 'request', id, method, data };
      return new Promise<unknown>((resolve, reject) => {
        pending.current.set(id, { resolve, reject });
        ws.send(JSON.stringify(payload));
      });
    };

    const ensureRecvTransport = async () => {
      if (recvTransportRef.current) return recvTransportRef.current;
      if (recvBootstrappedRef.current) return recvBootstrappedRef.current;
      const device = deviceRef.current;
      if (!device) throw new Error('device missing');

      recvBootstrappedRef.current = (async () => {
        const created = (await request('createWebRtcTransport', {
          direction: 'recv',
        })) as {
          id: string;
          iceParameters: types.IceParameters;
          iceCandidates: types.IceCandidate[];
          dtlsParameters: types.DtlsParameters;
        };

        const recvTransport = device.createRecvTransport(created);
        recvTransport.on(
          'connect',
          ({ dtlsParameters }: { dtlsParameters: types.DtlsParameters }, cb, eb) => {
            request('connectWebRtcTransport', {
              transportId: recvTransport.id,
              dtlsParameters,
            })
              .then(() => cb())
              .catch((e) => eb(e));
          }
        );
        recvTransportRef.current = recvTransport;
        return recvTransport;
      })();

      const t = await recvBootstrappedRef.current;
      recvBootstrappedRef.current = null;
      return t;
    };

    const consumeProducer = async (
      producerPeerId: string,
      producerId: string,
      kind: types.MediaKind,
      appData: Record<string, unknown>
    ) => {
      const device = deviceRef.current;
      if (!device) return;
      const recvTransport = await ensureRecvTransport();
      const isScreen = kind === 'video' && Boolean(appData.screen);

      const res = (await request('consume', {
        transportId: recvTransport.id,
        producerId,
        rtpCapabilities: device.rtpCapabilities,
      })) as {
        id: string;
        producerId: string;
        kind: types.MediaKind;
        rtpParameters: types.RtpParameters;
      };

      const consumer = await recvTransport.consume({
        id: res.id,
        producerId: res.producerId,
        kind: res.kind,
        rtpParameters: res.rtpParameters,
      });

      await request('resumeConsumer', { consumerId: consumer.id });
      consumersRef.current.set(consumer.id, {
        consumer,
        peerId: producerPeerId,
        isScreen,
      });

      const track = consumer.track;
      if (kind === 'audio') {
        mergePeer(producerPeerId, {
          audioStream: new MediaStream([track]),
          micOn: true,
        });
      } else if (isScreen) {
        mergePeer(producerPeerId, { screenStream: new MediaStream([track]) });
        setPresenterPeerId(producerPeerId);
      } else {
        mergePeer(producerPeerId, {
          videoStream: new MediaStream([track]),
          webcamOn: true,
        });
      }

      consumer.on('trackended', () => {
        consumersRef.current.delete(consumer.id);
      });
    };

    const detachConsumerByProducerId = (producerId: string) => {
      for (const [cid, meta] of [...consumersRef.current.entries()]) {
        if (meta.consumer.producerId !== producerId) continue;
        const { peerId: pid, isScreen, consumer } = meta;
        consumer.close();
        consumersRef.current.delete(cid);
        applyConsumerRemoved(pid, consumer.kind, isScreen);
      }
    };

    const onNotification = async (msg: WsNotification) => {
      const { event, data } = msg;
      if (event === 'newProducer') {
        await consumeProducer(
          data.peerId as string,
          data.producerId as string,
          data.kind as types.MediaKind,
          (data.appData as Record<string, unknown>) || {}
        );
      }
      if (event === 'producerClosed') {
        detachConsumerByProducerId(data.producerId as string);
      }
      if (event === 'producerPaused') {
        const pid = data.peerId as string;
        const kind = data.kind as types.MediaKind;
        const appData = (data.appData as Record<string, unknown>) || {};
        const isScreen = kind === 'video' && Boolean(appData.screen);
        if (kind === 'audio') {
          mergePeer(pid, { micOn: false });
        } else if (kind === 'video' && !isScreen) {
          mergePeer(pid, { webcamOn: false });
        }
      }
      if (event === 'producerResumed') {
        const pid = data.peerId as string;
        const kind = data.kind as types.MediaKind;
        const appData = (data.appData as Record<string, unknown>) || {};
        const isScreen = kind === 'video' && Boolean(appData.screen);
        if (kind === 'audio') {
          mergePeer(pid, { micOn: true });
        } else if (kind === 'video' && !isScreen) {
          mergePeer(pid, { webcamOn: true });
        }
      }
      if (event === 'consumerClosed') {
        const consumerId = data.consumerId as string;
        const meta = consumersRef.current.get(consumerId);
        if (!meta) return;
        const { peerId: pid, isScreen, consumer } = meta;
        consumersRef.current.delete(consumerId);
        applyConsumerRemoved(pid, consumer.kind, isScreen);
      }
      if (event === 'peerJoined') {
        const av = data.avatar;
        mergePeer(data.peerId as string, {
          displayName: (data.displayName as string) || 'Участник',
          profileAvatar:
            typeof av === 'string' && av.length > 0 ? av : undefined,
        });
      }
      if (event === 'peerLeft') {
        const left = data.peerId as string;
        for (const [cid, meta] of [...consumersRef.current.entries()]) {
          if (meta.peerId === left) {
            meta.consumer.close();
            consumersRef.current.delete(cid);
          }
        }
        removePeer(left);
      }
      if (event === 'chat') {
        const text = data.text as string;
        const ts = (data.ts as number) || Date.now();
        const from = (data.peerId as string) || '';
        const dn = (data.displayName as string) || 'Участник';
        const messageId =
          data.messageId != null && data.messageId !== ''
            ? String(data.messageId)
            : '';
        setChatMessages((m) => {
          const id =
            messageId || `${ts}-${from}-${Math.random().toString(36).slice(2, 7)}`;
          if (m.some((x) => x.id === id)) return m;
          const uid = userIdRef.current;
          const lp = localPeerIdRef.current;
          const isSelf =
            (lp != null && lp !== '' && from === lp) ||
            (uid !== undefined &&
              uid !== null &&
              String(uid).trim() !== '' &&
              from === `user-${String(uid)}`);
          return [
            ...m,
            {
              id,
              peerId: from,
              displayName: dn,
              text,
              ts,
              isSelf,
            },
          ];
        });
      }
    };

    const onMessage = async (ev: MessageEvent) => {
      let parsed: WsResponse | WsNotification;
      try {
        parsed = JSON.parse(String(ev.data));
      } catch {
        return;
      }
      if ('type' in parsed && parsed.type === 'notification') {
        await onNotification(parsed as WsNotification);
        return;
      }
      const res = parsed as WsResponse;
      if (typeof res.id !== 'number') return;
      const p = pending.current.get(res.id);
      if (!p) return;
      pending.current.delete(res.id);
      if (res.error) p.reject(new Error(res.error.message || 'error'));
      else p.resolve(res.result);
    };

    ws.addEventListener('message', (ev) => {
      void onMessage(ev);
    });

    const run = async () => {
      try {
        ensureMediaDevices();
        await new Promise<void>((resolve, reject) => {
          ws.addEventListener('open', () => resolve(), { once: true });
          ws.addEventListener(
            'error',
            () => reject(new Error('WebSocket не подключился')),
            { once: true }
          );
        });

        const joinResult = (await request('join', {
          displayName,
          avatar:
            typeof profileAvatarRef.current === 'string'
              ? profileAvatarRef.current
              : '',
        })) as {
          routerRtpCapabilities: types.RtpCapabilities;
          producers: {
            peerId: string;
            producerId: string;
            kind: types.MediaKind;
            appData: Record<string, unknown>;
          }[];
          peers: { peerId: string; displayName: string; avatar?: string }[];
        };

        const device = new mediasoupClient.Device();
        await device.load({
          routerRtpCapabilities: joinResult.routerRtpCapabilities,
        });
        deviceRef.current = device;

        const sendInfo = (await request('createWebRtcTransport', {
          direction: 'send',
        })) as {
          id: string;
          iceParameters: types.IceParameters;
          iceCandidates: types.IceCandidate[];
          dtlsParameters: types.DtlsParameters;
        };

        const sendTransport = device.createSendTransport(sendInfo);
        sendTransportRef.current = sendTransport;

        sendTransport.on(
          'connect',
          ({ dtlsParameters }: { dtlsParameters: types.DtlsParameters }, cb, eb) => {
            request('connectWebRtcTransport', {
              transportId: sendTransport.id,
              dtlsParameters,
            })
              .then(() => cb())
              .catch((e) => eb(e));
          }
        );

        sendTransport.on(
          'produce',
          (
            {
              kind,
              rtpParameters,
              appData,
            }: {
              kind: types.MediaKind;
              rtpParameters: types.RtpParameters;
              appData?: Record<string, unknown>;
            },
            cb,
            eb
          ) => {
            request('produce', {
              transportId: sendTransport.id,
              kind,
              rtpParameters,
              appData: appData || {},
            })
              .then((r) => cb({ id: (r as { id: string }).id }))
              .catch((e) => eb(e));
          }
        );

        const stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: webcamVideoConstraints(),
        });
        localStreamRef.current = stream;

        const audioTrack = stream.getAudioTracks()[0];
        const videoTrack = stream.getVideoTracks()[0];

        if (audioTrack) {
          localAudioProducerRef.current = await sendTransport.produce({
            track: audioTrack,
          });
        }
        if (videoTrack) {
          localVideoProducerRef.current = await sendTransport.produce({
            track: videoTrack,
            encodings: [WEBCAM_SEND_ENCODING],
          });
        }

        mergePeer(localPeerId, {
          displayName,
          profileAvatar:
            typeof profileAvatarRef.current === 'string' &&
            profileAvatarRef.current.length > 0
              ? profileAvatarRef.current
              : undefined,
          videoStream: videoTrack ? new MediaStream([videoTrack]) : null,
          audioStream: audioTrack ? new MediaStream([audioTrack]) : null,
          screenStream: null,
          micOn: true,
          webcamOn: Boolean(videoTrack),
        });

        for (const p of joinResult.peers || []) {
          mergePeer(p.peerId, {
            displayName: p.displayName || 'Участник',
            profileAvatar:
              typeof p.avatar === 'string' && p.avatar.length > 0
                ? p.avatar
                : undefined,
          });
        }

        for (const prod of joinResult.producers || []) {
          await consumeProducer(
            prod.peerId,
            prod.producerId,
            prod.kind,
            prod.appData || {}
          );
        }

        if (!cancelled) setInitialized(true);
      } catch (e) {
        if (!cancelled) {
          if (process.env.NODE_ENV === 'development') {
            console.error('join room failed', e);
          }
          setJoinError(formatMeetingJoinError(e));
        }
      }
    };

    void run();
    };

    if (waitMs > 0) {
      joinTimer = setTimeout(begin, waitMs);
    } else {
      begin();
    }

    const consumers = consumersRef.current;
    return () => {
      cancelled = true;
      if (joinTimer) clearTimeout(joinTimer);
      wsRef.current?.close();
      wsRef.current = null;
      localStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      localAudioProducerRef.current?.close();
      localVideoProducerRef.current?.close();
      localScreenProducerRef.current?.close();
      sendTransportRef.current?.close();
      recvTransportRef.current?.close();
      consumers.clear();
      deviceRef.current = null;
      sendTransportRef.current = null;
      recvTransportRef.current = null;
      recvBootstrappedRef.current = null;
      setWaitingScheduledLobby(false);
      setScheduledJoinAtMs(null);
    };
  }, [
    applyConsumerRemoved,
    deferJoinUntilMs,
    displayName,
    localPeerId,
    mergePeer,
    removePeer,
    roomId,
  ]);

  const requestLive = useCallback((method: string, data?: Record<string, unknown>) => {
    const ws = wsRef.current;
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      return Promise.reject(new Error('Нет соединения с сервером сигналинга'));
    }
    const id = nextReqId.current++;
    const payload: WsRequest = { type: 'request', id, method, data };
    return new Promise<unknown>((resolve, reject) => {
      pending.current.set(id, { resolve, reject });
      ws.send(JSON.stringify(payload));
    });
  }, []);

  const getActiveInputDeviceIds = useCallback(() => {
    const s = localStreamRef.current;
    if (!s) return {};
    const audio = s.getAudioTracks()[0]?.getSettings?.()?.deviceId;
    const video = s.getVideoTracks()[0]?.getSettings?.()?.deviceId;
    return {
      audio: audio && audio.length > 0 ? audio : undefined,
      video: video && video.length > 0 ? video : undefined,
    };
  }, []);

  const leave = useCallback(() => {
    wsRef.current?.close();
    localStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
  }, []);

  const toggleMic = useCallback(async () => {
    if (!localPeerId) return;
    const p = localAudioProducerRef.current;
    if (!p) {
      toast.error('Микрофон не инициализирован (нет аудио при входе в комнату)');
      return;
    }
    try {
      if (p.paused) {
        setLocalMicOn(true);
        mergePeer(localPeerId, { micOn: true });
        try {
          await requestLive('resumeProducer', { producerId: p.id });
          p.resume();
        } catch (e) {
          setLocalMicOn(false);
          mergePeer(localPeerId, { micOn: false });
          throw e;
        }
      } else {
        setLocalMicOn(false);
        mergePeer(localPeerId, { micOn: false });
        try {
          await requestLive('pauseProducer', { producerId: p.id });
          p.pause();
        } catch (e) {
          setLocalMicOn(true);
          mergePeer(localPeerId, { micOn: true });
          throw e;
        }
      }
    } catch (e) {
      toast.error((e as Error).message || 'Не удалось переключить микрофон');
    }
  }, [localPeerId, mergePeer, requestLive]);

  const toggleWebcam = useCallback(async () => {
    if (!localPeerId) return;
    const p = localVideoProducerRef.current;
    if (!p) {
      toast.error('Камера не инициализирована (нет видео при входе в комнату)');
      return;
    }
    try {
      if (p.paused) {
        setLocalWebcamOn(true);
        mergePeer(localPeerId, { webcamOn: true });
        try {
          await requestLive('resumeProducer', { producerId: p.id });
          p.resume();
        } catch (e) {
          setLocalWebcamOn(false);
          mergePeer(localPeerId, { webcamOn: false });
          throw e;
        }
      } else {
        setLocalWebcamOn(false);
        mergePeer(localPeerId, { webcamOn: false });
        try {
          await requestLive('pauseProducer', { producerId: p.id });
          p.pause();
        } catch (e) {
          setLocalWebcamOn(true);
          mergePeer(localPeerId, { webcamOn: true });
          throw e;
        }
      }
    } catch (e) {
      toast.error((e as Error).message || 'Не удалось переключить камеру');
    }
  }, [localPeerId, mergePeer, requestLive]);

  const stopScreenShare = useCallback(async () => {
    if (!localPeerId) return;
    const pr = localScreenProducerRef.current;
    if (!pr) return;
    await requestLive('closeProducer', { producerId: pr.id });
    pr.close();
    localScreenProducerRef.current = null;
    screenStreamRef.current?.getTracks().forEach((t) => t.stop());
    screenStreamRef.current = null;
    setIsScreenSharing(false);
    setPresenterPeerId((p) => (p === localPeerId ? null : p));
    mergePeer(localPeerId, { screenStream: null });
  }, [localPeerId, mergePeer, requestLive]);

  /**
   * После getDisplayMedia Chrome/macOS иногда «роняет» или приглушает дорожку микрофона из первого getUserMedia,
   * хотя на SFU мы шлём только экран отдельным producer. Перепривязываем мик той же логикой, что в changeMic.
   */
  const refreshMicTrackAfterDisplayCapture = useCallback(async () => {
    const p = localAudioProducerRef.current;
    if (!p || p.closed || !localPeerId) return;
    const prev = localStreamRef.current?.getAudioTracks()[0];
    const deviceId = prev?.getSettings?.()?.deviceId;
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio:
          deviceId && deviceId.length > 0 ? { deviceId: { ideal: deviceId } } : true,
        video: false,
      });
      const newAt = stream.getAudioTracks()[0];
      if (!newAt) return;
      await p.replaceTrack({ track: newAt });
      prev?.stop();
      const vt = localStreamRef.current?.getVideoTracks()[0];
      localStreamRef.current = new MediaStream(vt ? [vt, newAt] : [newAt]);
      mergePeer(localPeerId, {
        audioStream: new MediaStream([newAt]),
        micOn: !p.paused,
      });
    } catch {
      /* мик мог быть без разрешения — шаринг экрана не отменяем */
    }
  }, [localPeerId, mergePeer]);

  const toggleScreenShare = useCallback(async () => {
    if (!localPeerId) return;
    const sendTransport = sendTransportRef.current;
    if (!sendTransport) return;
    if (localScreenProducerRef.current) {
      await stopScreenShare();
      return;
    }
    let screen: MediaStream;
    try {
      // Не запрашиваем звук дисплея/вкладки: на SFU он не публикуется, а в ряде браузеров мешает микрофону.
      screen = await navigator.mediaDevices.getDisplayMedia({
        video: true,
        audio: false,
      });
    } catch {
      /* пользователь отменил диалог выбора экрана */
      return;
    }
    for (const t of screen.getAudioTracks()) {
      t.stop();
    }
    screenStreamRef.current = screen;
    const v = screen.getVideoTracks()[0];
    if (!v) {
      screen.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      return;
    }

    /* локальный превью и режим докладчика сразу после выбора окна — не ждём produce() на SFU */
    setIsScreenSharing(true);
    setPresenterPeerId(localPeerId);
    mergePeer(localPeerId, { screenStream: new MediaStream([v]) });

    try {
      const pr = await sendTransport.produce({
        track: v,
        appData: { screen: true },
        encodings: [{ maxBitrate: 5_000_000 }],
      });
      localScreenProducerRef.current = pr;
      v.addEventListener('ended', () => {
        void stopScreenShare();
      });
      void refreshMicTrackAfterDisplayCapture();
    } catch (e) {
      screenStreamRef.current?.getTracks().forEach((t) => t.stop());
      screenStreamRef.current = null;
      setIsScreenSharing(false);
      setPresenterPeerId((p) => (p === localPeerId ? null : p));
      mergePeer(localPeerId, { screenStream: null });
      toast.error((e as Error).message || 'Не удалось начать демонстрацию экрана');
    }
  }, [localPeerId, mergePeer, refreshMicTrackAfterDisplayCapture, stopScreenShare]);

  const changeMic = useCallback(
    async (deviceId: string) => {
      if (!localPeerId) return;
      const p = localAudioProducerRef.current;
      if (!p) {
        toast.error('Микрофон ещё не подключён к комнате');
        return;
      }
      const micWasOn = !p.paused;
      const audioConstraints = deviceId
        ? { deviceId: { ideal: deviceId } }
        : true;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: audioConstraints,
        video: false,
      });
      const track = stream.getAudioTracks()[0];
      if (!track) throw new Error('Не удалось получить аудиодорожку');
      await p.replaceTrack({ track });
      localStreamRef.current?.getAudioTracks().forEach((t) => t.stop());
      const vt = localStreamRef.current?.getVideoTracks()[0];
      localStreamRef.current = new MediaStream(vt ? [vt, track] : [track]);
      setLocalMicOn(micWasOn);
      mergePeer(localPeerId, {
        audioStream: new MediaStream([track]),
        micOn: micWasOn,
      });
    },
    [localPeerId, mergePeer]
  );

  const changeWebcam = useCallback(
    async (deviceId: string) => {
      if (!localPeerId) return;
      const p = localVideoProducerRef.current;
      if (!p) {
        toast.error('Камера ещё не подключена к комнате');
        return;
      }
      const webcamWasOn = !p.paused;
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: webcamVideoConstraints(deviceId || undefined),
      });
      const track = stream.getVideoTracks()[0];
      if (!track) throw new Error('Не удалось получить видеодорожку');
      await p.replaceTrack({ track });
      localStreamRef.current?.getVideoTracks().forEach((t) => t.stop());
      const at = localStreamRef.current?.getAudioTracks()[0];
      localStreamRef.current = new MediaStream(at ? [track, at] : [track]);
      setLocalWebcamOn(webcamWasOn);
      mergePeer(localPeerId, {
        videoStream: new MediaStream([track]),
        webcamOn: webcamWasOn,
      });
    },
    [localPeerId, mergePeer]
  );

  const sendChat = useCallback(
    async (text: string) => {
      const trimmed = text.trim();
      if (!trimmed) return;

      const hasAccount =
        userIdRef.current !== undefined &&
        userIdRef.current !== null &&
        String(userIdRef.current).trim() !== '';

      if (!hasAccount) {
        if (!localPeerId) {
          toast.error('Подождите, идёт подключение к комнате');
          return;
        }
        try {
          const { data } = await api.post<{ message: ApiChatRow }>(
            `/rooms/${encodeURIComponent(roomId)}/chat`,
            {
              text: trimmed,
              displayName,
              guestPeerId: localPeerId,
            }
          );
          const msg = mapApiChatRow(data.message, null, localPeerId);
          setChatMessages((m) => {
            if (m.some((x) => x.id === msg.id)) return m;
            return [...m, msg];
          });
          await requestLive('chat', {
            text: trimmed,
            displayName,
            ts: msg.ts,
            messageId: msg.id,
          });
        } catch (e) {
          toast.error(
            (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
              (e as Error).message ||
              'Не удалось отправить сообщение'
          );
          throw e;
        }
        return;
      }

      try {
        const { data } = await api.post<{ message: ApiChatRow }>(
          `/rooms/${encodeURIComponent(roomId)}/chat`,
          { text: trimmed }
        );
        const msg = mapApiChatRow(data.message, userIdRef.current, null);
        setChatMessages((m) => {
          if (m.some((x) => x.id === msg.id)) return m;
          return [...m, msg];
        });
        await requestLive('chat', {
          text: trimmed,
          displayName,
          ts: msg.ts,
          messageId: msg.id,
        });
      } catch (e) {
        toast.error(
          (e as { response?: { data?: { error?: string } } })?.response?.data?.error ||
            (e as Error).message ||
            'Не удалось отправить сообщение'
        );
        throw e;
      }
    },
    [displayName, localPeerId, roomId, requestLive]
  );

  /** Подсветка активного спикера + главный кадр в «Докладчик»: RMS по аудиопотокам участников. */
  useEffect(() => {
    if (!initialized || typeof window === 'undefined') {
      for (const ch of activeSpeakerChainsRef.current.values()) {
        try {
          ch.source.disconnect();
        } catch {
          /* ignore */
        }
      }
      activeSpeakerChainsRef.current.clear();
      activeSpeakerLastIdRef.current = null;
      setActiveSpeakerId(null);
      speakingPeerLastRef.current = null;
      setSpeakingPeerId(null);
      return;
    }

    const AC =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;
    if (!AC) return;

    const ctx = activeSpeakerCtxRef.current ?? new AC();
    activeSpeakerCtxRef.current = ctx;
    void ctx.resume();

    const chains = activeSpeakerChainsRef.current;

    const syncFromPeers = () => {
      const wanted = new Map<string, { stream: MediaStream; streamId: string }>();
      for (const [peerId, peer] of Object.entries(peersById)) {
        if (!peer.micOn || !peer.audioStream) continue;
        const stream = peer.audioStream;
        const live = stream.getAudioTracks().filter((t) => t.readyState === 'live');
        if (live.length === 0) continue;
        wanted.set(peerId, { stream, streamId: stream.id });
      }

      for (const peerId of [...chains.keys()]) {
        if (!wanted.has(peerId)) {
          const ch = chains.get(peerId);
          if (ch) {
            try {
              ch.source.disconnect();
            } catch {
              /* ignore */
            }
          }
          chains.delete(peerId);
        }
      }

      for (const [peerId, { stream, streamId }] of wanted) {
        const existing = chains.get(peerId);
        if (existing?.streamId === streamId) continue;

        if (existing) {
          try {
            existing.source.disconnect();
          } catch {
            /* ignore */
          }
          chains.delete(peerId);
        }

        try {
          const source = ctx.createMediaStreamSource(stream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 512;
          analyser.smoothingTimeConstant = 0.85;
          source.connect(analyser);
          chains.set(peerId, { source, analyser, streamId });
        } catch {
          /* ignore */
        }
      }
    };

    syncFromPeers();
  }, [initialized, peersById]);

  useEffect(() => {
    if (!initialized || typeof window === 'undefined') return;

    const threshold = 0.018;
    const minHoldMs = 900;
    const switchRatio = 1.35;
    let raf = 0;

    const syncSpeakingNow = (rms: number, loudestId: string | null) => {
      const next = rms >= threshold && loudestId != null ? loudestId : null;
      if (speakingPeerLastRef.current === next) return;
      speakingPeerLastRef.current = next;
      setSpeakingPeerId(next);
    };

    const tick = () => {
      const chains = activeSpeakerChainsRef.current;
      if (chains.size === 0) {
        if (activeSpeakerLastIdRef.current !== null) {
          activeSpeakerLastIdRef.current = null;
          setActiveSpeakerId(null);
        }
        syncSpeakingNow(0, null);
        raf = requestAnimationFrame(tick);
        return;
      }

      let bestId: string | null = null;
      let bestRms = 0;
      let currentRms = 0;
      let buf = activeSpeakerRmsBufRef.current;
      const curId = activeSpeakerLastIdRef.current;

      for (const [pid, { analyser }] of chains) {
        const need = analyser.fftSize;
        if (buf.length !== need) {
          buf = new Float32Array(need);
          activeSpeakerRmsBufRef.current = buf;
        }
        analyser.getFloatTimeDomainData(buf as Float32Array<ArrayBuffer>);
        let sum = 0;
        for (let i = 0; i < buf.length; i++) {
          sum += buf[i] * buf[i];
        }
        const rms = Math.sqrt(sum / buf.length);
        if (curId && pid === curId) currentRms = rms;
        if (rms > bestRms) {
          bestRms = rms;
          bestId = pid;
        }
      }

      const now = Date.now();

      // Закреплённый участник выключил мик / вышел — больше нет цепочки на него.
      if (curId && !chains.has(curId)) {
        activeSpeakerLastIdRef.current = null;
        activeSpeakerLastChangeAtMsRef.current = now;
        setActiveSpeakerId(null);
        syncSpeakingNow(bestRms, bestId);
        raf = requestAnimationFrame(tick);
        return;
      }

      let next: string | null = curId;

      if (bestRms >= threshold) {
        if (!curId) {
          next = bestId;
        } else if (bestId === curId) {
          next = curId;
        } else {
          // Другой голос — переключаем только после гистерезиса (не из-за шума).
          const holdOk = now - activeSpeakerLastChangeAtMsRef.current >= minHoldMs;
          const ratioOk = bestRms >= Math.max(threshold, currentRms * switchRatio);
          next = holdOk && ratioOk ? bestId : curId;
        }
      }
      // Иначе общая тишина: не сбрасываем — главный кадр остаётся за последним спикером,
      // пока не заговорит кто-то другой (см. ветку выше).

      if (next !== curId) {
        activeSpeakerLastIdRef.current = next;
        activeSpeakerLastChangeAtMsRef.current = now;
        setActiveSpeakerId(next);
      }

      syncSpeakingNow(bestRms, bestId);

      raf = requestAnimationFrame(tick);
    };

    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [initialized]);

  useEffect(() => {
    const chainsRef = activeSpeakerChainsRef;
    return () => {
      const chainsMap = chainsRef.current;
      for (const ch of chainsMap.values()) {
        try {
          ch.source.disconnect();
        } catch {
          /* ignore */
        }
      }
      chainsMap.clear();
      void activeSpeakerCtxRef.current?.close().catch(() => {
        /* ignore */
      });
      activeSpeakerCtxRef.current = null;
      activeSpeakerLastIdRef.current = null;
      speakingPeerLastRef.current = null;
      setSpeakingPeerId(null);
    };
  }, []);

  const orderedPeerIds = useMemo(() => Object.keys(peersById), [peersById]);

  const value: MediasoupMeetingContextValue = {
    initialized,
    joinError,
    waitingScheduledLobby,
    scheduledJoinAtMs,
    localPeerId: localPeerId ?? '',
    peersById,
    orderedPeerIds,
    presenterPeerId,
    activeSpeakerId,
    speakingPeerId,
    localMicOn,
    localWebcamOn,
    isScreenSharing,
    chatMessages,
    unreadChatCount,
    markChatRead,
    leave,
    toggleMic,
    toggleWebcam,
    toggleScreenShare,
    changeMic,
    changeWebcam,
    sendChat,
    getActiveInputDeviceIds,
    audioOutputDeviceId,
    setAudioOutputDeviceId,
    copyRoomInviteLink,
  };

  return (
    <MediasoupMeetingContext.Provider value={value}>
      {children}
    </MediasoupMeetingContext.Provider>
  );
}

export function useMediasoupMeeting() {
  const ctx = useContext(MediasoupMeetingContext);
  if (!ctx) {
    throw new Error('useMediasoupMeeting outside MediasoupMeetingProvider');
  }
  return ctx;
}
