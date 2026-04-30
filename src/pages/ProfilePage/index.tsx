'use client';

import React, { useEffect, useState } from 'react';
import { useUnit } from 'effector-react';
import { useRouter } from 'next/navigation';
import { AxiosError } from 'axios';
import {
  $avatarImageNonce,
  $user,
  checkAuth,
  logoutFx,
  updateProfileNameFx,
} from '@/shared/store/auth';
import { Button } from '@/shared/ui/button';
import { Input } from '@/shared/ui/input';
import { UserAvatarDisplay } from '@/shared/ui/user-avatar';
import { AvatarPickerDialog } from '@/pages/ProfilePage/AvatarPickerDialog';
import { cn } from '@/shared/lib/utils';

const INPUT_SHELL =
  'h-11 rounded-xl border border-white/10 bg-dark-1 text-white shadow-inner placeholder:text-zinc-500 focus-visible:border-[#0E78F9]/70 focus-visible:ring-2 focus-visible:ring-[#0E78F9]/25 md:text-sm';

const PROFILE_CARD_SHELL = cn(
  'isolate overflow-hidden rounded-2xl border border-white/[0.07]',
  'bg-[#12151f]/85 shadow-[0_24px_80px_-12px_rgba(0,0,0,0.55)] backdrop-blur-xl',
  'ring-1 ring-inset ring-white/[0.04]'
);

function apiErrorMessage(err: unknown): string {
  const ax = err as AxiosError<{ error?: string; message?: string }>;
  return (
    ax.response?.data?.error ??
    ax.response?.data?.message ??
    'Что-то пошло не так. Попробуйте позже.'
  );
}

function formatRegistrationDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  try {
    return new Intl.DateTimeFormat('ru-RU', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    }).format(d);
  } catch {
    return iso;
  }
}

const ProfilePage = () => {
  const router = useRouter();
  const [user, logout, saveName, namePending, avatarNonce] = useUnit([
    $user,
    logoutFx,
    updateProfileNameFx,
    updateProfileNameFx.pending,
    $avatarImageNonce,
  ]);

  const [nameDraft, setNameDraft] = useState('');
  const [nameError, setNameError] = useState<string | null>(null);
  const [avatarOpen, setAvatarOpen] = useState(false);

  useEffect(() => {
    setNameDraft(user.username?.trim() ?? '');
  }, [user.username]);

  useEffect(() => {
    checkAuth();
  }, []);

  const name = user?.username?.trim() || 'Пользователь';

  const onLogout = () => {
    logout();
    router.push('/sign-in');
  };

  const onSaveName = async () => {
    setNameError(null);
    const next = nameDraft.trim();
    if (next.length < 2) {
      setNameError('Минимум 2 символа.');
      return;
    }
    if (next === user.username?.trim()) return;
    try {
      await saveName(next);
    } catch (e) {
      setNameError(apiErrorMessage(e));
    }
  };

  const nameDirty = nameDraft.trim() !== (user.username?.trim() ?? '');

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-10 text-white">
      <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">Личный кабинет</h1>

      <AvatarPickerDialog user={user} open={avatarOpen} onOpenChange={setAvatarOpen} />

      <div className={cn(PROFILE_CARD_SHELL, 'p-6 sm:p-8')}>
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:gap-12">
          <button
            type="button"
            title="Изменить аватар"
            onClick={() => setAvatarOpen(true)}
            className="shrink-0 cursor-pointer rounded-full border-0 bg-transparent p-0 text-left transition hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#0E78F9]/70 focus-visible:ring-offset-2 focus-visible:ring-offset-[#12151f]"
          >
            <UserAvatarDisplay
              avatar={user.avatar}
              displayName={name}
              imageNonce={avatarNonce}
              className="pointer-events-none h-36 w-36 sm:h-44 sm:w-44"
              fallbackClassName="text-4xl sm:text-5xl"
            />
          </button>

          <div className="min-w-0 flex-1 space-y-6">
            <div>
              <p className="text-sm font-medium text-zinc-500">Никнейм</p>
              <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center">
                <Input
                  value={nameDraft}
                  onChange={(e) => {
                    setNameDraft(e.target.value);
                    setNameError(null);
                  }}
                  maxLength={40}
                  className={cn(INPUT_SHELL, 'w-full sm:max-w-xs')}
                  placeholder="Ваш никнейм"
                  autoComplete="username"
                />
                <Button
                  type="button"
                  disabled={namePending || !nameDirty}
                  onClick={onSaveName}
                  className="h-11 shrink-0 rounded-2xl border-0 bg-blue-1 px-5 text-base font-semibold text-white shadow-[0_8px_24px_-4px_rgba(14,120,249,0.45)] hover:brightness-110 disabled:opacity-40"
                >
                  {namePending ? 'Сохранение…' : 'Сохранить имя'}
                </Button>
              </div>
              {nameError ? (
                <p className="mt-2 text-sm text-red-400" role="alert">
                  {nameError}
                </p>
              ) : null}
            </div>

            <div>
              <p className="text-sm font-medium text-zinc-500">Email</p>
              {user.email ? (
                <p className="mt-2 break-all text-sm text-zinc-300">{user.email}</p>
              ) : (
                <p className="mt-2 text-sm text-zinc-500">Не указан</p>
              )}
            </div>

            {user.createdAt ? (
              <div>
                <p className="text-sm font-medium text-zinc-500">Дата регистрации</p>
                <p className="mt-2 text-sm text-zinc-300">{formatRegistrationDate(user.createdAt)}</p>
              </div>
            ) : null}

            <div>
              <p className="text-sm font-medium text-zinc-500">Аватар</p>
              <p className="mt-1.5 max-w-xl text-xs leading-relaxed text-zinc-500">
                Выберите пресет или загрузите фото (JPEG, PNG или WebP, до 2 МБ). Можно нажать на фото слева или
                на кнопку ниже.
              </p>
              <Button
                type="button"
                variant="outline"
                className="mt-3 h-11 rounded-xl border-white/[0.12] bg-white/[0.04] text-[15px] text-white hover:bg-white/[0.09]"
                onClick={() => setAvatarOpen(true)}
              >
                Изменить аватар
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 flex flex-wrap gap-3 border-t border-white/[0.08] pt-6">
          <Button
            type="button"
            variant="outline"
            className="h-11 rounded-xl border-white/[0.12] bg-white/[0.04] text-[15px] text-white hover:bg-white/[0.09]"
            onClick={() => router.push('/upcoming')}
          >
            Мои встречи
          </Button>
          <Button
            type="button"
            variant="destructive"
            className="h-11 rounded-xl"
            onClick={onLogout}
          >
            Выйти из аккаунта
          </Button>
        </div>
      </div>
    </section>
  );
};

export default ProfilePage;
