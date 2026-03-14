import { useState, useMemo, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Search, Send, Upload, MoreHorizontal, Eye, RefreshCw, Link } from 'lucide-react';
import { getSubmissions, resendSubmission } from '../../api/submissions';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge, getSubmissionBadgeVariant } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Tooltip } from '@/components/ui/tooltip';
import { useToastStore } from '@/stores/toastStore';
import { cn } from '@/lib/utils';
import BulkSendModal from '@/components/BulkSendModal';

const STATUS_FILTERS = ['all', 'draft', 'sent', 'pending', 'questions', 'signed'] as const;

function relativeTime(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (days > 0) return `${days} day${days !== 1 ? 's' : ''} ago`;
  if (hours > 0) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  if (minutes > 0) return `${minutes} min${minutes !== 1 ? 's' : ''} ago`;
  return 'just now';
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .join('');
}

function SkeletonRow() {
  return (
    <TableRow>
      <TableCell>
        <div className="flex items-center gap-3">
          <div className="h-8 w-8 animate-pulse rounded-full bg-surface-raised" />
          <div className="space-y-1.5">
            <div className="h-3.5 w-28 animate-pulse rounded bg-surface-raised" />
            <div className="h-3 w-36 animate-pulse rounded bg-surface-raised" />
          </div>
        </div>
      </TableCell>
      <TableCell><div className="h-3.5 w-32 animate-pulse rounded bg-surface-raised" /></TableCell>
      <TableCell><div className="h-5 w-16 animate-pulse rounded-full bg-surface-raised" /></TableCell>
      <TableCell><div className="h-3.5 w-20 animate-pulse rounded bg-surface-raised" /></TableCell>
      <TableCell><div className="h-3.5 w-20 animate-pulse rounded bg-surface-raised" /></TableCell>
      <TableCell><div className="h-7 w-7 animate-pulse rounded bg-surface-raised" /></TableCell>
    </TableRow>
  );
}

export default function SubmissionIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [status, setStatus] = useState<string>('all');
  const [search, setSearch] = useState('');
  const [showBulkSend, setShowBulkSend] = useState(false);
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const debounceRef = useMemo(() => ({ timer: null as ReturnType<typeof setTimeout> | null }), []);

  useEffect(() => {
    return () => {
      if (debounceRef.timer) clearTimeout(debounceRef.timer);
    };
  }, [debounceRef]);

  const handleSearchChange = (value: string) => {
    setSearch(value);
    if (debounceRef.timer) clearTimeout(debounceRef.timer);
    debounceRef.timer = setTimeout(() => setDebouncedSearch(value), 300);
  };

  const filters: { status?: string; search?: string } = {};
  if (status !== 'all') filters.status = status;
  if (debouncedSearch) filters.search = debouncedSearch;

  const { data: submissions, isLoading, error } = useQuery({
    queryKey: ['submissions', filters],
    queryFn: () => getSubmissions(Object.keys(filters).length > 0 ? filters : undefined),
  });

  const hasActiveFilters = status !== 'all' || debouncedSearch !== '';

  const clearFilters = () => {
    setStatus('all');
    setSearch('');
    setDebouncedSearch('');
  };

  const resendMutation = useMutation({
    mutationFn: resendSubmission,
    onSuccess: () => {
      addToast('Reminder sent', 'success');
      queryClient.invalidateQueries({ queryKey: ['submissions'] });
    },
    onError: () => {
      addToast('Failed to resend email', 'error');
    },
  });

  const handleCopyLink = (token: string) => {
    const url = `${window.location.origin}/public/esign/${token}`;
    navigator.clipboard.writeText(url);
    addToast('Signing link copied', 'success');
  };

  return (
    <>
      <PageHeader
        title="Submissions"
        actions={
          <Button variant="secondary" onClick={() => setShowBulkSend(true)}>
            <Upload className="h-4 w-4" />
            Bulk Send
          </Button>
        }
      />
      <PageContent>
        {error && <p className="text-danger">Failed to load submissions.</p>}

        {/* Filter bar */}
        <div className="sticky top-0 z-10 -mx-6 mb-4 flex flex-wrap items-center gap-3 bg-background px-6 py-3">
          <div className="w-64">
            <Input
              leftIcon={Search}
              placeholder="Search recipient..."
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-1 rounded-lg border border-border p-1">
            {STATUS_FILTERS.map((s) => (
              <button
                key={s}
                onClick={() => setStatus(s)}
                aria-current={status === s ? 'true' : undefined}
                className={cn(
                  'rounded-md px-3 py-1 text-xs font-medium capitalize transition-colors',
                  status === s
                    ? 'bg-accent text-accent-foreground'
                    : 'text-text-secondary hover:bg-surface-raised hover:text-text-primary'
                )}
              >
                {s}
              </button>
            ))}
          </div>

          <span className="ml-auto text-sm text-text-secondary">
            {submissions ? `${submissions.length} submission${submissions.length !== 1 ? 's' : ''}` : ''}
          </span>
        </div>

        {/* Loading skeleton */}
        {isLoading && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 8 }).map((_, i) => (
                <SkeletonRow key={i} />
              ))}
            </TableBody>
          </Table>
        )}

        {/* Empty state */}
        {submissions && submissions.length === 0 && (
          <EmptyState
            icon={Send}
            title="No submissions found"
            description={hasActiveFilters ? 'Try adjusting your filters' : 'Send a document to get started'}
            action={
              hasActiveFilters ? (
                <Button variant="secondary" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        )}

        {/* Table */}
        {submissions && submissions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Recipient</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Sent</TableHead>
                <TableHead>Signed</TableHead>
                <TableHead className="w-[50px]" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {submissions.map((sub) => (
                <TableRow
                  key={sub.id}
                  onClick={() => navigate(`/submissions/${sub.id}`)}
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-accent/15 text-xs font-semibold text-accent">
                        {getInitials(sub.recipient_name)}
                      </div>
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium text-text-primary">
                          {sub.recipient_name}
                        </div>
                        <div className="truncate text-xs text-text-secondary">
                          {sub.recipient_email}
                        </div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{sub.document?.name ?? '—'}</TableCell>
                  <TableCell>
                    <Badge variant={getSubmissionBadgeVariant(sub.status)}>
                      {sub.status}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {sub.sent_at ? (
                      <Tooltip content={new Date(sub.sent_at).toLocaleString()}>
                        <span className="text-text-secondary">{relativeTime(sub.sent_at)}</span>
                      </Tooltip>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {sub.signed_at ? (
                      <Tooltip content={new Date(sub.signed_at).toLocaleString()}>
                        <span className="text-text-secondary">{relativeTime(sub.signed_at)}</span>
                      </Tooltip>
                    ) : (
                      <span className="text-text-tertiary">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7"
                          onClick={(e: React.MouseEvent) => e.stopPropagation()}
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/submissions/${sub.id}`);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                          View Details
                        </DropdownMenuItem>
                        {(sub.status === 'sent' || sub.status === 'pending') && (
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              resendMutation.mutate(sub.id);
                            }}
                          >
                            <RefreshCw className="h-4 w-4" />
                            Resend Email
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            handleCopyLink(sub.token);
                          }}
                        >
                          <Link className="h-4 w-4" />
                          Copy signing link
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </PageContent>
      {showBulkSend && <BulkSendModal onClose={() => setShowBulkSend(false)} />}
    </>
  );
}
