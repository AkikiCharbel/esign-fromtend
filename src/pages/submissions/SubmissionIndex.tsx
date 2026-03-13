import { useState, useMemo, useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { getSubmissions } from '../../api/submissions';

const STATUS_OPTIONS = ['all', 'pending', 'sent', 'viewed', 'signed', 'expired', 'declined'];

const STATUS_COLORS: Record<string, { bg: string; color: string }> = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  sent: { bg: '#dbeafe', color: '#1e40af' },
  viewed: { bg: '#e0e7ff', color: '#3730a3' },
  signed: { bg: '#dcfce7', color: '#166534' },
  expired: { bg: '#fee2e2', color: '#991b1b' },
  declined: { bg: '#fecaca', color: '#991b1b' },
};

export default function SubmissionIndex() {
  const navigate = useNavigate();
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
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

  if (error) return <p style={{ padding: 24, color: 'red' }}>Failed to load submissions.</p>;

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ margin: '0 0 24px' }}>Submissions</h1>

      {/* Filter bar */}
      <div style={{ display: 'flex', gap: 12, marginBottom: 20 }}>
        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            background: '#fff',
          }}
        >
          {STATUS_OPTIONS.map((s) => (
            <option key={s} value={s}>
              {s === 'all' ? 'All Statuses' : s.charAt(0).toUpperCase() + s.slice(1)}
            </option>
          ))}
        </select>

        <input
          type="text"
          placeholder="Search by name or email..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          style={{
            padding: '8px 12px',
            border: '1px solid #d1d5db',
            borderRadius: 6,
            fontSize: 14,
            flex: 1,
            maxWidth: 360,
          }}
        />
      </div>

      {isLoading && <p>Loading submissions...</p>}

      {submissions && submissions.length === 0 && <p style={{ color: '#6b7280' }}>No submissions found.</p>}

      {submissions && submissions.length > 0 && (
        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
              <th style={{ padding: '8px 12px' }}>Recipient</th>
              <th style={{ padding: '8px 12px' }}>Email</th>
              <th style={{ padding: '8px 12px' }}>Document</th>
              <th style={{ padding: '8px 12px' }}>Status</th>
              <th style={{ padding: '8px 12px' }}>Sent At</th>
              <th style={{ padding: '8px 12px' }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {submissions.map((sub) => {
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
                  <td style={{ padding: '10px 12px', color: '#6b7280' }}>{sub.recipient_email}</td>
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
                  <td style={{ padding: '10px 12px' }}>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/submissions/${sub.id}`);
                      }}
                      style={{
                        padding: '4px 12px',
                        background: '#2563eb',
                        color: '#fff',
                        border: 'none',
                        borderRadius: 4,
                        cursor: 'pointer',
                        fontSize: 12,
                      }}
                    >
                      View
                    </button>
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
