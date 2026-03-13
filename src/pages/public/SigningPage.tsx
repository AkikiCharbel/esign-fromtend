import { useState, useCallback, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  getPublicSubmission,
  submitSigning,
  getAttachments,
  uploadAttachment,
  deleteAttachment,
} from '../../api/public';
import PdfViewer from '../../components/PdfViewer/PdfViewer';
import SignaturePad from '../../components/SignaturePad/SignaturePad';
import type { TemplateField, Media } from '../../types';

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const queryClient = useQueryClient();

  const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
  const [invalidFields, setInvalidFields] = useState<Set<number>>(new Set());
  const [attachmentError, setAttachmentError] = useState(false);
  const [completed, setCompleted] = useState(false);

  const {
    data: submission,
    isLoading,
    error,
  } = useQuery({
    queryKey: ['public-submission', token],
    queryFn: () => getPublicSubmission(token!),
    enabled: !!token,
    retry: false,
  });

  const {
    data: attachments,
    refetch: refetchAttachments,
  } = useQuery({
    queryKey: ['public-attachments', token],
    queryFn: () => getAttachments(token!),
    enabled: !!token && !!submission?.document?.has_attachments,
  });

  const uploadMutation = useMutation({
    mutationFn: (file: File) => uploadAttachment(token!, file),
    onSuccess: () => refetchAttachments(),
  });

  const deleteMutation = useMutation({
    mutationFn: (mediaId: number) => deleteAttachment(token!, mediaId),
    onSuccess: () => refetchAttachments(),
  });

  const submitMutation = useMutation({
    mutationFn: () => {
      const entries = Object.entries(fieldValues).map(([fieldId, value]) => ({
        template_field_id: Number(fieldId),
        value,
      }));
      return submitSigning(token!, entries);
    },
    onSuccess: () => {
      setCompleted(true);
      queryClient.invalidateQueries({ queryKey: ['public-submission', token] });
    },
  });

  const setFieldValue = useCallback((fieldId: number, value: string) => {
    setFieldValues((prev) => ({ ...prev, [fieldId]: value }));
    setInvalidFields((prev) => {
      const next = new Set(prev);
      next.delete(fieldId);
      return next;
    });
  }, []);


  const handleSubmit = () => {
    const fields = submission?.document?.template?.fields ?? [];
    const hasAttachmentReq = submission?.document?.has_attachments ?? false;
    let hasErrors = false;

    const requiredMissing = fields.filter(
      (f) => f.required && !fieldValues[f.id],
    );

    if (requiredMissing.length > 0) {
      setInvalidFields(new Set(requiredMissing.map((f) => f.id)));
      hasErrors = true;
    }

    if (hasAttachmentReq && (!attachments || attachments.length === 0)) {
      setAttachmentError(true);
      hasErrors = true;
    } else {
      setAttachmentError(false);
    }

    if (hasErrors) return;

    submitMutation.mutate();
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => {
      files.forEach((file) => uploadMutation.mutate(file));
    },
  });

  // Error states
  if (isLoading) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        Loading...
      </div>
    );
  }

  if (error) {
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'system-ui, sans-serif' }}>
        <h1 style={{ color: '#ef4444' }}>
          {status === 410 ? 'Link Expired' : 'Document Not Found'}
        </h1>
        <p style={{ color: '#6b7280' }}>
          {status === 410
            ? 'This signing link has expired. Please contact the sender for a new link.'
            : 'The signing link is invalid or no longer available.'}
        </p>
      </div>
    );
  }

  if (!submission) return null;

  // Completed screen
  if (completed) {
    return (
      <div style={{ padding: 48, textAlign: 'center', fontFamily: 'system-ui, sans-serif', maxWidth: 500, margin: '0 auto' }}>
        <div style={{ fontSize: 48, marginBottom: 16, color: '#16a34a' }}>&#10003;</div>
        <h1>Signing Complete</h1>
        <p style={{ color: '#6b7280' }}>Thank you for signing the document.</p>
      </div>
    );
  }

  const template = submission.document?.template;
  const fields = template?.fields ?? [];
  const pdfUrl = template?.pdf_url;
  const hasAttachments = submission.document?.has_attachments ?? false;
  const attachmentInstructions = submission.document?.attachment_instructions;

  const overlayContent = (pageNumber: number) => {
    const pageFields = fields.filter((f) => f.page === pageNumber);
    return (
      <div style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}>
        {pageFields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={fieldValues[field.id] ?? ''}
            onChange={(val) => setFieldValue(field.id, val)}
            invalid={invalidFields.has(field.id)}
          />
        ))}
      </div>
    );
  };

  return (
    <div style={{ fontFamily: 'system-ui, sans-serif', maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>
      <h1 style={{ margin: '0 0 4px', fontSize: 22 }}>
        Sign: {submission.document?.name ?? 'Document'}
      </h1>
      <p style={{ color: '#6b7280', margin: '0 0 24px', fontSize: 14 }}>
        Please fill in all required fields and complete your signature below.
      </p>

      {/* PDF with field overlays */}
      {pdfUrl && (
        <PdfViewer
          pdfUrl={pdfUrl}
          overlayContent={overlayContent}
        />
      )}

      {/* Attachments section */}
      {hasAttachments && (
        <div style={{ marginTop: 32 }}>
          <h2 style={{ fontSize: 18, marginBottom: 8 }}>Attachments</h2>
          {attachmentInstructions && (
            <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 12 }}>
              {attachmentInstructions}
            </p>
          )}

          <div
            {...getRootProps()}
            style={{
              border: `2px dashed ${isDragActive ? '#2563eb' : '#d1d5db'}`,
              borderRadius: 8,
              padding: 24,
              textAlign: 'center',
              cursor: 'pointer',
              background: isDragActive ? '#eff6ff' : '#f9fafb',
              marginBottom: 12,
            }}
          >
            <input {...getInputProps()} />
            <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
              {isDragActive ? 'Drop files here...' : 'Drag & drop files here, or click to browse'}
            </p>
          </div>

          {attachmentError && (
            <p style={{ fontSize: 13, color: '#ef4444', margin: '0 0 8px' }}>
              Please upload at least one attachment before submitting.
            </p>
          )}

          {uploadMutation.isPending && (
            <p style={{ fontSize: 12, color: '#6b7280' }}>Uploading...</p>
          )}
          {uploadMutation.isError && (
            <p style={{ fontSize: 12, color: '#ef4444' }}>Upload failed. Please try again.</p>
          )}

          {attachments && attachments.length > 0 && (
            <ul style={{ listStyle: 'none', padding: 0 }}>
              {attachments.map((media: Media) => (
                <li
                  key={media.id}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 12,
                    padding: '8px 12px',
                    marginBottom: 4,
                    border: '1px solid #e5e7eb',
                    borderRadius: 6,
                    fontSize: 14,
                  }}
                >
                  <span style={{ flex: 1 }}>{media.name || media.file_name}</span>
                  <span style={{ color: '#6b7280', fontSize: 12 }}>
                    {(media.size / 1024).toFixed(1)} KB
                  </span>
                  <button
                    type="button"
                    onClick={() => deleteMutation.mutate(media.id)}
                    disabled={deleteMutation.isPending}
                    style={{
                      padding: '4px 10px',
                      background: '#ef4444',
                      color: '#fff',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12,
                    }}
                  >
                    Remove
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {/* Submit */}
      <div style={{ marginTop: 32, textAlign: 'center' }}>
        {submitMutation.isError && (
          <p style={{ color: '#ef4444', marginBottom: 8, fontSize: 14 }}>
            Failed to submit. Please try again.
          </p>
        )}
        {invalidFields.size > 0 && (
          <p style={{ color: '#ef4444', marginBottom: 8, fontSize: 14 }}>
            Please fill in all required fields before submitting.
          </p>
        )}
        <button
          type="button"
          onClick={handleSubmit}
          disabled={submitMutation.isPending}
          style={{
            padding: '12px 40px',
            background: '#2563eb',
            color: '#fff',
            border: 'none',
            borderRadius: 6,
            fontSize: 16,
            fontWeight: 600,
            cursor: submitMutation.isPending ? 'not-allowed' : 'pointer',
          }}
        >
          {submitMutation.isPending ? 'Submitting...' : 'Complete Signing'}
        </button>
      </div>
    </div>
  );
}

// --- Field Input Component ---

interface FieldInputProps {
  field: TemplateField;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
}

function FieldInput({ field, value, onChange, invalid }: FieldInputProps) {
  const [showPad, setShowPad] = useState(false);

  // Initialize date fields to today so state matches what's displayed
  useEffect(() => {
    if (field.type === 'date' && !value) {
      onChange(new Date().toISOString().split('T')[0]);
    }
  }, [field.type, field.id]); // eslint-disable-line react-hooks/exhaustive-deps

  const baseStyle: React.CSSProperties = {
    position: 'absolute',
    left: `${field.x}%`,
    top: `${field.y}%`,
    width: `${field.width}%`,
    height: `${field.height}%`,
    pointerEvents: 'auto',
    boxSizing: 'border-box',
  };

  const inputBorder = invalid ? '2px solid #ef4444' : '1px solid #d1d5db';

  if (field.type === 'signature' || field.type === 'initials') {
    return (
      <div style={baseStyle}>
        {value ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: inputBorder,
              borderRadius: 4,
              background: '#fff',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              position: 'relative',
            }}
            onClick={() => setShowPad(true)}
          >
            <img src={value} alt={field.type} style={{ maxWidth: '100%', maxHeight: '100%' }} />
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setShowPad(true)}
            style={{
              width: '100%',
              height: '100%',
              border: inputBorder,
              borderRadius: 4,
              background: '#fefce8',
              cursor: 'pointer',
              fontSize: 12,
              color: '#92400e',
              fontWeight: 500,
            }}
          >
            {field.type === 'signature' ? 'Click to sign' : 'Click for initials'}
          </button>
        )}

        {showPad && (
          <div
            style={{
              position: 'fixed',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              background: 'rgba(0,0,0,0.5)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              zIndex: 1000,
            }}
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowPad(false);
            }}
          >
            <div
              style={{
                background: '#fff',
                borderRadius: 8,
                padding: 24,
                maxWidth: '90vw',
              }}
            >
              <h3 style={{ margin: '0 0 12px' }}>
                {field.type === 'signature' ? 'Draw Your Signature' : 'Draw Your Initials'}
              </h3>
              <SignaturePad
                width={Math.min(400, window.innerWidth - 80)}
                height={field.type === 'initials' ? 100 : 150}
                onAccept={(base64) => {
                  onChange(base64);
                  setShowPad(false);
                }}
                onClear={() => onChange('')}
              />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowPad(false)}
                  style={{
                    padding: '8px 16px',
                    background: '#f3f4f6',
                    border: '1px solid #d1d5db',
                    borderRadius: 4,
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  if (field.type === 'text') {
    const InputTag = field.multiline ? 'textarea' : 'input';
    return (
      <div style={baseStyle}>
        <InputTag
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={field.label}
          style={{
            width: '100%',
            height: '100%',
            border: inputBorder,
            borderRadius: 4,
            padding: '4px 6px',
            fontSize: field.font_size,
            boxSizing: 'border-box',
            resize: 'none',
            background: '#fff',
          }}
        />
      </div>
    );
  }

  if (field.type === 'date') {
    return (
      <div style={baseStyle}>
        <input
          type="date"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            border: inputBorder,
            borderRadius: 4,
            padding: '4px 6px',
            fontSize: field.font_size,
            boxSizing: 'border-box',
            background: '#fff',
          }}
        />
      </div>
    );
  }

  if (field.type === 'checkbox') {
    return (
      <div style={{ ...baseStyle, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <input
          type="checkbox"
          checked={value === '1'}
          onChange={(e) => onChange(e.target.checked ? '1' : '0')}
          style={{
            width: '60%',
            height: '60%',
            cursor: 'pointer',
            accentColor: '#2563eb',
          }}
        />
      </div>
    );
  }

  if (field.type === 'radio') {
    const options = field.options ?? [];
    return (
      <div style={{ ...baseStyle, display: 'flex', flexDirection: 'column', gap: 2, fontSize: 12, background: '#fff', border: inputBorder, borderRadius: 4, padding: 4, overflow: 'auto' }}>
        {options.map((opt) => (
          <label key={opt} style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer' }}>
            <input
              type="radio"
              name={`field-${field.id}`}
              value={opt}
              checked={value === opt}
              onChange={() => onChange(opt)}
            />
            <span>{opt}</span>
          </label>
        ))}
      </div>
    );
  }

  if (field.type === 'dropdown') {
    const options = field.options ?? [];
    return (
      <div style={baseStyle}>
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          style={{
            width: '100%',
            height: '100%',
            border: inputBorder,
            borderRadius: 4,
            padding: '4px 6px',
            fontSize: field.font_size,
            boxSizing: 'border-box',
            background: '#fff',
          }}
        >
          <option value="">Select...</option>
          {options.map((opt) => (
            <option key={opt} value={opt}>
              {opt}
            </option>
          ))}
        </select>
      </div>
    );
  }

  return null;
}
