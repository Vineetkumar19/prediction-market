/**
 * notificationService.js
 *
 * Backend contract:
 *   GET  /api/notifications           -> Notification[]
 *   POST /api/notifications/read-all
 */

import http from './client';

export const fetchNotifications = () => http.get('/notifications');

export const markAllRead = () => http.post('/notifications/read-all');
