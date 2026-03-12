import client from './client';
import type { Submission, Media } from '../types';

export const getPublicSubmission = (token: string) =>
  client.get<Submission>(`/public/esign/${token}`).then((r) => r.data);

export const submitSigning = (token: string, fieldValues: { template_field_id: number; value: string }[]) =>
  client.post(`/public/esign/${token}`, { field_values: fieldValues }).then((r) => r.data);

export const getAttachments = (token: string) =>
  client.get<Media[]>(`/public/esign/${token}/attachments`).then((r) => r.data);

export const uploadAttachment = (token: string, file: File) => {
  const formData = new FormData();
  formData.append('file', file);
  return client.post<Media>(`/public/esign/${token}/attachments`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const deleteAttachment = (token: string, mediaId: number) =>
  client.delete(`/public/esign/${token}/attachments/${mediaId}`).then((r) => r.data);

export const getPortal = (token: string) =>
  client.get<Submission[]>(`/portal/${token}`).then((r) => r.data);
