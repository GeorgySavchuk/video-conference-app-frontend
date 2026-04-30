'use client';

import React from 'react';
import { Controller, useForm, SubmitHandler } from 'react-hook-form';
import Link from 'next/link';
import { Loader2 } from 'lucide-react';
import { useUnit } from 'effector-react';
import { $registerError, $registerPending, registerFormSubmitted } from '@/shared/store/auth';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { cn } from '@/shared/lib/utils';
import { AuthFormShell } from '@/widgets/AuthFormShell';

const INPUT_SHELL =
  'h-11 rounded-xl border border-white/10 bg-dark-1 text-white shadow-inner placeholder:text-zinc-500 focus-visible:border-[#0E78F9]/70 focus-visible:ring-2 focus-visible:ring-[#0E78F9]/25 md:text-sm';

interface RegistrationFormValues {
  username: string;
  email: string;
  password: string;
}

const SignUpForm = () => {
  const {
    handleSubmit,
    formState: { errors },
    control,
  } = useForm<RegistrationFormValues>({
    defaultValues: {
      username: '',
      email: '',
      password: '',
    },
  });

  const [loading, registrationError, register] = useUnit([
    $registerPending,
    $registerError,
    registerFormSubmitted,
  ]);

  const confirmRegistration: SubmitHandler<RegistrationFormValues> = ({ username, email, password }) => {
    register({ username, email, password });
  };

  return (
    <AuthFormShell title="Регистрация">
      <form className="space-y-5" onSubmit={handleSubmit(confirmRegistration)} noValidate>
        <div className="space-y-2">
          <label htmlFor="signup-username" className="text-sm text-zinc-400">
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
                id="signup-username"
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
          <label htmlFor="signup-email" className="text-sm text-zinc-400">
            Email
          </label>
          <Controller
            name="email"
            control={control}
            rules={{
              required: 'Укажите email',
              pattern: {
                value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                message: 'Некорректный email',
              },
            }}
            render={({ field }) => (
              <Input
                {...field}
                id="signup-email"
                type="email"
                autoComplete="email"
                aria-invalid={Boolean(errors.email)}
                className={cn(
                  INPUT_SHELL,
                  errors.email && 'border-red-500/80 focus-visible:border-red-500/80 focus-visible:ring-red-500/25'
                )}
              />
            )}
          />
          {errors.email?.message ? (
            <p className="text-xs text-red-400">{errors.email.message}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password" className="text-sm text-zinc-400">
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
                id="signup-password"
                type="password"
                autoComplete="new-password"
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

        {registrationError.isError ? (
          <div className="rounded-xl border border-red-500/35 bg-red-950/35 px-4 py-3 text-sm leading-snug text-red-100">
            {registrationError.message}
          </div>
        ) : null}

        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-2xl border-0 bg-blue-1 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110 disabled:opacity-40"
        >
          {loading ? (
            <Loader2 className="mx-auto size-5 animate-spin" aria-hidden />
          ) : (
            'Создать аккаунт'
          )}
        </Button>

        <p className="text-center text-sm text-zinc-500">
          Есть аккаунт?{' '}
          <Link
            href="/sign-in"
            className="font-medium text-[#7eb8fc] underline-offset-4 hover:text-white hover:underline"
          >
            Войти
          </Link>
        </p>
      </form>
    </AuthFormShell>
  );
};

export default SignUpForm;
