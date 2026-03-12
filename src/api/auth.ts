import client from './client';
import type { User } from '../types';

interface LoginResponse {
  token: string;
  user: User;
}

export const login = (email: string, password: string) =>
  client.post<LoginResponse>('/auth/login', { email, password }).then((r) => r.data);

export const logout = () =>
  client.post('/auth/logout').then((r) => r.data);

export const me = () =>
  client.get<User>('/auth/me').then((r) => r.data);
