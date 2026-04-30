import { createEffect, createEvent, createStore, sample } from 'effector';
import { AxiosError } from 'axios';
import { api } from '@/shared/lib/api';
import {
    CancelMeetingResult,
    CreateMeetingParams,
    CreateMeetingResult,
    Meeting,
} from '@/shared/types';

type ApiErrorResponse = {
    error?: string;
    message?: string;
}

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
interface CustomAxiosError extends AxiosError<ApiErrorResponse> {}

export const getUpcomingMeetings = createEvent<string>();
export const getCurrentMeeting = createEvent<string>();
export const createMeeting = createEvent<CreateMeetingParams>();
/** Удаление запланированной встречи (creator); на бэкенде — письма об отмене подписчикам */
export const cancelMeeting = createEvent<{ id: number; creator_id: string }>();
export const resetMeetings = createEvent();
export const resetErrors = createEvent();
export const validationFailed = createEvent<string>();
export const toggleMicrophone = createEvent<boolean>();
export const toggleCamera = createEvent<boolean>();
export const resetMediaState = createEvent();

export const fetchUpcomingMeetingsFx = createEffect<string, Meeting[], CustomAxiosError>(
    async (creator_id) => {
      try {
        const response = await api.get('/meetings/upcoming', {
          params: { creator_id }
        });
        return response.data.meetings;
      } catch (error) {
        throw error;
      }
    }
  );

export const cancelMeetingFx = createEffect<
    { id: number; creator_id: string },
    CancelMeetingResult,
    CustomAxiosError
>(async ({ id, creator_id }) => {
    const response = await api.delete<{
        cancellation_emails_sent?: number;
        cancellation_emails_failed?: string[];
    }>(`/meetings/${id}`, { data: { creator_id } });
    const failed = response.data.cancellation_emails_failed;
    return {
        cancellation_emails_sent: response.data.cancellation_emails_sent ?? 0,
        cancellation_emails_failed: Array.isArray(failed) ? failed : [],
    };
});

export const createMeetingFx = createEffect<CreateMeetingParams, CreateMeetingResult, CustomAxiosError>(
    async (params) => {
        const response = await api.post<{
            data: Meeting;
            invite_emails_sent?: number;
            /** бэкенд отдаёт массив адресов с ошибкой доставки */
            invite_emails_failed?: number | string[];
        }>('/meetings', params);
        const failedRaw = response.data.invite_emails_failed;
        const inviteFailCount = Array.isArray(failedRaw)
            ? failedRaw.length
            : Number(failedRaw) || 0;
        return {
            meeting: response.data.data,
            invite_emails_sent: response.data.invite_emails_sent ?? 0,
            invite_emails_failed: inviteFailCount,
        };
    }
);

export const fetchCurrentMeetingFx = createEffect<string, Meeting | null, CustomAxiosError>(
    async (creator_id) => {
      try {
        const response = await api.get('/meetings/current', {
          params: { creator_id }
        });
        return response.data.meeting;
      } catch (error) {
        if ((error as AxiosError).response?.status === 404) {
          return null;
        }
        throw error;
      }
    }
  );

export const checkMediaPermissionsFx = createEffect(async () => {
    try {
        const [cameraPerm, micPerm] = await Promise.all([
            navigator.permissions.query({ name: 'camera' }),
            navigator.permissions.query({ name: 'microphone' })
        ]);
        // «prompt» — разрешение ещё не выдано и не отклонено; кнопки не должны быть
        // заблокированы до «granted», иначе после успешного getUserMedia в комнате UI
        // остаётся disabled (типичный случай при первом заходе на страницу встречи).
        return {
            hasCameraPermission: cameraPerm.state !== 'denied',
            hasMicrophonePermission: micPerm.state !== 'denied'
        };
    } catch (error) {
        console.error('Permission check error:', error);
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
            stream.getTracks().forEach(track => track.stop());
            return { hasCameraPermission: true, hasMicrophonePermission: true };
        } catch {
            return { hasCameraPermission: false, hasMicrophonePermission: false };
        }
    }
});

export const leaveMeetingFx = createEffect(async () => {
    try {
        const streams = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        streams.getTracks().forEach(track => track.stop());
        return true;
    } catch (error) {
        console.error('Error in leaveMeetingFx:', error);
        throw error;
    }
});

export const $upcomingMeetings = createStore<Meeting[]>([])
    .on(fetchUpcomingMeetingsFx.doneData, (_, meetings) => meetings)
    .reset(resetMeetings);

export const $currentMeeting = createStore<Meeting | null>(null)
    .on(fetchCurrentMeetingFx.doneData, (_, meeting) => meeting)
    .reset(resetMeetings);

export const $meetingsLoading = createStore<boolean>(false)
    .on(
        [
            fetchUpcomingMeetingsFx.pending,
            fetchCurrentMeetingFx.pending,
            createMeetingFx.pending,
            cancelMeetingFx.pending,
        ],
        (_, pending) => pending,
    );

export const $meetingsError = createStore<string | null>(null)
    .on(
        [fetchUpcomingMeetingsFx.failData, fetchCurrentMeetingFx.failData, cancelMeetingFx.failData],
        (_, error) => error.response?.data?.error || error.message || 'Ошибка загрузки встреч',
    )
    .on(validationFailed, (_, message) => message)
    .reset([resetErrors, resetMeetings]);

export const $createMeetingError = createStore<string | null>(null)
    .on(createMeetingFx.failData, 
        (_, error) => error.response?.data?.error || error.message || 'Ошибка создания встречи')
    .reset([createMeetingFx.done, resetErrors]);

export const $isMeetingFormValid = createStore<boolean>(false)
    .on(createMeeting, (_, params) => {
        const isValid = Boolean(
            params.creator_id &&
            params.date &&
            params.start_time &&
            params.duration > 0 &&
            params.description
        );
        
        if (!isValid) validationFailed("Заполните все обязательные поля!");
        return isValid;
    });

export const $mediaState = createStore({
    isCameraActive: false,
    isMicroActive: false,
    hasCameraPermission: false,
    hasMicrophonePermission: false
})
    .on(toggleMicrophone, (state, isActive) => ({ ...state, isMicroActive: isActive }))
    .on(toggleCamera, (state, isActive) => ({ ...state, isCameraActive: isActive }))
    .on(checkMediaPermissionsFx.doneData, (state, permissions) => ({ ...state, ...permissions }))
    .reset([resetMediaState, leaveMeetingFx.done]);

sample({
    clock: getUpcomingMeetings,
    target: fetchUpcomingMeetingsFx
});

sample({
    clock: getCurrentMeeting,
    target: [fetchCurrentMeetingFx, checkMediaPermissionsFx]
});

sample({
    source: createMeeting,
    filter: $isMeetingFormValid,
    target: createMeetingFx
});

sample({
  clock: createMeetingFx.done,
  fn: ({ params }) => params.creator_id,
  target: getUpcomingMeetings,
});

sample({
    clock: cancelMeeting,
    target: cancelMeetingFx,
});

sample({
  clock: cancelMeetingFx.done,
  fn: ({ params }) => params.creator_id,
  target: getUpcomingMeetings,
});