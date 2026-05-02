'use client';

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { api } from '@/shared/lib/api';
import { usePathname, useSearchParams } from 'next/navigation';
import { useUnit } from 'effector-react';
import { toast } from 'sonner';
import { $authChecked, $isAuthenticated, $user, checkAuth } from '@/shared/store/auth';
import { checkMediaPermissionsFx } from '@/shared/store/meetings';
import dynamic from 'next/dynamic';
import { MediasoupMeetingProvider } from '@/features/mediasoup/MediasoupMeetingContext';
import { MeetingReminderSubscribe } from '@/widgets/MeetingReminderSubscribe';
import { MeetingPreJoin } from '@/widgets/MeetingPreJoin';
import { parseRoomRoute } from '@/shared/lib/meetingUrlParams';
import { MeetingLinkUnavailable } from '@/widgets/MeetingLinkUnavailable';

const MeetingRoom = dynamic(() => import('@/widgets/MeetingRoom'), { ssr: false });

const reminderDoneStorageKey = (id: string) => `meetingReminderDone:${id}`;

const guestJoinNameStorageKey = (id: string) => `hellconfGuestJoinName:${id}`;

/** Первая строка описания встречи — отображаемый заголовок (см. создание в CallList / MeetingTypeList). */
function meetingHeadingFromDescription(description: string | undefined): string {
  const d = description?.trim() ?? '';
  if (!d) return '';
  return (d.split('\n\n')[0] || '').trim();
}

