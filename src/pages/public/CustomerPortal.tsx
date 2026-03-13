import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { getPortal } from '../../api/public';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  sent: { bg: '#dbeafe', color: '#1e40af' },
  viewed: { bg: '#e0e7ff', color: '#3730a3' },
  signed: { bg: '#dcfce7', color: '#166534' },
  expired: { bg: '#fee2e2', color: '#991b1b' },
  declined: { bg: '#fecaca', color: '#991b1b' },
};

export default function CustomerPortal() {
  const { token } = useParams<{ token: string }>();

  const { data: submissions, isLoading, error } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => getPortal(token!),
    enabled: !!token,
    retry: false,
  });

  if (isLoading) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ fontSize: 16, color: '#6b7280' }}>Loading portal...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: '100vh' }}>
        <p style={{ fontSize: 16, color: '#ef4444' }}>Unable to load portal. The link may be invalid or expired.</p>
      </div>
    );
  }

  const recipientName = submissions?.[0]?.recipient_name ?? 'Recipient';

  return (
    <div style={{ maxWidth: 800, margin: '0 auto', padding: '40px 24px' }}>
      <h1 style={{ margin: '0 0 8px', fontSize: 24 }}>Welcome, {recipientName}</h1>
      <p style={{ margin: '0 0 32px', color: '#6b7280', fontSize: 14 }}>
        Below are the documents that require your attention.
      </p>

      {submissions && submissions.length === 0 && (
        <p style={{ color: '#6b7280' }}>No documents found.</p>
      )}

      {submissions && submissions.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Document</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Sent</th>
              <th style={{ padding: '8px 12px' }}>Action</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => {
              const statusStyle = STATUS_COLORS[sub.status] ?? { bg: '#f3f4f6', color: '#374151' };
              const isSigned = sub.status === 'signed';
              const signedPdf = sub.media?.find((m) => m.mime_type === 'application/pdf');

              return (
                <tr key={sub.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>
                    {sub.document?.name ?? 'Document'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    <span
                      style={{
                        padding: '2px 10px',
                        borderRadius: 12,
                        fontSize: 12,
                        fontWeight: 600,
                        background: statusStyle.bg,
                        color: statusStyle.color,
                      }}
                    >
                      {sub.status}
                    </span>
                  </td>
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>
                    {sub.sent_at ? new Date(sub.sent_at).toLocaleDateString() : '—'}
                  </td>
                  <td style={{ padding: '10px 12px' }}>
                    {isSigned && signedPdf ? (
                      <a
                        href={signedPdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '4px 12px',
                          background: '#16a34a',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Download
                      </a>
                    ) : !isSigned && sub.status !== 'expired' && sub.status !== 'declined' ? (
                      <Link
                        to={`/public/esign/${sub.token}`}
                        style={{
                          padding: '4px 12px',
                          background: '#2563eb',
                          color: '#fff',
                          border: 'none',
                          borderRadius: 4,
                          fontSize: 12,
                          textDecoration: 'none',
                          display: 'inline-block',
                        }}
                      >
                        Sign Now
                      </Link>
                    ) : (
                      <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
