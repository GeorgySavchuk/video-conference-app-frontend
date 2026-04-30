import { createEffect, createStore, createEvent, sample } from 'effector';
import { AxiosError } from 'axios';
import { api } from '@/shared/lib/api';
import { AuthResponse, User } from '@/shared/types';

type LoginParams = {
  username: string;
  password: string;
};

type RegisterParams = LoginParams & {
  email: string;
};

type CustomAxiosError = AxiosError<{ message?: string; error?: string }>;

type ApiUserPayload = {
  name?: string;
  Name?: string;
  ID?: unknown;
  id?: unknown;
  email?: string;
  avatar?: string;
  created_at?: string;
  CreatedAt?: string;
};

function parseCreatedAtFromApi(raw: ApiUserPayload): string | undefined {
  const v =
    typeof raw.created_at === 'string'
      ? raw.created_at
      : typeof raw.CreatedAt === 'string'
        ? raw.CreatedAt
        : undefined;
  if (!v?.trim()) return undefined;
  const ms = Date.parse(v);
  if (Number.isNaN(ms)) return undefined;
  if (new Date(ms).getUTCFullYear() < 1970) return undefined;
  return v;
}

function userFromApiPayload(raw: ApiUserPayload): User {
  const em = typeof raw?.email === 'string' ? raw.email.trim().toLowerCase() : '';
  const createdAt = parseCreatedAtFromApi(raw);
  return {
    username: String(raw?.name ?? raw?.Name ?? ''),
    ID: String(raw?.ID ?? raw?.id ?? ''),
    email: em.length > 0 ? em : undefined,
    avatar: typeof raw?.avatar === 'string' && raw.avatar.length > 0 ? raw.avatar : undefined,
    ...(createdAt ? { createdAt } : {}),
  };
}

