import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  ArrowLeft,
  Download,
  RefreshCw,
  Copy,
  FileIcon,
  Check,
} from 'lucide-react';
import { useState } from 'react';
import { getSubmission, resendSubmission } from '../../api/submissions';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { Button } from '@/components/ui/button';
import { Badge, getSubmissionBadgeVariant } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import { Spinner } from '@/components/ui/Spinner';
import { Tooltip } from '@/components/ui/tooltip';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/lib/utils';

const DOT_COLORS: Record<string, string> = {
  created: 'bg-text-tertiary',
  sent: 'bg-accent',
  viewed: 'bg-warning',
  signed: 'bg-success',
  expired: 'bg-danger',
  declined: 'bg-danger',
};

const LINE_COLORS: Record<string, string> = {
  created: 'border-text-tertiary/30',
  sent: 'border-accent/30',
  viewed: 'border-warning/30',
  signed: 'border-success/30',
  expired: 'border-danger/30',
  declined: 'border-danger/30',
};

export default function SubmissionShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const submissionId = Number(id);
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [copied, setCopied] = useState(false);

  const { data: submission, isLoading, error } = useQuery({
    queryKey: ['submissions', submissionId],
    queryFn: () => getSubmission(submissionId),
    enabled: !isNaN(submissionId),
  });

  const resendMutation = useMutation({
    mutationFn: () => resendSubmission(submissionId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['submissions', submissionId] });
      addToast('Email resent successfully', 'success');
    },
    onError: () => {
      addToast('Failed to resend email', 'error');
    },
  });

  const handleDownload = () => {
    if (submission?.signed_pdf_url) {
      window.open(submission.signed_pdf_url, '_blank');
    }
  };

  const handleCopyLink = () => {
    if (!submission) return;
    const url = `${window.location.origin}/public/esign/${submission.token}`;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !submission) {
    return (
      <>
        <PageHeader title="Submission" />
        <PageContent>
          <p className="text-danger">Failed to load submission.</p>
        </PageContent>
      </>
    );
  }

  const canResend = submission.status === 'sent' || submission.status === 'pending';
  const canDownload = submission.status === 'signed';
  const auditLogs = submission.audit_logs ?? [];
  const fieldValues = submission.field_values ?? [];
  const attachments = submission.media ?? [];
  const signingUrl = `${window.location.origin}/public/esign/${submission.token}`;
  const isExpired = submission.expires_at && new Date(submission.expires_at) < new Date();

  return (
    <>
      <PageHeader
        title={submission.recipient_name}
        actions={
          <div className="flex items-center gap-2">
            <Badge variant={getSubmissionBadgeVariant(submission.status)}>
              {submission.status}
            </Badge>
            {canDownload && (
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4" />
                Download PDF
              </Button>
            )}
            {canResend && (
              <Button
                variant="secondary"
                onClick={() => resendMutation.mutate()}
                loading={resendMutation.isPending}
              >
                <RefreshCw className="h-4 w-4" />
                Resend
              </Button>
            )}
          </div>
        }
      />
      <PageContent>
        <div className="mb-4">
          <Button variant="ghost" size="sm" onClick={() => navigate('/submissions')}>
            <ArrowLeft className="h-4 w-4" />
            Back to Submissions
          </Button>
        </div>

        <div className="flex flex-col gap-6 lg:flex-row">
          {/* LEFT COLUMN */}
          <div className="min-w-0 flex-1 space-y-6">
            {/* Signing Details */}
            <Card>
              <CardHeader>
                <CardTitle>Signing Details</CardTitle>
              </CardHeader>
              <CardContent>
                <dl className="space-y-3 text-sm">
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Recipient</dt>
                    <dd className="text-right text-text-primary">
                      {submission.recipient_name}
                      <span className="ml-2 text-text-secondary">{submission.recipient_email}</span>
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Document</dt>
                    <dd className="text-text-primary">
                      {submission.document?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Template</dt>
                    <dd className="text-text-primary">
                      {submission.document?.template?.name ?? '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Sent</dt>
                    <dd className="text-text-primary">
                      {submission.sent_at
                        ? new Date(submission.sent_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Expires</dt>
                    <dd className={cn('text-text-primary', isExpired && 'text-danger font-medium')}>
                      {submission.expires_at
                        ? new Date(submission.expires_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                          })
                        : '—'}
                      {isExpired && ' (expired)'}
                    </dd>
                  </div>
                  <div className="flex justify-between">
                    <dt className="text-text-secondary">Signed</dt>
                    <dd className="text-text-primary">
                      {submission.signed_at
                        ? new Date(submission.signed_at).toLocaleDateString(undefined, {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric',
                            hour: '2-digit',
                            minute: '2-digit',
                          })
                        : '—'}
                    </dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-text-secondary">Signing link</dt>
                    <dd className="flex items-center gap-2">
                      <code className="max-w-72 truncate rounded bg-surface-raised px-2 py-0.5 text-xs font-mono text-text-secondary">
                        {signingUrl}
                      </code>
                      <Tooltip content={copied ? 'Copied!' : 'Copy link'}>
                        <button
                          onClick={handleCopyLink}
                          className="rounded p-1 text-text-tertiary transition-colors hover:bg-surface-raised hover:text-text-primary"
                        >
                          {copied ? (
                            <Check className="h-3.5 w-3.5 text-success" />
                          ) : (
                            <Copy className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </Tooltip>
                    </dd>
                  </div>
                </dl>
              </CardContent>
            </Card>

            {/* Field Values */}
            {fieldValues.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Field Values</CardTitle>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Field Label</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead>Value</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {fieldValues.map((fv) => {
                        const fieldType = fv.field?.type ?? 'text';
                        const isSignatureType =
                          fieldType === 'signature' || fieldType === 'initials';

                        return (
                          <TableRow key={fv.id}>
                            <TableCell className="font-medium text-text-primary">
                              {fv.field?.label ?? `Field #${fv.template_field_id}`}
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">{fieldType}</Badge>
                            </TableCell>
                            <TableCell>
                              {isSignatureType && fv.value ? (
                                <span className="italic text-text-secondary">
                                  [Signature captured]
                                </span>
                              ) : fv.value ? (
                                fv.value
                              ) : (
                                <span className="text-text-tertiary">—</span>
                              )}
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            {/* Attachments */}
            {submission.document?.has_attachments && (
              <Card>
                <CardHeader>
                  <CardTitle>Attachments</CardTitle>
                </CardHeader>
                <CardContent>
                  {attachments.length === 0 ? (
                    <p className="text-sm text-text-tertiary">No attachments uploaded</p>
                  ) : (
                    <div className="space-y-2">
                      {attachments.map((media) => (
                        <div
                          key={media.id}
                          className="flex items-center gap-3 rounded-md border border-border-subtle px-3 py-2"
                        >
                          <FileIcon className="h-4 w-4 shrink-0 text-text-tertiary" />
                          <span className="flex-1 truncate text-sm text-text-primary">
                            {media.name || media.file_name}
                          </span>
                          <span className="shrink-0 text-xs text-text-tertiary">
                            {(media.size / 1024).toFixed(1)} KB
                          </span>
                          <a
                            href={media.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 text-xs font-medium text-accent hover:underline"
                          >
                            Download
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )}
          </div>

          {/* RIGHT COLUMN */}
          <div className="w-full shrink-0 lg:w-[300px]">
            <Card>
              <CardHeader>
                <CardTitle>Audit Trail</CardTitle>
              </CardHeader>
              <CardContent>
                {auditLogs.length === 0 ? (
                  <p className="text-sm text-text-tertiary">No activity yet</p>
                ) : (
                  <div className="relative space-y-0">
                    {auditLogs.map((log, index) => {
                      const dotColor = DOT_COLORS[log.event] ?? 'bg-text-tertiary';
                      const lineColor = LINE_COLORS[log.event] ?? 'border-text-tertiary/30';
                      const isLast = index === auditLogs.length - 1;

                      return (
                        <div key={log.id} className="relative flex gap-3 pb-6 last:pb-0">
                          {/* Dot + Line */}
                          <div className="flex flex-col items-center">
                            <div
                              className={cn('mt-1 h-2.5 w-2.5 shrink-0 rounded-full', dotColor)}
                            />
                            {!isLast && (
                              <div
                                className={cn(
                                  'w-px flex-1 border-l-2',
                                  lineColor
                                )}
                              />
                            )}
                          </div>

                          {/* Content */}
                          <div className="min-w-0 pb-1">
                            <div className="text-sm font-semibold capitalize text-text-primary">
                              {log.event}
                            </div>
                            <div className="text-xs text-text-secondary">
                              {new Date(log.created_at).toLocaleString()}
                            </div>
                            {log.ip && (
                              <div className="mt-0.5 font-mono text-[10px] text-text-tertiary">
                                {log.ip}
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </>
  );
}
