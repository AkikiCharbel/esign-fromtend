import { useState, useCallback, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useDropzone } from 'react-dropzone';
import axios from 'axios';
import {
  Shield,
  PenLine,
  FileX,
  Clock,
  CheckCircle,
  Upload,
  X,
  Download,
  Check,
} from 'lucide-react';
import {
  getPublicSubmission,
  submitSigning,
  getAttachments,
  uploadAttachment,
  deleteAttachment,
} from '../../api/public';
import PdfViewer from '../../components/PdfViewer/PdfViewer';
import SignatureModal from '../../components/SignatureModal';
import type { TemplateField, Media } from '../../types';

export default function SigningPage() {
  const { token } = useParams<{ token: string }>();
  const [fieldValues, setFieldValues] = useState<Record<number, string>>({});
  const [invalidFields, setInvalidFields] = useState<Set<number>>(new Set());
  const [attemptedSubmit, setAttemptedSubmit] = useState(false);
  const [attachmentError, setAttachmentError] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [portalUrl, setPortalUrl] = useState<string | null>(null);
  const [signModalField, setSignModalField] = useState<TemplateField | null>(null);

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
    onError: () => setAttachmentError(true),
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
    onSuccess: (data: { portal_url?: string }) => {
      setCompleted(true);
      if (data?.portal_url) setPortalUrl(data.portal_url);
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

  const fields = submission?.document?.template?.fields ?? [];
  const requiredFields = useMemo(() => fields.filter((f) => f.required), [fields]);

  const completedCount = useMemo(() => {
    return requiredFields.filter((f) => {
      const val = fieldValues[f.id];
      if (!val) return false;
      if (f.type === 'checkbox') return val === '1';
      return val.trim().length > 0;
    }).length;
  }, [requiredFields, fieldValues]);

  const handleSubmit = () => {
    setAttemptedSubmit(true);
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

  // Loading state
  if (isLoading) {
    return (
      <div className="theme-public flex min-h-screen items-center justify-center" style={{ backgroundColor: 'var(--pub-bg)' }}>
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-2" style={{ borderColor: 'var(--pub-border)', borderTopColor: 'var(--pub-accent)' }} />
          <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>Loading document...</p>
        </div>
      </div>
    );
  }

  // Success state after signing — check before error so a post-sign 410 doesn't override it
  if (completed && submission) {
    const signedPdfUrl = submission.media?.find(
      (m) => m.mime_type === 'application/pdf',
    )?.url;

    return (
      <div className="theme-public flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--pub-bg)' }}>
        <div className="w-full max-w-md text-center">
          <div className="animate-in zoom-in duration-500">
            <CheckCircle className="mx-auto mb-6 h-20 w-20" style={{ color: 'var(--pub-success)' }} />
          </div>
          <h1 className="mb-2 text-2xl font-bold" style={{ color: 'var(--pub-text)' }}>
            Document signed successfully!
          </h1>
          <p className="mb-6" style={{ color: 'var(--pub-text-secondary)' }}>
            Thank you, {submission.recipient_name}
          </p>
          {signedPdfUrl && (
            <a
              href={signedPdfUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-medium text-white"
              style={{ backgroundColor: 'var(--pub-accent)' }}
            >
              <Download className="h-4 w-4" />
              Download PDF
            </a>
          )}
          {portalUrl && (
            <a
              href={portalUrl}
              className="mt-4 inline-block text-sm font-medium"
              style={{ color: 'var(--pub-accent)' }}
            >
              View all your documents
            </a>
          )}
          <p className="mt-4 text-sm" style={{ color: 'var(--pub-text-muted)' }}>
            You can safely close this page
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    interface SigningErrorData { reason?: string; signed_pdf_url?: string }
    const status = axios.isAxiosError(error) ? error.response?.status : undefined;
    const errorData = axios.isAxiosError(error)
      ? (error.response?.data as SigningErrorData | undefined)
      : undefined;
    const alreadySigned = status === 410 && errorData?.reason === 'signed';

    if (status === 404) {
      return (
        <div className="theme-public flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--pub-bg)' }}>
          <div className="w-full max-w-md rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
            <FileX className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--pub-text-muted)' }} />
            <h1 className="mb-2 text-xl font-semibold" style={{ color: 'var(--pub-text)' }}>Document not found</h1>
            <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
              This signing link is invalid. Please check the URL or contact the sender.
            </p>
          </div>
        </div>
      );
    }

    if (alreadySigned) {
      const signedPdfUrl = errorData?.signed_pdf_url;
      return (
        <div className="theme-public flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--pub-bg)' }}>
          <div className="w-full max-w-md rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
            <CheckCircle className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--pub-success)' }} />
            <h1 className="mb-2 text-xl font-semibold" style={{ color: 'var(--pub-text)' }}>Already signed</h1>
            <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
              You've already completed this document.
            </p>
            {signedPdfUrl && (
              <a
                href={signedPdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-4 inline-flex items-center gap-2 rounded-lg px-5 py-2.5 text-sm font-medium text-white"
                style={{ backgroundColor: 'var(--pub-accent)' }}
              >
                <Download className="h-4 w-4" />
                Download Signed PDF
              </a>
            )}
          </div>
        </div>
      );
    }

    if (status === 410) {
      return (
        <div className="theme-public flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--pub-bg)' }}>
          <div className="w-full max-w-md rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
            <Clock className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--pub-warning)' }} />
            <h1 className="mb-2 text-xl font-semibold" style={{ color: 'var(--pub-text)' }}>This link has expired</h1>
            <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
              Please contact the sender for a new signing link.
            </p>
          </div>
        </div>
      );
    }

    return (
      <div className="theme-public flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--pub-bg)' }}>
        <div className="w-full max-w-md rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
          <FileX className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--pub-text-muted)' }} />
          <h1 className="mb-2 text-xl font-semibold" style={{ color: 'var(--pub-text)' }}>Document not found</h1>
          <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
            The signing link is invalid or no longer available.
          </p>
        </div>
      </div>
    );
  }

  if (!submission) return null;

  const template = submission.document?.template;
  const pdfUrl = template?.pdf_url;
  const hasAttachments = submission.document?.has_attachments ?? false;
  const attachmentInstructions = submission.document?.attachment_instructions;
  const documentName = submission.document?.name ?? 'Document';
  const replyToName = submission.document?.reply_to_name;
  const replyToEmail = submission.document?.reply_to_email;
  const customMessage = submission.document?.custom_message;

  // Expiry
  const expiresAt = submission.expires_at ? new Date(submission.expires_at) : null;
  const now = new Date();
  const isExpiringSoon = expiresAt ? expiresAt.getTime() - now.getTime() < 24 * 60 * 60 * 1000 : false;

  const allRequiredComplete = completedCount === requiredFields.length;

  const overlayContent = (pageNumber: number) => {
    const pageFields = fields.filter((f) => f.page === pageNumber);
    return (
      <>
        {pageFields.map((field) => (
          <FieldInput
            key={field.id}
            field={field}
            value={fieldValues[field.id] ?? ''}
            onChange={(val) => setFieldValue(field.id, val)}
            invalid={attemptedSubmit && invalidFields.has(field.id)}
            onOpenSignModal={() => setSignModalField(field)}
          />
        ))}
      </>
    );
  };

  return (
    <div className="theme-public min-h-screen" style={{ backgroundColor: 'var(--pub-bg)' }}>
      {/* Top Bar */}
      <header className="border-b px-4 py-3" style={{ borderColor: 'var(--pub-border)', backgroundColor: 'var(--pub-surface)' }}>
        <div className="mx-auto flex max-w-6xl items-center justify-between">
          <div className="flex items-center gap-2 text-sm" style={{ color: 'var(--pub-success)' }}>
            <Shield className="h-4 w-4" />
            <span className="font-medium">Secure Signing</span>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium" style={{ color: 'var(--pub-text)' }}>{documentName}</span>
            {expiresAt && (
              <span
                className="text-xs"
                style={{ color: isExpiringSoon ? 'var(--pub-danger)' : 'var(--pub-text-secondary)', fontWeight: isExpiringSoon ? 500 : 400 }}
              >
                Expires {expiresAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* Left — PDF with fields */}
          <div className="min-w-0 flex-1">
            <div className="rounded-lg p-4 shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
              {pdfUrl && (
                <PdfViewer
                  pdfUrl={pdfUrl}
                  overlayContent={overlayContent}
                />
              )}
            </div>
          </div>

          {/* Right — Signing panel */}
          <div className="w-full shrink-0 space-y-4 lg:w-96">
            {/* Sender info */}
            {(replyToName || replyToEmail) && (
              <div className="rounded-lg p-5 shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--pub-text)' }}>
                  Sent by {replyToName ?? 'Sender'}
                </h3>
                {customMessage && (
                  <div
                    className="mb-3 rounded-md border-l-4 py-2 pl-3 pr-3"
                    style={{ borderColor: 'var(--pub-accent-subtle-border)', backgroundColor: 'var(--pub-accent-subtle-bg)' }}
                  >
                    <p className="text-sm italic" style={{ color: 'var(--pub-text-secondary)' }}>{customMessage}</p>
                  </div>
                )}
                {replyToEmail && (
                  <a
                    href={`mailto:${replyToEmail}`}
                    className="text-sm hover:underline"
                    style={{ color: 'var(--pub-accent)' }}
                  >
                    {replyToEmail}
                  </a>
                )}
              </div>
            )}

            {/* Progress */}
            <div className="rounded-lg p-5 shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
              <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--pub-text)' }}>
                {completedCount} of {requiredFields.length} fields completed
              </h3>
              <div className="mb-4 h-2 overflow-hidden rounded-full" style={{ backgroundColor: 'var(--pub-border-subtle)' }}>
                <div
                  className="h-full rounded-full transition-all duration-300"
                  style={{
                    backgroundColor: 'var(--pub-accent)',
                    width: requiredFields.length > 0
                      ? `${(completedCount / requiredFields.length) * 100}%`
                      : '0%',
                  }}
                />
              </div>
              <div className="space-y-2">
                {requiredFields.map((f) => {
                  const isDone = (() => {
                    const val = fieldValues[f.id];
                    if (!val) return false;
                    if (f.type === 'checkbox') return val === '1';
                    return val.trim().length > 0;
                  })();
                  return (
                    <div key={f.id} className="flex items-center gap-2 text-sm">
                      {isDone ? (
                        <Check className="h-4 w-4" style={{ color: 'var(--pub-success)' }} />
                      ) : (
                        <X className="h-4 w-4" style={{ color: 'var(--pub-disabled)' }} />
                      )}
                      <span style={{ color: isDone ? 'var(--pub-text-secondary)' : 'var(--pub-text)' }}>
                        {f.label || f.type}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Attachments */}
            {hasAttachments && (
              <div className="rounded-lg p-5 shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
                <h3 className="mb-3 text-sm font-semibold" style={{ color: 'var(--pub-text)' }}>Attachments</h3>
                {attachmentInstructions && (
                  <p className="mb-3 text-sm" style={{ color: 'var(--pub-text-secondary)' }}>{attachmentInstructions}</p>
                )}

                <div
                  {...getRootProps()}
                  className="mb-3 cursor-pointer rounded-lg border-2 border-dashed p-5 text-center transition-colors"
                  style={{
                    borderColor: isDragActive ? 'var(--pub-accent)' : 'var(--pub-border)',
                    backgroundColor: isDragActive ? 'var(--pub-accent-subtle-bg)' : 'var(--pub-bg)',
                  }}
                >
                  <input {...getInputProps()} />
                  <Upload className="mx-auto mb-2 h-6 w-6" style={{ color: 'var(--pub-text-muted)' }} />
                  <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
                    {isDragActive ? 'Drop files here...' : 'Drop files or click to upload'}
                  </p>
                </div>

                {attachmentError && (
                  <p className="mb-2 text-xs" style={{ color: 'var(--pub-danger)' }}>
                    Please upload at least one attachment before submitting.
                  </p>
                )}

                {uploadMutation.isPending && (
                  <p className="text-xs" style={{ color: 'var(--pub-text-secondary)' }}>Uploading...</p>
                )}
                {uploadMutation.isError && (
                  <p className="text-xs" style={{ color: 'var(--pub-danger)' }}>Upload failed. Please try again.</p>
                )}

                {attachments && attachments.length > 0 && (
                  <div className="mt-2 space-y-2">
                    {attachments.map((media: Media) => (
                      <div
                        key={media.id}
                        className="flex items-center gap-2 rounded-md border px-3 py-2 text-sm"
                        style={{ borderColor: 'var(--pub-border)', backgroundColor: 'var(--pub-bg)' }}
                      >
                        <span className="flex-1 truncate" style={{ color: 'var(--pub-text-secondary)' }}>
                          {media.name || media.file_name}
                        </span>
                        <span className="shrink-0 text-xs" style={{ color: 'var(--pub-text-muted)' }}>
                          {(media.size / 1024).toFixed(1)} KB
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteMutation.mutate(media.id)}
                          disabled={deleteMutation.isPending}
                          className="shrink-0 cursor-pointer rounded border-none p-1 transition-colors"
                          style={{ color: 'var(--pub-text-muted)', backgroundColor: 'transparent' }}
                        >
                          <X className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Submit */}
            <div>
              {submitMutation.isError && (
                <p className="mb-2 text-center text-sm" style={{ color: 'var(--pub-danger)' }}>
                  Failed to submit. Please try again.
                </p>
              )}
              {attemptedSubmit && invalidFields.size > 0 && (
                <p className="mb-2 text-center text-sm" style={{ color: 'var(--pub-danger)' }}>
                  Please fill in all required fields.
                </p>
              )}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!allRequiredComplete || submitMutation.isPending}
                className="w-full cursor-pointer rounded-lg border-none px-6 py-3 text-sm font-semibold text-white transition-colors"
                style={{
                  backgroundColor: allRequiredComplete && !submitMutation.isPending
                    ? 'var(--pub-accent)'
                    : 'var(--pub-disabled)',
                  cursor: allRequiredComplete && !submitMutation.isPending ? 'pointer' : 'not-allowed',
                }}
              >
                {submitMutation.isPending ? 'Submitting...' : 'Complete Signing'}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Signature Modal */}
      {signModalField && (
        <SignatureModal
          title={signModalField.type === 'signature' ? 'Draw your signature' : 'Draw your initials'}
          onConfirm={(base64) => {
            setFieldValue(signModalField.id, base64);
            setSignModalField(null);
          }}
          onClose={() => setSignModalField(null)}
        />
      )}
    </div>
  );
}

// --- Field Input Component ---
// NOTE: This component uses inline styles for absolute PDF positioning (required by design)

interface FieldInputProps {
  field: TemplateField;
  value: string;
  onChange: (value: string) => void;
  invalid: boolean;
  onOpenSignModal: () => void;
}

function FieldInput({ field, value, onChange, invalid, onOpenSignModal }: FieldInputProps) {
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

  const borderInvalid = 'var(--pub-danger)';
  const borderNormal = 'var(--pub-border)';

  if (field.type === 'signature' || field.type === 'initials') {
    return (
      <div style={baseStyle}>
        {value ? (
          <div
            style={{
              width: '100%',
              height: '100%',
              border: `2px dashed ${invalid ? borderInvalid : borderNormal}`,
              borderRadius: 8,
              background: 'var(--pub-surface)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
            }}
            onClick={onOpenSignModal}
          >
            <img src={value} alt={field.type} style={{ maxWidth: '90%', maxHeight: '90%' }} />
          </div>
        ) : (
          <button
            type="button"
            onClick={onOpenSignModal}
            style={{
              width: '100%',
              height: '100%',
              border: `2px dashed ${invalid ? borderInvalid : borderNormal}`,
              borderRadius: 8,
              background: 'var(--pub-bg)',
              cursor: 'pointer',
              fontSize: 13,
              color: invalid ? 'var(--pub-danger)' : 'var(--pub-text-secondary)',
              fontWeight: 500,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <PenLine style={{ width: 14, height: 14 }} />
            {field.type === 'signature' ? 'Click to sign' : 'Click for initials'}
          </button>
        )}
      </div>
    );
  }

  const inputBorder = invalid ? `2px solid ${borderInvalid}` : `1px solid ${borderNormal}`;

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
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: field.font_size,
            boxSizing: 'border-box',
            resize: 'none',
            background: 'var(--pub-surface)',
            color: 'var(--pub-text)',
            outline: 'none',
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
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: field.font_size,
            boxSizing: 'border-box',
            background: 'var(--pub-surface)',
            color: 'var(--pub-text)',
            outline: 'none',
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
            accentColor: 'var(--pub-accent)',
          }}
        />
      </div>
    );
  }

  if (field.type === 'radio') {
    const options = field.options ?? [];
    return (
      <div style={{
        ...baseStyle,
        display: 'flex',
        flexDirection: 'column',
        gap: 2,
        fontSize: 12,
        background: 'var(--pub-surface)',
        color: 'var(--pub-text)',
        border: inputBorder,
        borderRadius: 6,
        padding: 4,
        overflow: 'auto',
      }}>
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
            borderRadius: 6,
            padding: '4px 8px',
            fontSize: field.font_size,
            boxSizing: 'border-box',
            background: 'var(--pub-surface)',
            color: 'var(--pub-text)',
            outline: 'none',
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
