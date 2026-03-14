import client from './client';
import type { Template, TemplateField } from '../types';

export const getTemplates = () =>
  client.get('/templates').then((r) => {
    const payload = r.data;
    return (Array.isArray(payload) ? payload : payload.data) as Template[];
  });

export const getTemplate = (id: number) =>
  client.get<{ data: Template }>(`/templates/${id}`).then((r) => r.data.data);

export const createTemplate = (data: { name: string; description?: string }) =>
  client.post<{ data: Template }>('/templates', data).then((r) => r.data.data);

export const updateTemplate = (id: number, data: { name?: string; description?: string; status?: string }) =>
  client.patch<{ data: Template }>(`/templates/${id}`, data).then((r) => r.data.data);

export const deleteTemplate = (id: number) =>
  client.delete(`/templates/${id}`).then((r) => r.data);

export const uploadPdf = (id: number, file: File) => {
  const formData = new FormData();
  formData.append('pdf', file);
  return client.post<Template>(`/templates/${id}/pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

type SyncFieldPayload = Omit<TemplateField, 'id' | 'template_id' | 'created_at' | 'updated_at'> & { id?: number };

export const syncFields = (id: number, fields: SyncFieldPayload[]) =>
  client.put<{ data: TemplateField[] }>(`/templates/${id}/fields/sync`, { fields }).then((r) => r.data.data);
