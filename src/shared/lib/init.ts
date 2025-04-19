import { restoreUserFromStorage } from '@/shared/store/auth';

export const initApp = () => {
  if (typeof window !== 'undefined') {
    const storedUser = localStorage.getItem('user');
    if (storedUser) {
      restoreUserFromStorage(JSON.parse(storedUser));
    }
  }
}; 