const MeetingPage = () => {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const pathSegment = pathname?.split('/').pop() || '';

  const [user, isAuthenticated, authChecked] = useUnit([
    $user,
    $isAuthenticated,
    $authChecked,
  ]);
  const checkPermissions = useUnit(checkMediaPermissionsFx);

  const searchParamsKey = searchParams?.toString() ?? '';

  const returnToMeetingPath = useMemo(() => {
    const p = pathname ?? '';
    if (!searchParamsKey) return p;
    return `${p}?${searchParamsKey}`;
  }, [pathname, searchParamsKey]);

  const signInHref = useMemo(
    () => `/sign-in?next=${encodeURIComponent(returnToMeetingPath)}`,
    [returnToMeetingPath]
  );
  const signUpHref = useMemo(
    () => `/sign-up?next=${encodeURIComponent(returnToMeetingPath)}`,
    [returnToMeetingPath]
  );

  const {
    roomId,
    scheduledStartMs: scheduledStartFromQuery,
    durationMin: duration,
    isInstantMeeting,
  } = useMemo(
    () => parseRoomRoute(pathSegment, new URLSearchParams(searchParamsKey)),
    [pathSegment, searchParamsKey]
  );

  /** Почта на pre-join / подписка: только запланированная встреча, старт ещё впереди */
  const scheduledUpcoming =
    !isInstantMeeting &&
    scheduledStartFromQuery != null &&
    scheduledStartFromQuery > Date.now();

  /** Для мгновенной комнаты без расписания — один раз за комнату, иначе Date.now() на каждом ререндере сдвигал бы конец сессии. */
  const instantStartAnchorRef = useRef<{ roomId: string; ms: number } | null>(null);
  const sessionStartMs = useMemo(() => {
    if (scheduledStartFromQuery != null) return scheduledStartFromQuery;
    if (!roomId) return Date.now();
    if (instantStartAnchorRef.current?.roomId !== roomId) {
      instantStartAnchorRef.current = { roomId, ms: Date.now() };
    }
    return instantStartAnchorRef.current.ms;
  }, [scheduledStartFromQuery, roomId]);

  const sessionEndsAtMs = useMemo(
    () => sessionStartMs + duration * 60_000,
    [sessionStartMs, duration]
  );

  const [, setReminderClock] = useState(0);
  useEffect(() => {
    if (scheduledStartFromQuery == null) return;
    const t = setInterval(() => setReminderClock((n) => n + 1), 60_000);
    return () => clearInterval(t);
  }, [scheduledStartFromQuery]);

  /**
   * null — ещё проверяем подписку (логин + email);
   * true — эта почта уже в meeting_reminders;
   * false — показать плашку (гость, нет email в профиле или не подписан).
   */
  const [reminderEmailAlreadySubscribed, setReminderEmailAlreadySubscribed] = useState<
    boolean | null
  >(null);

  /** После экрана «как вас зовут» — только тогда подключаемся к сигналингу */
  const [joinDisplayName, setJoinDisplayName] = useState<string | null>(null);
  const [reminderSubscribeBusy, setReminderSubscribeBusy] = useState(false);
  /** Заголовок из API (календарь); `null` — ещё не запрашивали или нет записи. */
  const [fetchedMeetingTitle, setFetchedMeetingTitle] = useState<string | null>(null);
  /** Создатель встречи из календаря — чтобы не показывать подписку на напоминание организатору */
  const [fetchedCreatorId, setFetchedCreatorId] = useState<string | null>(null);
  /** GET /meetings/:path вернул 404 — запись календаря удалена (отмена) */
  const [calendarMeetingMissing, setCalendarMeetingMissing] = useState(false);
  const [calendarLookupDone, setCalendarLookupDone] = useState(isInstantMeeting);

  const [nowTick, setNowTick] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNowTick(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const sessionEndedByTime = nowTick >= sessionEndsAtMs;

  const isCurrentUserOrganizer = useMemo(() => {
    if (!isAuthenticated || !user?.ID || fetchedCreatorId == null || fetchedCreatorId === '') {
      return false;
    }
    return String(user.ID).trim() === String(fetchedCreatorId).trim();
  }, [isAuthenticated, user?.ID, fetchedCreatorId]);

  useEffect(() => {
    if (!roomId || isInstantMeeting) {
      setReminderEmailAlreadySubscribed(false);
      return;
    }
    if (isCurrentUserOrganizer) {
      setReminderEmailAlreadySubscribed(false);
      return;
    }
    if (scheduledStartFromQuery == null) {
      setReminderEmailAlreadySubscribed(null);
      return;
    }
    if (typeof window !== 'undefined') {
      try {
        if (sessionStorage.getItem(reminderDoneStorageKey(roomId)) === '1') {
          setReminderEmailAlreadySubscribed(true);
          return;
        }
      } catch {
        /* private mode */
      }
    }
    const email = user?.email?.trim();
    if (!isAuthenticated || !email) {
      setReminderEmailAlreadySubscribed(false);
      return;
    }
    let cancelled = false;
    setReminderEmailAlreadySubscribed(null);
    void (async () => {
      try {
        const { data } = await api.get<{ subscribed: boolean }>('/meetings/reminders/status', {
          params: { room_id: roomId, email: email.toLowerCase() },
        });
        if (!cancelled) setReminderEmailAlreadySubscribed(Boolean(data.subscribed));
      } catch {
        if (!cancelled) setReminderEmailAlreadySubscribed(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [
    roomId,
    isInstantMeeting,
    scheduledStartFromQuery,
    isAuthenticated,
    user?.email,
    isCurrentUserOrganizer,
  ]);

  /** Запланированная встреча, старт в будущем (мгновенные — без плашки). */
  const timeOkForReminderUi =
    !isInstantMeeting &&
    scheduledStartFromQuery != null &&
    scheduledStartFromQuery > Date.now();

  /** Гость: показываем сразу (пока запрос не нужен). Залогиненный: только если API вернул subscribed: false; null — ждём запрос. */
  const showEmailReminderBar =
    timeOkForReminderUi &&
    !isCurrentUserOrganizer &&
    ((!isAuthenticated && reminderEmailAlreadySubscribed !== true) ||
      (isAuthenticated && reminderEmailAlreadySubscribed === false));

  /** Поле email в лобби: до старта и пока нет подтверждённой подписки; у залогина — ждём статус с API */
  const showPreJoinReminderField =
    scheduledUpcoming &&
    !isCurrentUserOrganizer &&
    reminderEmailAlreadySubscribed !== true &&
    (!isAuthenticated || reminderEmailAlreadySubscribed !== null);

  const reminderSavedInLobby =
    !isCurrentUserOrganizer &&
    reminderEmailAlreadySubscribed === true &&
    scheduledUpcoming;

  useEffect(() => {
    setFetchedMeetingTitle(null);
    setFetchedCreatorId(null);
    setCalendarMeetingMissing(false);
    const qTitle = new URLSearchParams(searchParamsKey).get('title')?.trim();
    if (qTitle) {
      setCalendarLookupDone(true);
      return;
    }
    if (!pathSegment || !roomId) {
      setCalendarLookupDone(true);
      return;
    }
    if (isInstantMeeting) {
      setCalendarLookupDone(true);
      return;
    }
    setCalendarLookupDone(false);
    let cancelled = false;
    void (async () => {
      try {
        const { data } = await api.get<{
          meeting?: { description?: string; creator_id?: string };
        }>(`/meetings/${encodeURIComponent(pathSegment)}`);
        if (cancelled) return;
        const heading = meetingHeadingFromDescription(data?.meeting?.description);
        if (heading) setFetchedMeetingTitle(heading);
        const cid = data?.meeting?.creator_id?.trim();
        if (cid) setFetchedCreatorId(cid);
      } catch (err: unknown) {
        if (cancelled) return;
        const status = (err as { response?: { status?: number } }).response?.status;
        if (status === 404) setCalendarMeetingMissing(true);
      } finally {
        if (!cancelled) setCalendarLookupDone(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [pathSegment, roomId, searchParamsKey, isInstantMeeting]);

  const meetingTitle = useMemo(() => {
    const q = new URLSearchParams(searchParamsKey).get('title')?.trim();
    if (q) return q;
    if (fetchedMeetingTitle) return fetchedMeetingTitle;
    return 'Встреча';
  }, [searchParamsKey, fetchedMeetingTitle]);

  useEffect(() => {
    if (!roomId) return;
    checkAuth();
  }, [roomId]);

  /**
   * Лобби не показываем залогиненным, если:
   * — мгновенная встреча (instant в токене), или
   * — запланированная, но время старта уже наступило (как «живая» комната).
   * Запланированная со стартом в будущем — лобби для всех (ник + напоминание).
   */
  useLayoutEffect(() => {
    if (!roomId || !authChecked) return;
    if (!isAuthenticated) return;
    const name = user?.username?.trim();
    if (!name) return;
    if (scheduledUpcoming) return;
    setJoinDisplayName((prev) => prev ?? name);
  }, [
    roomId,
    authChecked,
    scheduledUpcoming,
    isAuthenticated,
    user?.username,
  ]);

  /** Гость: после F5 на уже идущей встрече подставляем имя с прошлого входа (sessionStorage) */
  useLayoutEffect(() => {
    if (!roomId || !authChecked) return;
    if (isAuthenticated) return;
    if (joinDisplayName != null) return;
    if (scheduledUpcoming) return;
    try {
      const saved = sessionStorage.getItem(guestJoinNameStorageKey(roomId))?.trim();
      if (saved) setJoinDisplayName(saved);
    } catch {
      /* private mode */
    }
  }, [roomId, authChecked, isAuthenticated, scheduledUpcoming, joinDisplayName]);

  useEffect(() => {
    if (!roomId || !joinDisplayName) return;
    checkPermissions();
    // effector: checkPermissions стабилен
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId, joinDisplayName]);

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

  const handlePreJoin = useCallback((payload: { displayName: string }) => {
    const name = payload.displayName.trim();
    if (!name) return;
    if (roomId) {
      try {
        sessionStorage.setItem(guestJoinNameStorageKey(roomId), name);
      } catch {
        /* private mode */
      }
    }
    setJoinDisplayName(name);
  }, [roomId]);

  const handleReminderSubscribe = useCallback(
    async (email: string) => {
      const trimmed = email.trim().toLowerCase();
      if (!trimmed || !roomId) return;
      setReminderSubscribeBusy(true);
      try {
        const { data, status } = await api.post<{ message?: string }>(
          '/meetings/reminders/subscribe',
          { room_id: roomId, email: trimmed }
        );
        toast.success(data.message || (status === 201 ? 'Подписка сохранена' : 'Готово'));
        try {
          sessionStorage.setItem(reminderDoneStorageKey(roomId), '1');
        } catch {
          /* private mode */
        }
        setReminderEmailAlreadySubscribed(true);
      } catch (err: unknown) {
        const ax = err as { response?: { data?: { error?: string } } };
        toast.error(ax.response?.data?.error || 'Не удалось сохранить почту для напоминания');
      } finally {
        setReminderSubscribeBusy(false);
      }
    },
    [roomId]
  );

  if (!roomId) {
    return null;
  }

  if (sessionEndedByTime) {
    return (
      <MeetingLinkUnavailable variant="ended" meetingTitle={meetingTitle} />
    );
  }

  if (!isInstantMeeting && !calendarLookupDone) {
    return (
      <div className="flex min-h-full flex-1 flex-col items-center justify-center gap-3 px-4 py-16 text-zinc-400">
        <p className="text-sm">Проверяем ссылку…</p>
      </div>
    );
  }

  if (!isInstantMeeting && calendarMeetingMissing) {
    return (
      <MeetingLinkUnavailable variant="cancelled" meetingTitle={meetingTitle} />
    );
  }

  const defaultPreJoinName = isAuthenticated ? (user?.username?.trim() || '') : '';

  if (joinDisplayName == null) {
    return (
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        <MeetingPreJoin
          meetingTitle={meetingTitle}
          defaultDisplayName={defaultPreJoinName}
          defaultReminderEmail={user?.email}
          isInstantMeeting={isInstantMeeting}
          showReminderEmail={showPreJoinReminderField}
          reminderAlreadySaved={reminderSavedInLobby}
          scheduledStartMs={scheduledStartFromQuery}
          onJoin={handlePreJoin}
          onReminderSubscribe={
            roomId && !isCurrentUserOrganizer ? handleReminderSubscribe : undefined
          }
          joinBusy={false}
          reminderBusy={reminderSubscribeBusy}
          showGuestAuthChoice={!isAuthenticated}
          signInHref={signInHref}
          signUpHref={signUpHref}
          profileAvatar={user?.avatar}
        />
      </div>
    );
  }

  return (
    <MediasoupMeetingProvider
      key={roomId}
      roomId={roomId}
      displayName={joinDisplayName}
      userId={user?.ID}
      profileAvatar={user?.avatar}
      deferJoinUntilMs={scheduledStartFromQuery}
    >
      <div className="flex h-full min-h-0 w-full min-w-0 flex-1 flex-col">
        {showEmailReminderBar ? (
          <MeetingReminderSubscribe
            roomId={roomId}
            defaultEmail={user?.email}
            onSubscribed={() => setReminderEmailAlreadySubscribed(true)}
          />
        ) : null}
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <MeetingRoom
            sessionEndsAtMs={sessionEndsAtMs}
            sessionStartMs={sessionStartMs}
            meetingTitle={meetingTitle}
          />
        </div>
      </div>
    </MediasoupMeetingProvider>
  );
};

export default MeetingPage;
