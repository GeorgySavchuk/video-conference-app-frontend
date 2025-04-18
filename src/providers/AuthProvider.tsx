'use client'
import { useEffect, useMemo } from 'react';
import { useUnit } from 'effector-react';
import { 
  $authChecked, 
  $isAuthenticated, 
  checkAuth,
} from '@/shared/store/auth';
import {usePathname, useRouter} from 'next/navigation';
import { CircularProgress } from '@mui/material';

type AuthProviderProps = {
  children: React.ReactNode;
}

export const AuthProvider = ({ 
  children, 
}: AuthProviderProps) => {
  const [authChecked, isAuthenticated, _checkAuth] = useUnit([$authChecked, $isAuthenticated, checkAuth]);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    _checkAuth();
  }, []);

  useEffect(() => {
    if(isAuthenticated) {
      router.push("/")
    }
  }, [authChecked, isAuthenticated]);

  if (!authChecked && !(pathname === '/sign-in' || pathname === '/sign-up')) {
    return (
      <div className="flex justify-center items-center h-screen">
        <CircularProgress />
      </div>
    );
  }

  return <>{children}</>;
};