function persistUser(user: User) {
  if (typeof window !== 'undefined' && user.username) {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

function mergeUserPatch(state: User, patch: Partial<User>): User {
  const next: User = { ...state };
  (Object.keys(patch) as (keyof User)[]).forEach((key) => {
    const v = patch[key];
    if (v !== undefined) next[key] = v as never;
  });
  return next;
}

export const registerFormSubmitted = createEvent<RegisterParams>();
export const loginFormSubmitted = createEvent<LoginParams>();
export const resetLoginError = createEvent();
export const checkAuth = createEvent();
export const logout = createEvent();
export const restoreUserFromStorage = createEvent<User>();

export const userPatched = createEvent<Partial<User>>();

/** После смены аватара — инкремент для URL и remount превью. */
export const forceAvatarDisplayRefresh = createEvent();

/** Мгновенное превью в шапке/профиле до завершения запроса (blob или пресет). */
export type AvatarDisplayOverride =
  | { kind: 'blob'; url: string }
  | { kind: 'preset'; presetId: string };

export const avatarDisplayOverrideSet = createEvent<AvatarDisplayOverride | null>();

export const $loginPending = createStore<boolean>(false);
export const $loginError = createStore<{ isError: boolean; message: string }>({
  isError: false,
  message: '',
});

export const $registerPending = createStore<boolean>(false);
export const $registerError = createStore<{ isError: boolean; message: string }>({
  isError: false,
  message: '',
});

export const loginFx = createEffect<LoginParams, AuthResponse, CustomAxiosError>(
  async ({ username, password }) => {
    const response = await api.post('/auth/signin', {
      name: username,
      password,
    });

    return response.data;
  }
);

export const registerFx = createEffect<RegisterParams, void, CustomAxiosError>(
  async ({ username, password, email }) => {
    const response = await api.post('/auth/signup', {
      name: username,
      password,
      email: email.trim().toLowerCase(),
    });

    return response.data;
  }
);

export const checkAuthFx = createEffect<void, AuthResponse, CustomAxiosError>(async () => {
  const response = await api.get('/auth/validate');
  return response.data;
});

export const logoutFx = createEffect<void, void, CustomAxiosError>(async () => {
  try {
    await api.post('/auth/logout');
  } finally {
    localStorage.removeItem('user');
  }
});

export const $avatarDisplayOverride = createStore<AvatarDisplayOverride | null>(null)
  .on(avatarDisplayOverrideSet, (_, v) => v)
  .reset(logoutFx.done);

export const setAvatarPresetFx = createEffect<string, void>(async (preset) => {
  avatarDisplayOverrideSet({ kind: 'preset', presetId: preset });
  try {
    const { data } = await api.put<{ user: ApiUserPayload }>('/profile/avatar/preset', {
      preset,
    });
    userPatched(userFromApiPayload(data.user));
    const fresh = await api.get<AuthResponse>('/auth/validate');
    userPatched(userFromApiPayload(fresh.data.user as ApiUserPayload));
    forceAvatarDisplayRefresh();
  } finally {
    avatarDisplayOverrideSet(null);
  }
});

export const uploadAvatarFileFx = createEffect<File, void>(async (file) => {
  const blobUrl = URL.createObjectURL(file);
  avatarDisplayOverrideSet({ kind: 'blob', url: blobUrl });
  try {
    const fd = new FormData();
    fd.append('file', file);
    const { data } = await api.post<{ user: ApiUserPayload }>('/profile/avatar', fd);
    userPatched(userFromApiPayload(data.user));
    const fresh = await api.get<AuthResponse>('/auth/validate');
    userPatched(userFromApiPayload(fresh.data.user as ApiUserPayload));
    forceAvatarDisplayRefresh();
  } finally {
    URL.revokeObjectURL(blobUrl);
    avatarDisplayOverrideSet(null);
  }
});

export const updateProfileNameFx = createEffect<string, void>(async (name) => {
  const trimmed = name.trim();
  const { data } = await api.put<{ user: ApiUserPayload }>('/profile/name', {
    name: trimmed,
  });
  userPatched(userFromApiPayload(data.user));
});

export const $isAuthenticated = createStore<boolean>(false)
  .on(checkAuthFx.done, () => true)
  .on(loginFx.done, () => true)
  .on(restoreUserFromStorage, () => true)
  .on(checkAuthFx.fail, () => false)
  .on(logoutFx.done, () => false);

export const $authChecked = createStore<boolean>(false)
  .on(checkAuthFx.done, () => true)
  .on(loginFx.done, () => true)
  .on(restoreUserFromStorage, () => true)
  .on(checkAuthFx.fail, () => true)
  .on(logoutFx.done, () => false);

export const $user = createStore<User>({} as User)
  .on(loginFx.doneData, (_, data) => {
    const user = userFromApiPayload(data.user as ApiUserPayload);
    persistUser(user);
    return user;
  })
  .on(checkAuthFx.doneData, (_, data) => {
    const user = userFromApiPayload(data.user as ApiUserPayload);
    persistUser(user);
    return user;
  })
  .on(restoreUserFromStorage, (_, user) => user)
  .on(userPatched, (state, patch) => {
    const next = mergeUserPatch(state, patch);
    persistUser(next);
    return next;
  })
  .on(checkAuthFx.fail, () => {
    if (typeof window !== 'undefined') {
      try {
        localStorage.removeItem('user');
      } catch {
        /* ignore */
      }
    }
    return {} as User;
  })
  .on(logoutFx.done, () => ({} as User));

/** Счётчик для query `t=` на URL аватара и key remount (см. forceAvatarDisplayRefresh). */
export const $avatarImageNonce = createStore(0)
  .on(forceAvatarDisplayRefresh, (n) => n + 1)
  .reset(logoutFx.done);

$loginPending.on([loginFx.pending, checkAuthFx.pending], (_, pending) => pending);

$loginError
  .on(loginFx.fail, (_, { error }) => ({
    isError: true,
    message: error.response?.data?.message || 'Ошибка при входе',
  }))
  .reset([loginFormSubmitted, resetLoginError]);

$registerPending.on(registerFx.pending, (_, pending) => pending);

$registerError
  .on(registerFx.fail, (_, { error }) => ({
    isError: true,
    message:
      error.response?.data?.message ||
      error.response?.data?.error ||
      'Ошибка при регистрации',
  }))
  .reset([registerFormSubmitted]);

sample({
  clock: loginFormSubmitted,
  target: loginFx,
});

sample({
  clock: checkAuth,
  target: checkAuthFx,
});

sample({
  clock: logout,
  target: logoutFx,
});

sample({
  clock: registerFx.done,
  fn: ({ params }) => ({ username: params.username, password: params.password }),
  target: loginFx,
});

sample({
  clock: registerFormSubmitted,
  target: registerFx,
});
