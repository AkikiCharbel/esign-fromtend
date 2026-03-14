import client from './client';
import type { Tenant, Member, WorkspaceInvitation } from '../types';

export const getWorkspace = () =>
  client.get<{ data: Tenant }>('/workspace').then((r) => r.data.data);

export const updateWorkspace = (data: {
  name?: string;
  slug?: string;
  settings?: Record<string, unknown>;
}) =>
  client.patch<{ data: Tenant }>('/workspace', data).then((r) => r.data.data);

export const uploadLogo = (file: File) => {
  const form = new FormData();
  form.append('logo', file);
  return client
    .post<{ logo_url: string | null }>('/workspace/logo', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    .then((r) => r.data);
};

export const deleteLogo = () =>
  client.delete('/workspace/logo');

export const getMembers = () =>
  client.get<{ data: Member[] }>('/workspace/members').then((r) => r.data.data);

export const updateMemberRole = (memberId: number, role: string) =>
  client.patch<{ data: Member }>(`/workspace/members/${memberId}`, { role }).then((r) => r.data.data);

export const removeMember = (memberId: number) =>
  client.delete(`/workspace/members/${memberId}`);

export const getInvitations = () =>
  client.get<{ data: WorkspaceInvitation[] }>('/workspace/invitations').then((r) => r.data.data);

export const createInvitation = (data: { email: string; role: string }) =>
  client.post<{ data: WorkspaceInvitation }>('/workspace/invitations', data).then((r) => r.data.data);

export const cancelInvitation = (invitationId: number) =>
  client.delete(`/workspace/invitations/${invitationId}`);
