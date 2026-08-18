/**
 * client.js
 * The single HTTP entry point for the whole app.
 *
 * The in-browser mock backend that used to live in src/api/mock is gone. It
 * existed to demo the UI before the Spring Boot backend was written, and once
 * the real backend arrived it became a second, silently diverging copy of the
 * money rules - it still implemented the old winner-takes-all settlement long
 * after the real one moved to point settlement. A stale mock that quietly
 * disagrees with the server about who gets paid is worse than no mock, so it
 * was deleted rather than maintained twice.
 */

import axios from 'axios';
import { API_BASE_URL, STORAGE_KEYS } from '../utils/constants';

/* ---- Token storage -------------------------------------------------------- */

export function getToken() {
  try {
    return localStorage.getItem(STORAGE_KEYS.token);
  } catch {
    return null;
  }
}

export function setToken(token) {
  try {
    if (token) localStorage.setItem(STORAGE_KEYS.token, token);
    else localStorage.removeItem(STORAGE_KEYS.token);
  } catch {
    /* storage disabled (private mode) - the app still works for this session */
  }
}

/* ---- Axios instance ------------------------------------------------------- */

const axiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 20000,
  headers: { 'Content-Type': 'application/json' },
});

/* Attach the JWT to every outgoing request. */
axiosInstance.interceptors.request.use((config) => {
  const token = getToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/**
 * Normalise every failure into an Error with a readable `.message`,
 * plus `.status` and `.data` for callers that need detail.
 */
axiosInstance.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const status = error.response?.status;
    const payload = error.response?.data;

    // The token expired or was rejected - drop it and let the app redirect.
    if (status === 401) {
      setToken(null);
      window.dispatchEvent(new CustomEvent('pms:unauthorised'));
    }

    const message =
      payload?.message ||
      payload?.error ||
      (status === 401
        ? 'Your session expired. Please log in again.'
        : status === 403
        ? 'You are not allowed to do that.'
        : status === 404
        ? 'Not found.'
        : status >= 500
        ? 'The server had a problem. Please try again.'
        : error.code === 'ECONNABORTED'
        ? 'The server took too long to respond.'
        : !error.response
        ? 'Cannot reach the server. Check your connection.'
        : 'Something went wrong.');

    const err = new Error(message);
    err.status = status;
    err.data = payload;
    return Promise.reject(err);
  }
);

/* ---- Public HTTP facade --------------------------------------------------- */

export const http = {
  get: (url, config) => axiosInstance.get(url, config),
  post: (url, body, config) => axiosInstance.post(url, body, config),
  put: (url, body, config) => axiosInstance.put(url, body, config),
  patch: (url, body, config) => axiosInstance.patch(url, body, config),
  delete: (url, config) => axiosInstance.delete(url, config),
};

export default http;
