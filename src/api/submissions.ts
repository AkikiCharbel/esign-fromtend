import client from './client';
import type { Submission } from '../types';

export const getSubmissions = (filters?: { status?: string; search?: string }): Promise<Submission[]> =>
  client.get<{ data: Submission[] } | Submission[]>('/submissions', { params: filters }).then((r) => {
    const payload = r.data;
    return Array.isArray(payload) ? payload : payload.data;
  });

export const getSubmission = (id: number) =>
  client.get<{ data: Submission }>(`/submissions/${id}`).then((r) => r.data.data);

export const createSubmission = (data: { document_id: number; recipient_name?: string; recipient_email?: string }) =>
  client.post<{ data: Submission }>('/submissions', data).then((r) => r.data.data);

export const resendSubmission = (id: number) =>
  client.post(`/submissions/${id}/resend`).then((r) => r.data);

export const bulkSend = (data: { document_id: number; recipients: { name: string; email: string }[] }) =>
  client.post('/submissions/bulk', data).then((r) => r.data);

export const getSubmissionDownloadUrl = (id: number): string =>
  `${client.defaults.baseURL}/submissions/${id}/download`;
