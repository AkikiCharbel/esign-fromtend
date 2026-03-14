import client, { publicClient } from './client';
import type { User, Tenant, InvitationPreview } from '../types';

interface AuthResponse {
  token: string;
  user: User;
  tenant?: Tenant;
}

export const login = (email: string, password: string) =>
  publicClient.post<AuthResponse>('/auth/login', { email, password }).then((r) => r.data);

export const logout = () =>
  client.post('/auth/logout').then((r) => r.data);

export const me = () =>
  client.get<User>('/auth/me').then((r) => r.data);

export const register = (data: {
  workspace_name: string;
  workspace_slug: string;
  name: string;
  email: string;
  password: string;
  password_confirmation: string;
}) =>
  publicClient.post<AuthResponse>('/auth/register', data).then((r) => r.data);

export const getInvitationPreview = (token: string) =>
  publicClient.get<InvitationPreview>(`/auth/invitation/${token}`).then((r) => r.data);

export const acceptInvitation = (data: {
  token: string;
  name: string;
  password: string;
  password_confirmation: string;
}) =>
  publicClient.post<AuthResponse>('/auth/accept-invitation', data).then((r) => r.data);
