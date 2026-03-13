import { useParams } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getSubmission, resendSubmission } from '../../api/submissions';
import client from '../../api/client';

const EVENT_ICONS: Record<string, string> = {
  created: '\u25CB',
  sent: '\u2709',
  viewed: '\u25CE',
  signed: '\u2713',
  expired: '\u29B2',
  declined: '\u2717',
};

const EVENT_COLORS: Record<string, string> = {
  created: '#9ca3af',
  sent: '#3b82f6',
  viewed: '#8b5cf6',
  signed: '#16a34a',
  expired: '#ef4444',
  declined: '#ef4444',
};

export default function SubmissionShow() {
  const { id } = useParams<{ id: string }>();
  const submissionId = Number(id);
  const queryClient = useQueryClient();

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['submissions', submissionId],
    queryFn: () => getSubmission(submissionId),
    enabled: !isNaN(submissionId),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendSubmission(submissionId),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['submissions', submissionId] }),
  });

  const handleDownload = async () => {
    const response = await client.get(`/submissions/${submissionId}/download`, {
      responseType: 'blob',
    });
    const url = URL.createObjectURL(response.data as Blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'signed-document.pdf';
    a.click();
    URL.revokeObjectURL(url);
  };

  if (isLoading) return <p style={{ padding: 24 }}>Loading...</p>;
  if (error || !submission) return <p style={{ padding: 24, color: 'red' }}>Failed to load submission.</p>;

  const canResend = submission.status === 'sent' || submission.status === 'pending';
  const canDownload = submission.status === 'signed';
  const auditLogs = submission.audit_logs ?? [];
  const fieldValues = submission.field_values ?? [];
  const attachments = submission.media ?? [];

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 8px' }}>Submission Details</h1>

      {/* Recipient info */}
      <div style={{ marginBottom: 24, fontSize: 14 }}>
        <p style={{ margin: '4px 0' }}>
          <strong>Recipient:</strong> {submission.recipient_name} ({submission.recipient_email})
        </p>
        <p style={{ margin: '4px 0' }}>
          <strong>Document:</strong> {submission.document?.name ?? '—'}
        </p>
        <p style={{ margin: '4px 0' }}>
          <strong>Status:</strong>{' '}
          <span style={{ fontWeight: 600 }}>{submission.status}</span>
        </p>
      </div>

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 32 }}>
        {canDownload && (
          <button
            type="button"
            onClick={handleDownload}
            style={{
              padding: '8px 20px',
              background: '#16a34a',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            Download Signed PDF
          </button>
        )}
        {canResend && (
          <button
            type="button"
            onClick={() => resendMutation.mutate()}
            disabled={resendMutation.isPending}
            style={{
              padding: '8px 20px',
              background: '#2563eb',
              color: '#fff',
              border: 'none',
              borderRadius: 6,
              cursor: resendMutation.isPending ? 'not-allowed' : 'pointer',
              fontSize: 14,
              fontWeight: 500,
            }}
          >
            {resendMutation.isPending ? 'Resending...' : 'Resend'}
          </button>
        )}
        {resendMutation.isError && (
          <span style={{ color: 'red', fontSize: 14, alignSelf: 'center' }}>Failed to resend.</span>
        )}
        {resendMutation.isSuccess && (
          <span style={{ color: '#16a34a', fontSize: 14, alignSelf: 'center' }}>Resent successfully.</span>
        )}
      </div>

      {/* Audit log timeline */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Audit Log</h2>
      {auditLogs.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No audit events yet.</p>
      ) : (
        <div style={{ marginBottom: 32, paddingLeft: 24, borderLeft: '2px solid #e5e7eb' }}>
          {auditLogs.map((log) => {
            const icon = EVENT_ICONS[log.event] ?? '\u25CF';
            const color = EVENT_COLORS[log.event] ?? '#6b7280';
            return (
              <div key={log.id} style={{ position: 'relative', marginBottom: 20 }}>
                <div
                  style={{
                    position: 'absolute',
                    left: -33,
                    top: 0,
                    width: 20,
                    height: 20,
                    borderRadius: '50%',
                    background: '#fff',
                    border: `2px solid ${color}`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 12,
                    color,
                  }}
                >
                  {icon}
                </div>
                <div>
                  <div style={{ fontWeight: 600, fontSize: 14, textTransform: 'capitalize' }}>
                    {log.event}
                  </div>
                  <div style={{ fontSize: 12, color: '#6b7280' }}>
                    {new Date(log.created_at).toLocaleString()}
                    {log.ip && <span> &middot; IP: {log.ip}</span>}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Field values table */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Field Values</h2>
      {fieldValues.length === 0 ? (
        <p style={{ color: '#6b7280', marginBottom: 32 }}>No field values recorded.</p>
      ) : (
        <table style={{ width: '100%', maxWidth: 600, borderCollapse: 'collapse', fontSize: 14, marginBottom: 32 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Field</th>
              <th style={{ padding: '8px 12px' }}>Value</th>
            </tr>
          </thead>
          <tbody>
            {fieldValues.map((fv) => (
              <tr key={fv.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                <td style={{ padding: '8px 12px', fontWeight: 500 }}>
                  {fv.template_field?.label ?? `Field #${fv.template_field_id}`}
                </td>
                <td style={{ padding: '8px 12px' }}>
                  {fv.value.startsWith('data:image') ? (
                    <img src={fv.value} alt="Signature" style={{ maxHeight: 40 }} />
                  ) : (
                    fv.value || '—'
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Attachments */}
      <h2 style={{ fontSize: 18, marginBottom: 16 }}>Attachments</h2>
      {attachments.length === 0 ? (
        <p style={{ color: '#6b7280' }}>No attachments.</p>
      ) : (
        <ul style={{ listStyle: 'none', padding: 0 }}>
          {attachments.map((media) => (
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
              }}
            >
              <span style={{ flex: 1 }}>{media.name || media.file_name}</span>
              <span style={{ color: '#6b7280', fontSize: 12 }}>
                {(media.size / 1024).toFixed(1)} KB
              </span>
              <a
                href={media.url}
                target="_blank"
                rel="noopener noreferrer"
                style={{
                  padding: '4px 12px',
                  background: '#2563eb',
                  color: '#fff',
                  borderRadius: 4,
                  textDecoration: 'none',
                  fontSize: 12,
                }}
              >
                Download
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
