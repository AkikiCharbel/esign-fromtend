import { useParams, Link } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { PenLine, Download, FileText } from 'lucide-react';
import { getPortal } from '../../api/public';
import { Badge, getSubmissionBadgeVariant } from '@/components/ui/Badge';

export default function CustomerPortal() {
  const { token } = useParams<{ token: string }>();

  const { data: portal, isLoading, error } = useQuery({
    queryKey: ['portal', token],
    queryFn: () => getPortal(token!),
    enabled: !!token,
    retry: false,
  });

  const submissions = portal?.submissions;

  if (isLoading) {
    return (
      <div className="theme-public min-h-screen px-6 py-10" style={{ backgroundColor: 'var(--pub-bg)' }}>
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <div className="mb-2 h-7 w-48 animate-pulse rounded" style={{ backgroundColor: 'var(--pub-border)' }} />
            <div className="h-4 w-32 animate-pulse rounded" style={{ backgroundColor: 'var(--pub-border)' }} />
          </div>
          <div className="space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }} />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="theme-public flex min-h-screen items-center justify-center px-4" style={{ backgroundColor: 'var(--pub-bg)' }}>
        <div className="w-full max-w-md rounded-xl p-8 text-center shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
          <FileText className="mx-auto mb-4 h-12 w-12" style={{ color: 'var(--pub-text-muted)' }} />
          <h1 className="mb-2 text-xl font-semibold" style={{ color: 'var(--pub-text)' }}>Unable to load portal</h1>
          <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
            The link may be invalid or expired. Please contact the sender.
          </p>
        </div>
      </div>
    );
  }

  const recipientEmail = portal?.recipient_email ?? '';

  return (
    <div className="theme-public min-h-screen px-6 py-10" style={{ backgroundColor: 'var(--pub-bg)' }}>
      <div className="mx-auto max-w-2xl">
        {/* Header */}
        <div className="mb-8">
          <div className="mb-3 flex items-center gap-2">
            <FileText className="h-6 w-6" style={{ color: 'var(--pub-accent)' }} />
            <span className="text-lg font-bold" style={{ color: 'var(--pub-text)' }}>eSign</span>
          </div>
          <h1 className="text-xl font-semibold" style={{ color: 'var(--pub-text)' }}>Your Documents</h1>
          {recipientEmail && (
            <p className="mt-1 text-sm" style={{ color: 'var(--pub-text-secondary)' }}>{recipientEmail}</p>
          )}
        </div>

        {/* Document list */}
        {submissions && submissions.length === 0 && (
          <div className="rounded-lg px-6 py-12 text-center shadow-sm" style={{ backgroundColor: 'var(--pub-surface)' }}>
            <FileText className="mx-auto mb-3 h-10 w-10" style={{ color: 'var(--pub-disabled)' }} />
            <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>No documents found</p>
          </div>
        )}

        {submissions && submissions.length > 0 && (
          <div className="space-y-3">
            {submissions.map((sub) => {
              const isSigned = sub.status === 'signed';
              const signedPdf = sub.media?.find((m) => m.mime_type === 'application/pdf');
              const isPending = !isSigned && sub.status !== 'expired' && sub.status !== 'declined';

              return (
                <div
                  key={sub.id}
                  className="flex items-center justify-between rounded-lg px-5 py-4 shadow-sm"
                  style={{ backgroundColor: 'var(--pub-surface)' }}
                >
                  <div className="flex items-center gap-4 min-w-0">
                    <Badge variant={getSubmissionBadgeVariant(sub.status)}>
                      {sub.status}
                    </Badge>
                    <div className="min-w-0">
                      <p className="truncate font-medium" style={{ color: 'var(--pub-text)' }}>
                        {sub.document?.name ?? 'Document'}
                      </p>
                      <p className="text-xs" style={{ color: 'var(--pub-text-secondary)' }}>
                        Sent {sub.sent_at ? new Date(sub.sent_at).toLocaleDateString() : '\u2014'}
                      </p>
                    </div>
                  </div>
                  <div className="shrink-0 ml-4">
                    {isPending && (
                      <Link
                        to={`/public/esign/${sub.token}`}
                        className="inline-flex items-center gap-1.5 rounded-lg px-4 py-2 text-sm font-medium text-white"
                        style={{ backgroundColor: 'var(--pub-accent)' }}
                      >
                        <PenLine className="h-4 w-4" />
                        Sign Document
                      </Link>
                    )}
                    {isSigned && signedPdf && (
                      <a
                        href={signedPdf.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 rounded-lg border px-4 py-2 text-sm font-medium"
                        style={{
                          borderColor: 'var(--pub-border)',
                          backgroundColor: 'var(--pub-surface)',
                          color: 'var(--pub-text-secondary)',
                        }}
                      >
                        <Download className="h-4 w-4" />
                        Download
                      </a>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
