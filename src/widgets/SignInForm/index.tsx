'use client';

import React from 'react';
import { Controller, useForm, SubmitHandler } from 'react-hook-form';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useUnit } from 'effector-react';
import { $loginError, $loginPending, loginFormSubmitted, resetLoginError } from '@/shared/store/auth';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';
import { AuthFormShell } from '@/widgets/AuthFormShell';

const INPUT_SHELL =
  'h-11 rounded-xl border border-white/10 bg-dark-1 text-white shadow-inner placeholder:text-zinc-500 focus-visible:border-[#0E78F9]/70 focus-visible:ring-2 focus-visible:ring-[#0E78F9]/25 md:text-sm';

type LoginFormValues = {
  username: string;
  password: string;
};

const SignInForm = () => {
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<LoginFormValues>({
    defaultValues: {
      username: '',
      password: '',
    },
  });

  const [loading, loginError, login] = useUnit([$loginPending, $loginError, loginFormSubmitted]);

  const confirmLogin: SubmitHandler<LoginFormValues> = ({ username, password }) => {
    resetLoginError();
    login({ username, password });
  };

  return (
    <AuthFormShell title="Вход">
      <form className="space-y-5" onSubmit={handleSubmit(confirmLogin)} noValidate>
        <div className="space-y-2">
          <label htmlFor="signin-username" className="text-sm text-zinc-400">
            Логин
          </label>
          <Controller
            name="username"
            control={control}
            rules={{
              required: 'Данное поле обязательно',
              pattern: {
                value: /^[a-zA-Z0-9_-]+$/,
                message: 'Некорректный логин',
              },
              minLength: { value: 3, message: 'Логин должен содержать минимум 3 символа' },
              maxLength: { value: 16, message: 'Логин не должен превышать 16 символов' },
            }}
            render={({ field }) => (
              <Input
                {...field}
                id="signin-username"
                type="text"
                autoComplete="username"
                aria-invalid={Boolean(errors.username)}
                className={cn(
                  INPUT_SHELL,
                  errors.username && 'border-red-500/80 focus-visible:border-red-500/80 focus-visible:ring-red-500/25'
                )}
              />
            )}
          />
          {errors.username?.message ? (
            <p className="text-xs text-red-400">{errors.username.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="signin-password" className="text-sm text-zinc-400">
            Пароль
          </label>
          <Controller
            name="password"
            control={control}
            rules={{
              required: 'Данное поле обязательно',
              minLength: { value: 3, message: 'Пароль должен содержать минимум 3 символа' },
              maxLength: { value: 20, message: 'Пароль не должен превышать 20 символов' },
            }}
            render={({ field }) => (
              <Input
                {...field}
                id="signin-password"
                type="password"
                autoComplete="current-password"
                aria-invalid={Boolean(errors.password)}
                className={cn(
                  INPUT_SHELL,
                  errors.password && 'border-red-500/80 focus-visible:border-red-500/80 focus-visible:ring-red-500/25'
                )}
              />
            )}
          />
          {errors.password?.message ? (
            <p className="text-xs text-red-400">{errors.password.message}</p>
          ) : null}
        </div>

        {loginError.isError ? (
          <div className="rounded-xl border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm leading-snug text-red-100">
            {loginError.message}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110 disabled:opacity-40"
        >
          {loading ? <Loader2 className="mx-auto size-5 animate-spin" aria-hidden /> : 'Войти'}
        </Button>

        <p className="text-center text-sm text-zinc-500">
          Нет аккаунта?{' '}
          <Link
            href="/sign-up"
            className="font-medium text-[#7eb8fc] underline-offset-4 hover:text-white hover:underline"
          >
            Зарегистрироваться
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
};

export default SignInForm;
