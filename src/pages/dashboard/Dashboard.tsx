import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getDashboardStats, getRecentSubmissions } from '../../api/dashboard';
import type { DashboardStats } from '../../types';

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  sent: { bg: '#dbeafe', color: '#1e40af' },
  viewed: { bg: '#e0e7ff', color: '#3730a3' },
  signed: { bg: '#dcfce7', color: '#166534' },
  expired: { bg: '#fee2e2', color: '#991b1b' },
  declined: { bg: '#fecaca', color: '#991b1b' },
};

const STAT_CARDS: { key: keyof DashboardStats; label: string; color: string }[] = [
  { key: 'total_sent', label: 'Total Sent', color: '#2563eb' },
  { key: 'pending', label: 'Pending', color: '#d97706' },
  { key: 'signed_this_week', label: 'Signed This Week', color: '#16a34a' },
  { key: 'expired', label: 'Expired', color: '#ef4444' },
];

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
      <div style={{ padding: 24 }}>
        <h1 style={{ margin: '0 0 24px', fontSize: 24 }}>Dashboard</h1>
        <p style={{ color: '#ef4444' }}>Failed to load dashboard data. Please try again later.</p>
      </div>
    );
  }

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 24px', fontSize: 24 }}>Dashboard</h1>

      {/* Stat cards */}
      {statsError ? (
        <p style={{ color: '#ef4444', marginBottom: 32 }}>Failed to load stats.</p>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 16, marginBottom: 32 }}>
          {STAT_CARDS.map((card) => {
            const value = statsLoading ? '—' : (stats?.[card.key] ?? 0);
            return (
              <div
                key={card.key}
                style={{
                  padding: 20,
                  background: '#fff',
                  border: '1px solid #e5e7eb',
                  borderRadius: 8,
                }}
              >
                <p style={{ margin: '0 0 4px', fontSize: 13, color: '#6b7280' }}>{card.label}</p>
                <p style={{ margin: 0, fontSize: 28, fontWeight: 700, color: card.color }}>{value}</p>
              </div>
            );
          })}
        </div>
      )}

      {/* Recent submissions */}
      <h2 style={{ margin: '0 0 16px', fontSize: 18 }}>Recent Submissions</h2>

      {recentError && <p style={{ color: '#ef4444' }}>Failed to load recent submissions.</p>}
      {recentLoading && <p style={{ color: '#6b7280' }}>Loading...</p>}

      {recentSubmissions && recentSubmissions.length === 0 && (
        <p style={{ color: '#6b7280' }}>No submissions yet.</p>
      )}

      {recentSubmissions && recentSubmissions.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Recipient</th>
              <th style={{ padding: '8px 12px' }}>Document</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Sent</th>
            </tr>
          </thead>
          <tbody>
            {recentSubmissions.map((sub) => {
              const statusStyle = STATUS_COLORS[sub.status] ?? { bg: '#f3f4f6', color: '#374151' };
              return (
                <tr
                  key={sub.id}
                  onClick={() => navigate(`/submissions/${sub.id}`)}
                  style={{ borderBottom: '1px solid #e5e7eb', cursor: 'pointer' }}
                  onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#f9fafb')}
                  onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = '')}
                >
                  <td style={{ padding: '10px 12px', fontWeight: 500 }}>{sub.recipient_name}</td>
                  <td style={{ padding: '10px 12px' }}>{sub.document?.name ?? '—'}</td>
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
                </tr>
              );
            })}
          </tbody>
        </table>
      )}
    </div>
  );
}
