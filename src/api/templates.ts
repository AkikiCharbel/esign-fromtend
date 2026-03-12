import client from './client';
import type { Template, TemplateField } from '../types';

export const getTemplates = () =>
  client.get<Template[]>('/templates').then((r) => r.data);

export const getTemplate = (id: number) =>
  client.get<Template>(`/templates/${id}`).then((r) => r.data);

export const createTemplate = (data: { name: string; description?: string }) =>
  client.post<Template>('/templates', data).then((r) => r.data);

export const updateTemplate = (id: number, data: { name?: string; description?: string; status?: string }) =>
  client.patch<Template>(`/templates/${id}`, data).then((r) => r.data);

export const deleteTemplate = (id: number) =>
  client.delete(`/templates/${id}`).then((r) => r.data);

export const uploadPdf = (id: number, file: File) => {
  const formData = new FormData();
  formData.append('pdf', file);
  return client.post<Template>(`/templates/${id}/pdf`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  }).then((r) => r.data);
};

export const syncFields = (id: number, fields: Omit<TemplateField, 'id' | 'template_id' | 'created_at' | 'updated_at'>[]) =>
  client.put(`/templates/${id}/fields/sync`, { fields }).then((r) => r.data);
