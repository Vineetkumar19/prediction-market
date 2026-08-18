/**
 * authService.js
 * Login, registration and session.
 *
 * There is deliberately no change-password or reset endpoint. If a player
 * loses their credentials they must register a new account - that is the
 * agreed rule for this project.
 *
 * Backend contract:
 *   POST /api/auth/login     { userId, password }        -> { token, user }
 *   POST /api/auth/register  { name, userId, password }  -> { token, user }
 *   GET  /api/auth/me                                    -> user
 */

import http from './client';

export const login = (userId, password) =>
  http.post('/auth/login', { userId: String(userId).trim(), password });

export const register = ({ name, userId, password }) =>
  http.post('/auth/register', {
    name: String(name).trim(),
    userId: String(userId).trim(),
    password,
  });

export const fetchCurrentUser = () => http.get('/auth/me');
