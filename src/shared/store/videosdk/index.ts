import { createEffect, createEvent, createStore, sample } from 'effector';
import { api } from '@/shared/lib/api';

type VideoSDKToken = {
  token: string;
  expires_at: number;
};

type GenerateTokenParams = {
    roomId: string;
    participantId: string;
}

export const generateToken = createEvent<GenerateTokenParams>();
export const createRoom = createEvent();
export const validateToken = createEvent();
export const loadTokenFromStorage = createEvent();

export const $roomId = createStore<string | null>(null);
export const $isTokenValid = createStore(false);
export const generateTokenFx = createEffect(async (params: GenerateTokenParams) => {
  const response = await api.post('/videosdk/token', params);
  return response.data;
});

export const validateTokenFx = createEffect(async (token: string) => {
  try {
    const response = await api.get('/videosdk/validate', {
      headers: { Authorization: `Bearer ${token}` }
    });
    return response.data.valid;
  } catch {
    return false;
  }
});

export const $videoSDKToken = createStore<VideoSDKToken | null>(null)
  .on(generateTokenFx.doneData, (_, token) => {
    localStorage.setItem('videoSDKToken', JSON.stringify(token));
    return token;
  })
  .on(loadTokenFromStorage, () => {
    const stored = localStorage.getItem('videoSDKToken');
    return stored ? JSON.parse(stored) : null;
  });

sample({
  clock: generateToken,
  target: generateTokenFx
});

sample({
  clock: validateToken,
  source: $videoSDKToken,
  filter: (tokenData): tokenData is VideoSDKToken => !!tokenData,
  fn: (tokenData) => tokenData ? tokenData.token : '',
  target: validateTokenFx
});

sample({
  clock: validateTokenFx.doneData,
  target: $isTokenValid
});