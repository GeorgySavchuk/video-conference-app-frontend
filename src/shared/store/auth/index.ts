import { createEffect, createStore, createEvent, sample } from 'effector';
import { AxiosError } from 'axios';
import { api } from '@/shared/lib/api';
import { AuthResponse, User } from '@/shared/types';

type AuthParams = {
  username: string;
  password: string;
};

type ApiErrorResponse = {
  error?: string;
  message?: string;
}

interface CustomAxiosError extends AxiosError<ApiErrorResponse> {}

export const loginFormSubmitted = createEvent<AuthParams>();
export const registerFormSubmitted = createEvent<AuthParams>();
export const resetLoginError = createEvent();
export const checkAuth = createEvent();
export const logout = createEvent(); 

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

export const $isAuthenticated = createStore<boolean>(false);
export const $authChecked = createStore<boolean>(false); 

export const $user = createStore<User>({} as User)

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
    await api.post('/auth/logout');
  }
);

$loginPending
  .on([loginFx.pending, checkAuthFx.pending], (_, pending) => pending);

$loginError
  .on(loginFx.failData, (_, error) => ({
    isError: true,
    message: error.response?.data?.error || 
            error.response?.data?.message || 
            error.message || 
            'Ошибка авторизации'
  }))
  .reset([resetLoginError, loginFx.done, logout]);

$registerPending
  .on(registerFx.pending, (_, pending) => pending);

$registerError
  .on(registerFx.failData, (_, error) => ({
    isError: true,
    message: error.response?.data?.error || 
            error.response?.data?.message || 
            error.message || 
            'Ошибка регистрации'
  }))
  .reset([registerFx.done, registerFormSubmitted]);

$isAuthenticated
  .on(checkAuthFx.done, () => true)
  .on(loginFx.done, () => true)
  .on([logoutFx.done], () => false)
  .reset(logout);

$authChecked
  .on(checkAuthFx.done, () => true)
  .on(loginFx.done, () => true)
  .reset(logout);

$user
  .on(loginFx.doneData, (_, data) => ({
    username: data.user.Name,
    ID: data.user.ID,
  }))
  .on(checkAuthFx.doneData, (_, data) => ({
    username: data.user.Name,
    ID: data.user.ID,
  }))
  .reset(logout)

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