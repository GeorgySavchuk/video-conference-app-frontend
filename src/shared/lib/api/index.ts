import axios from 'axios';

const baseURL = process.env.NEXT_PUBLIC_API_URL;

export const api = axios.create({
    baseURL,
    headers: {
      'Content-Type': 'application/json',
    },
    withCredentials: true
});

api.interceptors.response.use(
  response => response,
  async error => {
    const isAuthPage = window.location.href.includes('/sign-in') || window.location.href.includes('/sign-up');
    if (error.response?.status === 401 && !isAuthPage) {
      window.location.href = '/sign-in';
    }
    return Promise.reject(error);
  }
);