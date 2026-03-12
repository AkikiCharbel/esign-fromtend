import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getTemplates } from '../../api/templates';
import { createDocument, addSigner } from '../../api/documents';
import type { Template } from '../../types';

const detailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  custom_message: z.string().optional(),
  reply_to_email: z.string().email('Invalid email').optional().or(z.literal('')),
  reply_to_name: z.string().optional(),
  has_attachments: z.boolean(),
  attachment_instructions: z.string().optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;

const signerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.string().min(1, 'Role is required'),
});

type SignerForm = z.infer<typeof signerSchema>;

interface SignerEntry {
  name: string;
  email: string;
  role: string;
}

export default function DocumentCreate() {
  const navigate = useNavigate();
  const [step, setStep] = useState(1);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [signers, setSigners] = useState<SignerEntry[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const activeTemplates = templates?.filter((t) => t.status === 'active');

  const detailsForm = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { has_attachments: false },
  });

  const signerForm = useForm<SignerForm>({
    resolver: zodResolver(signerSchema),
  });

  const hasAttachments = detailsForm.watch('has_attachments');

  const createMutation = useMutation({
    mutationFn: async (details: DetailsForm) => {
      const doc = await createDocument({
        template_id: selectedTemplate!.id,
        name: details.name,
        custom_message: details.custom_message || undefined,
        reply_to_email: details.reply_to_email || undefined,
        reply_to_name: details.reply_to_name || undefined,
        has_attachments: details.has_attachments,
        attachment_instructions: details.attachment_instructions || undefined,
      });

      for (let i = 0; i < signers.length; i++) {
        await addSigner(doc.id, {
          name: signers[i].name,
          email: signers[i].email,
          role: signers[i].role,
          sign_order: i + 1,
        });
      }

      return doc;
    },
    onSuccess: (doc) => navigate(`/documents/${doc.id}`),
  });

  const handleDetailsSubmit = (data: DetailsForm) => {
    detailsForm.reset(data);
    setStep(3);
  };

  const handleAddSigner = (data: SignerForm) => {
    setSigners((prev) => [...prev, data]);
    signerForm.reset({ name: '', email: '', role: '' });
  };

  const handleRemoveSigner = (index: number) => {
    setSigners((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setSigners((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const handleCreate = () => {
    createMutation.mutate(detailsForm.getValues());
  };

  const inputStyle: React.CSSProperties = { display: 'block', width: '100%', padding: 8, marginTop: 4, boxSizing: 'border-box' };
  const labelStyle: React.CSSProperties = { display: 'block', marginBottom: 16, fontWeight: 500 };

  return (
    <div style={{ padding: 24, maxWidth: 800, margin: '0 auto' }}>
      <h1>Create Document</h1>

      {/* Step indicators */}
      <div style={{ display: 'flex', gap: 8, marginBottom: 24 }}>
        {[1, 2, 3].map((s) => (
          <div
            key={s}
            style={{
              padding: '6px 16px',
              borderRadius: 20,
              fontSize: 14,
              fontWeight: step === s ? 700 : 400,
              background: step === s ? '#2563eb' : step > s ? '#dcfce7' : '#f3f4f6',
              color: step === s ? '#fff' : '#374151',
            }}
          >
            {s === 1 ? 'Template' : s === 2 ? 'Details' : 'Signers'}
          </div>
        ))}
      </div>

      {/* Step 1: Pick template */}
      {step === 1 && (
        <div>
          <h2>Select a Template</h2>
          {loadingTemplates && <p>Loading…</p>}
          {activeTemplates && activeTemplates.length === 0 && <p>No active templates available.</p>}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: 16 }}>
            {activeTemplates?.map((t) => (
              <div
                key={t.id}
                onClick={() => {
                  setSelectedTemplate(t);
                  setStep(2);
                }}
                style={{
                  border: selectedTemplate?.id === t.id ? '2px solid #2563eb' : '1px solid #e5e7eb',
                  borderRadius: 8,
                  padding: 12,
                  cursor: 'pointer',
                  background: selectedTemplate?.id === t.id ? '#eff6ff' : '#fff',
                }}
              >
                <div style={{ height: 120, overflow: 'hidden', borderRadius: 4, marginBottom: 8, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {t.pdf_url && (
                    <img
                      src={t.pdf_url.replace(/\.pdf$/, '.jpg')}
                      alt={t.name}
                      style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                      onError={(e) => { e.currentTarget.style.display = 'none'; }}
                    />
                  )}
                </div>
                <p style={{ margin: 0, fontWeight: 500 }}>{t.name}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Step 2: Details */}
      {step === 2 && (
        <div>
          <h2>Document Details</h2>
          <form onSubmit={detailsForm.handleSubmit(handleDetailsSubmit)}>
            <label style={labelStyle}>
              Name *
              <input {...detailsForm.register('name')} style={inputStyle} />
              {detailsForm.formState.errors.name && (
                <span style={{ color: 'red', fontSize: 13 }}>{detailsForm.formState.errors.name.message}</span>
              )}
            </label>

            <label style={labelStyle}>
              Custom Message
              <textarea {...detailsForm.register('custom_message')} rows={3} style={inputStyle} />
            </label>

            <label style={labelStyle}>
              Reply-to Email
              <input type="email" {...detailsForm.register('reply_to_email')} style={inputStyle} />
              {detailsForm.formState.errors.reply_to_email && (
                <span style={{ color: 'red', fontSize: 13 }}>{detailsForm.formState.errors.reply_to_email.message}</span>
              )}
            </label>

            <label style={labelStyle}>
              Reply-to Name
              <input {...detailsForm.register('reply_to_name')} style={inputStyle} />
            </label>

            <label style={{ ...labelStyle, display: 'flex', alignItems: 'center', gap: 8 }}>
              <input type="checkbox" {...detailsForm.register('has_attachments')} />
              Require Attachments
            </label>

            {hasAttachments && (
              <label style={labelStyle}>
                Attachment Instructions
                <textarea {...detailsForm.register('attachment_instructions')} rows={3} style={inputStyle} />
              </label>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button type="button" onClick={() => setStep(1)} style={{ padding: '8px 16px' }}>
                Back
              </button>
              <button type="submit" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', border: 'none', borderRadius: 6 }}>
                Next
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Step 3: Signers */}
      {step === 3 && (
        <div>
          <h2>Add Signers</h2>

          <form onSubmit={signerForm.handleSubmit(handleAddSigner)} style={{ display: 'flex', gap: 8, marginBottom: 16, flexWrap: 'wrap' }}>
            <div>
              <input placeholder="Name" {...signerForm.register('name')} style={{ padding: 8 }} />
              {signerForm.formState.errors.name && (
                <div style={{ color: 'red', fontSize: 13 }}>{signerForm.formState.errors.name.message}</div>
              )}
            </div>
            <div>
              <input placeholder="Email" type="email" {...signerForm.register('email')} style={{ padding: 8 }} />
              {signerForm.formState.errors.email && (
                <div style={{ color: 'red', fontSize: 13 }}>{signerForm.formState.errors.email.message}</div>
              )}
            </div>
            <div>
              <input placeholder="Role" {...signerForm.register('role')} style={{ padding: 8 }} />
              {signerForm.formState.errors.role && (
                <div style={{ color: 'red', fontSize: 13 }}>{signerForm.formState.errors.role.message}</div>
              )}
            </div>
            <button type="submit" style={{ padding: '8px 16px' }}>Add</button>
          </form>

          {signers.length === 0 && <p style={{ color: '#6b7280' }}>No signers added yet.</p>}

          <div style={{ marginBottom: 24 }}>
            {signers.map((signer, i) => (
              <div
                key={i}
                draggable
                onDragStart={() => handleDragStart(i)}
                onDragOver={(e) => handleDragOver(e, i)}
                onDragEnd={handleDragEnd}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 12,
                  padding: '8px 12px',
                  marginBottom: 4,
                  border: '1px solid #e5e7eb',
                  borderRadius: 6,
                  background: dragIndex === i ? '#eff6ff' : '#fff',
                  cursor: 'grab',
                }}
              >
                <span style={{ color: '#9ca3af', fontWeight: 700 }}>{i + 1}</span>
                <span style={{ flex: 1 }}>{signer.name}</span>
                <span style={{ color: '#6b7280' }}>{signer.email}</span>
                <span style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: 12, fontSize: 12 }}>{signer.role}</span>
                <button
                  type="button"
                  onClick={() => handleRemoveSigner(i)}
                  style={{ background: 'none', border: 'none', color: 'red', cursor: 'pointer', fontSize: 16 }}
                >
                  &times;
                </button>
              </div>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 8 }}>
            <button type="button" onClick={() => setStep(2)} style={{ padding: '8px 16px' }}>
              Back
            </button>
            <button
              type="button"
              onClick={handleCreate}
              disabled={signers.length === 0 || createMutation.isPending}
              style={{
                padding: '8px 16px',
                background: signers.length === 0 ? '#9ca3af' : '#2563eb',
                color: '#fff',
                border: 'none',
                borderRadius: 6,
                cursor: signers.length === 0 ? 'not-allowed' : 'pointer',
              }}
            >
              {createMutation.isPending ? 'Creating…' : 'Create Document'}
            </button>
          </div>

          {createMutation.isError && (
            <p style={{ color: 'red', marginTop: 8 }}>Failed to create document. Please try again.</p>
          )}
        </div>
      )}
    </div>
  );
}
