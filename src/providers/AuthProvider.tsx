'use client'
import { useEffect } from 'react';
import { useUnit } from 'effector-react';
import { 
  $authChecked, 
  $isAuthenticated, 
  checkAuth,
  restoreUserFromStorage,
} from '@/shared/store/auth';
import {usePathname, useRouter} from 'next/navigation';
import { CircularProgress } from '@mui/material';
import { safeRedirectPath } from '@/shared/lib/safeRedirectPath';

type AuthProviderProps = {
  children: React.ReactNode;
}

export const AuthProvider = ({ 
  children, 
}: AuthProviderProps) => {
  const [authChecked, isAuthenticated, _checkAuth, _restoreUser] = useUnit([
    $authChecked, 
    $isAuthenticated, 
    checkAuth,
    restoreUserFromStorage
  ]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const storedUser = localStorage.getItem('user');
      if (storedUser) {
        _restoreUser(JSON.parse(storedUser));
      }
      /** Всегда подтягиваем юзера с сервера (avatar после регистрации / миграции, ник и т.д.). */
      _checkAuth();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!isAuthenticated || (pathname !== '/sign-in' && pathname !== '/sign-up')) return;
    if (typeof window === 'undefined') return;
    const raw = new URLSearchParams(window.location.search).get('next');
    const next = safeRedirectPath(raw);
    router.replace(next ?? '/');
  }, [isAuthenticated, router, pathname]);

  const allowBeforeAuth =
    pathname === '/sign-in' ||
    pathname === '/sign-up' ||
    (pathname != null && pathname.startsWith('/room/'));

  if (!authChecked && !allowBeforeAuth) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  return <>{children}</>;
};