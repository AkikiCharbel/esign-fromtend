import client from './client';
import type { Submission } from '../types';

export const getSubmissions = (filters?: { status?: string; search?: string }) =>
  client.get<Submission[]>('/submissions', { params: filters }).then((r) => r.data);

export const getSubmission = (id: number) =>
  client.get<Submission>(`/submissions/${id}`).then((r) => r.data);

export const createSubmission = (data: { document_id: number }) =>
  client.post<Submission>('/submissions', data).then((r) => r.data);

export const resendSubmission = (id: number) =>
  client.post(`/submissions/${id}/resend`).then((r) => r.data);

export const bulkSend = (data: { document_id: number; recipients: { name: string; email: string }[] }) =>
  client.post('/submissions/bulk', data).then((r) => r.data);
