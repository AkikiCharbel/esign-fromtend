import { create } from 'zustand';
import type { TemplateField, FieldType } from '../types';

export interface BuilderField {
  id: string;
  template_id: number;
  page: number;
  type: FieldType;
  label: string;
  required: boolean;
  x: number;
  y: number;
  width: number;
  height: number;
  font_size: number;
  multiline: boolean;
  options: string[] | null;
  signer_role: string;
  order: number;
}

interface BuilderState {
  fields: BuilderField[];
  selectedFieldId: string | null;
  addField: (field: BuilderField) => void;
  updateField: (id: string, updates: Partial<BuilderField>) => void;
  removeField: (id: string) => void;
  setSelected: (id: string | null) => void;
  setFields: (fields: BuilderField[]) => void;
  clearFields: () => void;
}

export const useBuilderStore = create<BuilderState>()((set) => ({
  fields: [],
  selectedFieldId: null,
  addField: (field) =>
    set((state) => ({ fields: [...state.fields, field] })),
  updateField: (id, updates) =>
    set((state) => ({
      fields: state.fields.map((f) => (f.id === id ? { ...f, ...updates } : f)),
    })),
  removeField: (id) =>
    set((state) => ({
      fields: state.fields.filter((f) => f.id !== id),
      selectedFieldId: state.selectedFieldId === id ? null : state.selectedFieldId,
    })),
  setSelected: (id) => set({ selectedFieldId: id }),
  setFields: (fields) => set({ fields }),
  clearFields: () => set({ fields: [], selectedFieldId: null }),
}));

export function templateFieldToBuilderField(field: TemplateField): BuilderField {
  return {
    id: String(field.id),
    template_id: field.template_id,
    page: field.page,
    type: field.type,
    label: field.label,
    required: field.required,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    font_size: field.font_size,
    multiline: field.multiline,
    options: field.options,
    signer_role: field.signer_role,
    order: field.order,
  };
}

export function builderFieldToSync(field: BuilderField) {
  return {
    page: field.page,
    type: field.type,
    label: field.label,
    required: field.required,
    x: field.x,
    y: field.y,
    width: field.width,
    height: field.height,
    font_size: field.font_size,
    multiline: field.multiline,
    options: field.options,
    signer_role: field.signer_role,
    order: field.order,
  };
}
