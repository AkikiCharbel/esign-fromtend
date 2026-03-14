import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Send, Clock, CheckCircle, AlertCircle } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { getDashboardStats, getRecentSubmissions } from '../../api/dashboard';
import type { DashboardStats } from '../../types';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { Card } from '@/components/ui/Card';
import { Badge, getSubmissionBadgeVariant } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';

interface StatCardConfig {
  key: keyof DashboardStats;
  label: string;
  icon: LucideIcon;
  color: string;
  bgColor: string;
  borderColor: string;
}

const STAT_CARDS: StatCardConfig[] = [
  {
    key: 'awaiting_signature',
    label: 'Awaiting Signature',
    icon: Send,
    color: 'text-accent',
    bgColor: 'bg-accent-subtle',
    borderColor: 'border-accent/30',
  },
  {
    key: 'pending',
    label: 'Pending',
    icon: Clock,
    color: 'text-warning',
    bgColor: 'bg-warning-subtle',
    borderColor: 'border-warning/30',
  },
  {
    key: 'signed_this_week',
    label: 'Signed This Week',
    icon: CheckCircle,
    color: 'text-success',
    bgColor: 'bg-success-subtle',
    borderColor: 'border-success/30',
  },
  {
    key: 'expired',
    label: 'Expired',
    icon: AlertCircle,
    color: 'text-danger',
    bgColor: 'bg-danger-subtle',
    borderColor: 'border-danger/30',
  },
];

function StatCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="flex items-start justify-between">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-surface-raised" />
      </div>
      <div className="mt-4 h-8 w-16 animate-pulse rounded bg-surface-raised" />
      <div className="mt-2 h-4 w-24 animate-pulse rounded bg-surface-raised" />
      <div className="mt-4 h-px w-full animate-pulse rounded bg-surface-raised" />
    </Card>
  );
}

function TableRowSkeleton() {
  return (
    <TableRow>
      <TableCell><div className="h-4 w-28 animate-pulse rounded bg-surface-raised" /></TableCell>
      <TableCell><div className="h-4 w-36 animate-pulse rounded bg-surface-raised" /></TableCell>
      <TableCell><div className="h-5 w-16 animate-pulse rounded-full bg-surface-raised" /></TableCell>
      <TableCell><div className="h-4 w-20 animate-pulse rounded bg-surface-raised" /></TableCell>
      <TableCell><div className="h-7 w-12 animate-pulse rounded bg-surface-raised" /></TableCell>
    </TableRow>
  );
}

export default function Dashboard() {
  const navigate = useNavigate();

  const { data: stats, isLoading: statsLoading, error: statsError } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: getDashboardStats,
  });

  const { data: recentSubmissions, isLoading: recentLoading, error: recentError } = useQuery({
    queryKey: ['dashboard-recent'],
    queryFn: getRecentSubmissions,
  });

  if (statsError && recentError) {
    return (
      <>
        <PageHeader title="Dashboard" />
        <PageContent>
          <p className="text-danger">Failed to load dashboard data. Please try again later.</p>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Dashboard" />
      <PageContent>
        {/* Stat cards */}
        {statsError ? (
          <p className="mb-8 text-danger">Failed to load stats.</p>
        ) : (
          <div className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => <StatCardSkeleton key={i} />)
              : STAT_CARDS.map((card) => {
                  const Icon = card.icon;
                  return (
                    <Card key={card.key} className={`p-5 border-b-2 ${card.borderColor}`}>
                      <div className="flex items-start justify-between">
                        <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${card.bgColor}`}>
                          <Icon className={`h-5 w-5 ${card.color}`} />
                        </div>
                      </div>
                      <p className={`mt-4 font-mono text-3xl font-semibold ${card.color}`}>
                        {stats?.[card.key] ?? 0}
                      </p>
                      <p className="mt-1 text-sm text-text-secondary">{card.label}</p>
                      <div className={`mt-4 border-b ${card.borderColor}`} />
                    </Card>
                  );
                })}
          </div>
        )}

        {/* Recent submissions */}
        <h2 className="mb-4 text-lg font-semibold text-text-primary">Recent Submissions</h2>

        {recentError && <p className="text-danger">Failed to load recent submissions.</p>}

        {recentLoading && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {Array.from({ length: 5 }).map((_, i) => (
                  <TableRowSkeleton key={i} />
                ))}
              </TableBody>
            </Table>
          </Card>
        )}

        {recentSubmissions && recentSubmissions.length === 0 && (
          <Card>
            <EmptyState
              icon={Send}
              title="No submissions yet"
              description="Send your first document to get started"
            />
          </Card>
        )}

        {recentSubmissions && recentSubmissions.length > 0 && (
          <Card>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Recipient</TableHead>
                  <TableHead>Document</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Sent</TableHead>
                  <TableHead>Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentSubmissions.map((sub) => (
                  <TableRow key={sub.id}>
                    <TableCell className="font-medium text-text-primary">{sub.recipient_name}</TableCell>
                    <TableCell>{sub.document?.name ?? '\u2014'}</TableCell>
                    <TableCell>
                      <Badge variant={getSubmissionBadgeVariant(sub.status)}>
                        {sub.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {sub.sent_at ? new Date(sub.sent_at).toLocaleDateString() : '\u2014'}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(`/submissions/${sub.id}`)}
                      >
                        View
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </PageContent>
    </>
  );
}
