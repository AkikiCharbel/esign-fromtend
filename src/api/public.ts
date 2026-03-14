import { publicClient } from './client';
import type { Submission, Media } from '../types';

export const getPublicSubmission = (token: string) =>
  publicClient.get<{ data: Submission }>(`/public/esign/${token}`).then((r) => {
    const payload = r.data;
    // Handle both wrapped { data: ... } and unwrapped responses
    return (payload && typeof payload === 'object' && 'data' in payload) ? payload.data : payload as unknown as Submission;
  });

export const submitSigning = (token: string, fieldValues: { template_field_id: number; value: string }[]) =>
  publicClient.post(`/public/esign/${token}`, { field_values: fieldValues }).then((r) => r.data);

export const getAttachments = (token: string) =>
  publicClient.get<Media[]>(`/public/esign/${token}/attachments`).then((r) => r.data);

export const uploadAttachment = (token: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return publicClient.post<Media>(`/public/esign/${token}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const deleteAttachment = (token: string, mediaId: number) =>
  publicClient.delete(`/public/esign/${token}/attachments/${mediaId}`).then((r) => r.data);

interface PortalResponse {
  recipient_name: string;
  recipient_email: string;
  submissions: Submission[];
}

export const getPortal = (token: string) =>
  publicClient.get<PortalResponse>(`/portal/${token}`).then((r) => r.data);
