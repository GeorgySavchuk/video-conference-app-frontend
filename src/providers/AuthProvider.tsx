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
      } else {
        _checkAuth();
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if(isAuthenticated && (pathname === '/sign-in' || pathname === '/sign-up')) {
      router.push("/")
    }
  }, [authChecked, isAuthenticated, router, pathname]);

  if (!authChecked && !(pathname === '/sign-in' || pathname === '/sign-up')) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  return <>{children}</>;
};