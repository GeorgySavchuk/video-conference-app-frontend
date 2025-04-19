import { createEffect, createStore, createEvent, sample } from 'effector';
import { AxiosError } from 'axios';
import { api } from '@/shared/lib/api';
import { AuthResponse, User } from '@/shared/types';

type AuthParams = {
  username: string;
  password: string;
};

type CustomAxiosError = AxiosError<{ message: string }>;

export const registerFormSubmitted = createEvent<AuthParams>();
export const loginFormSubmitted = createEvent<AuthParams>();
export const resetLoginError = createEvent();
export const checkAuth = createEvent();
export const logout = createEvent();
export const restoreUserFromStorage = createEvent<User>();

export const $loginPending = createStore<boolean>(false);
export const $loginError = createStore<{isError: boolean; message: string;}>({
  isError: false, 
  message: ""
});

export const $registerPending = createStore<boolean>(false);
export const $registerError = createStore<{isError: boolean; message: string;}>({
  isError: false, 
  message: ""
});

export const loginFx = createEffect<AuthParams, AuthResponse, CustomAxiosError>(
  async ({ username, password }) => {
    try {
      const response = await api.post('/auth/signin', {
        name: username,
        password,
      });
      
      return response.data;
    } catch (err) {
      throw err;
    }
  }
);

export const registerFx = createEffect<AuthParams, void, CustomAxiosError>(
  async ({ username, password, }) => {
    try {
      const response = await api.post('/auth/signup', {
        name: username,
        password,
      });
  
      return response.data;
    } catch (err) {
      throw err;
    }
  }
);

export const checkAuthFx = createEffect<void, AuthResponse, CustomAxiosError>(
  async () => {
    try {
      const response = await api.get('/auth/validate');
      return response.data;
    } catch (err) {
      throw err;
    }
  }
);

export const logoutFx = createEffect<void, void, CustomAxiosError>(
  async () => {
    try {
      await api.post('/auth/logout');
    } finally {
      localStorage.removeItem('user');
    }
  }
);

export const $isAuthenticated = createStore<boolean>(false)
  .on(checkAuthFx.done, () => true)
  .on(loginFx.done, () => true)
  .on(restoreUserFromStorage, () => true)
  .on(logoutFx.done, () => false);

export const $authChecked = createStore<boolean>(false)
  .on(checkAuthFx.done, () => true)
  .on(loginFx.done, () => true)
  .on(restoreUserFromStorage, () => true)
  .on(logoutFx.done, () => false);

export const $user = createStore<User>({} as User)
  .on(loginFx.doneData, (_, data) => {
    const user = {
      username: data.user.Name,
      ID: data.user.ID,
    };
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  })
  .on(checkAuthFx.doneData, (_, data) => {
    const user = {
      username: data.user.Name,
      ID: data.user.ID,
    };
    localStorage.setItem('user', JSON.stringify(user));
    return user;
  })
  .on(restoreUserFromStorage, (_, user) => user)
  .on(logoutFx.done, () => ({} as User));

$loginPending
  .on([loginFx.pending, checkAuthFx.pending], (_, pending) => pending);

$loginError
  .on(loginFx.fail, (_, { error }) => ({
    isError: true,
    message: error.response?.data?.message || 'Ошибка при входе',
  }))
  .reset([loginFormSubmitted, resetLoginError]);

$registerPending
  .on(registerFx.pending, (_, pending) => pending);

$registerError
  .on(registerFx.fail, (_, { error }) => ({
    isError: true,
    message: error.response?.data?.message || 'Ошибка при регистрации',
  }))
  .reset([registerFormSubmitted]);

sample({
  clock: loginFormSubmitted,
  target: loginFx
});

sample({
  clock: checkAuth,
  target: checkAuthFx
});

sample({
  clock: logout,
  target: logoutFx
});

sample({
  clock: registerFx.done,
  fn: ({ params }) => ({ username: params.username, password: params.password }),
  target: loginFx
});

sample({
  clock: registerFormSubmitted,
  target: registerFx
});