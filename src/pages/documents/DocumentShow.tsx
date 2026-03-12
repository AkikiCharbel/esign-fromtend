import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getDocument } from '../../api/documents';
import { createSubmission } from '../../api/submissions';
import PdfViewer from '../../components/PdfViewer/PdfViewer';

export default function DocumentShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const documentId = Number(id);

  const { data: document, isLoading, error } = useQuery({
    queryKey: ['documents', documentId],
    queryFn: () => getDocument(documentId),
    enabled: !isNaN(documentId),
  });

  const sendMutation = useMutation({
    mutationFn: () => createSubmission({ document_id: documentId }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
      navigate('/submissions');
    },
  });

  if (isLoading) return <p style={{ padding: 24 }}>Loading…</p>;
  if (error || !document) return <p style={{ padding: 24, color: 'red' }}>Failed to load document.</p>;

  const signers = document.signers ?? [];
  const hasSigners = signers.length > 0;

  return (
    <div style={{ padding: 24 }}>
      <h1>{document.name}</h1>

      {document.template && (
        <p style={{ color: '#6b7280', marginBottom: 16 }}>
          Template: {document.template.name}
        </p>
      )}

      {/* PDF Preview */}
      {document.template?.pdf_url && (
        <div style={{ marginBottom: 24, maxWidth: 700 }}>
          <PdfViewer pdfUrl={document.template.pdf_url} />
        </div>
      )}

      {/* Signers */}
      <h2>Signers</h2>
      {signers.length === 0 && <p style={{ color: '#6b7280' }}>No signers added.</p>}

      <div style={{ marginBottom: 24 }}>
        {signers.map((signer) => (
          <div
            key={signer.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              padding: '8px 12px',
              marginBottom: 4,
              border: '1px solid #e5e7eb',
              borderRadius: 6,
            }}
          >
            <span style={{ fontWeight: 700, color: '#9ca3af', width: 24 }}>{signer.sign_order}</span>
            <span style={{ flex: 1 }}>{signer.name}</span>
            <span style={{ color: '#6b7280' }}>{signer.email}</span>
            <span style={{ padding: '2px 8px', background: '#f3f4f6', borderRadius: 12, fontSize: 12 }}>{signer.role}</span>
            <span
              style={{
                padding: '2px 8px',
                borderRadius: 12,
                fontSize: 12,
                fontWeight: 600,
                background: signer.status === 'signed' ? '#dcfce7' : signer.status === 'sent' ? '#dbeafe' : '#fef3c7',
                color: signer.status === 'signed' ? '#166534' : signer.status === 'sent' ? '#1e40af' : '#92400e',
              }}
            >
              {signer.status}
            </span>
          </div>
        ))}
      </div>

      {/* Send button */}
      <button
        type="button"
        onClick={() => sendMutation.mutate()}
        disabled={!hasSigners || sendMutation.isPending}
        style={{
          padding: '10px 24px',
          background: hasSigners ? '#2563eb' : '#9ca3af',
          color: '#fff',
          border: 'none',
          borderRadius: 6,
          cursor: hasSigners ? 'pointer' : 'not-allowed',
          fontSize: 16,
        }}
      >
        {sendMutation.isPending ? 'Sending…' : 'Send'}
      </button>

      {sendMutation.isError && (
        <p style={{ color: 'red', marginTop: 8 }}>Failed to send. Please try again.</p>
      )}
    </div>
  );
}
