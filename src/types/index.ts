export interface Tenant {
  id: number;
  name: string;
  slug: string;
  settings: Record<string, unknown> | null;
  created_at: string;
  updated_at: string;
}

export interface User {
  id: number;
  name: string;
  email: string;
  tenant_id: number;
  roles: string[];
}

export interface Template {
  id: number;
  tenant_id: number;
  created_by: number;
  name: string;
  description: string | null;
  page_count: number;
  status: string;
  pdf_url: string | null;
  fields?: TemplateField[];
  created_at: string;
  updated_at: string;
}

export interface TemplateField {
  id: number;
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
  created_at: string;
  updated_at: string;
}

export type FieldType =
  | 'signature'
  | 'initials'
  | 'text'
  | 'date'
  | 'checkbox'
  | 'radio'
  | 'dropdown';

export interface Document {
  id: number;
  tenant_id: number;
  template_id: number;
  created_by: number;
  name: string;
  custom_message: string | null;
  reply_to_email: string | null;
  reply_to_name: string | null;
  has_attachments: boolean;
  attachment_instructions: string | null;
  template?: Template;
  signers?: DocumentSigner[];
  created_at: string;
  updated_at: string;
}

export interface DocumentSigner {
  id: number;
  document_id: number;
  name: string;
  email: string;
  role: string;
  sign_order: number;
  status: string;
  created_at: string;
  updated_at: string;
}

export interface Submission {
  id: number;
  tenant_id: number;
  document_id: number;
  recipient_name: string;
  recipient_email: string;
  status: string;
  token: string;
  ip_address: string | null;
  user_agent: string | null;
  sent_at: string | null;
  viewed_at: string | null;
  signed_at: string | null;
  expires_at: string | null;
  document?: Document;
  field_values?: SubmissionFieldValue[];
  audit_logs?: AuditLog[];
  created_at: string;
  updated_at: string;
}

export interface SubmissionFieldValue {
  id: number;
  submission_id: number;
  template_field_id: number;
  value: string;
  created_at: string;
  updated_at: string;
}

export interface AuditLog {
  id: number;
  submission_id: number;
  event: string;
  metadata: Record<string, unknown> | null;
  ip: string | null;
  created_at: string;
}

export interface Media {
  id: number;
  name: string;
  file_name: string;
  mime_type: string;
  size: number;
  url: string;
  created_at: string;
  updated_at: string;
}
