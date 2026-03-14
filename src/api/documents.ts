import client from './client';
import type { Document, DocumentSigner } from '../types';

export const getDocuments = () =>
  client.get('/documents').then((r) => {
    const payload = r.data;
    return (Array.isArray(payload) ? payload : payload.data) as Document[];
  });

export const getDocument = (id: number) =>
  client.get<{ data: Document }>(`/documents/${id}`).then((r) => r.data.data);

export const createDocument = (data: {
  template_id: number;
  name: string;
  custom_message?: string;
  reply_to_email?: string;
  reply_to_name?: string;
  has_attachments?: boolean;
  attachment_instructions?: string;
}) =>
  client.post<{ data: Document }>('/documents', data).then((r) => r.data.data);

export const deleteDocument = (id: number) =>
  client.delete(`/documents/${id}`).then((r) => r.data);

export const addSigner = (documentId: number, data: {
  name: string;
  email: string;
  role: string;
  sign_order: number;
}) =>
  client.post<{ data: DocumentSigner }>(`/documents/${documentId}/signers`, data).then((r) => r.data.data);

export const removeSigner = (signerId: number) =>
  client.delete(`/signers/${signerId}`).then((r) => r.data);
