'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUnit } from 'effector-react';
import { CircularProgress } from '@mui/material';
import { $authChecked, $isAuthenticated } from '@/shared/store/auth';

/**
 * Ограничивает раздел личного кабинета (главная, профиль, расписание): только для залогиненных.
 * Страницы встречи `/room/…` в другой группе маршрутов и сюда не попадают.
 */
export function HomeAccessGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [authChecked, isAuthenticated] = useUnit([$authChecked, $isAuthenticated]);

  useEffect(() => {
    if (!authChecked || isAuthenticated) return;
    router.replace('/sign-in');
  }, [authChecked, isAuthenticated, router]);

  if (!authChecked) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-dark-2">
        <CircularProgress />
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-2 bg-dark-2 text-sm text-zinc-400">
        <CircularProgress size={28} />
        <span>Нужен вход в аккаунт</span>
      </div>
    );
  }

  return <>{children}</>;
}
