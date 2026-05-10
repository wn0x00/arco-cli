import axios from 'axios';

/**
 * Shared axios instance. The dev server's `mock/` plugin intercepts /api/*
 * during development. In production, point this at your real backend by
 * setting `VITE_API_BASE_URL` (or hard-coding the URL).
 *
 * When you wire up authentication later (e.g. via `arco add auth`), this
 * is where the request/response interceptors will live — uncomment the
 * stubs below as a starting point.
 */
export const request = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL ?? '/api',
  timeout: 15_000,
  withCredentials: true,
});

// request.interceptors.request.use((config) => {
//   const token = readAccessToken();
//   if (token) config.headers.Authorization = `Bearer ${token}`;
//   return config;
// });
//
// request.interceptors.response.use(
//   (response) => response,
//   async (error) => {
//     if (error.response?.status === 401) {
//       window.location.href = '/login';
//     }
//     return Promise.reject(error);
//   }
// );
