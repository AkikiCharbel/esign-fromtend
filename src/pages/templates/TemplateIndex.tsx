import { useQuery } from '@tanstack/react-query';
import { Link, useNavigate } from 'react-router-dom';
import { getTemplates } from '../../api/templates';

export default function TemplateIndex() {
  const navigate = useNavigate();
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  if (isLoading) return <p>Loading templates…</p>;
  if (error) return <p style={{ color: 'red' }}>Failed to load templates.</p>;

  return (
    <div style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
        <h1 style={{ margin: 0 }}>Templates</h1>
        <Link to="/templates/new" style={{ padding: '8px 16px', background: '#2563eb', color: '#fff', borderRadius: 6, textDecoration: 'none' }}>
          New Template
        </Link>
      </div>

      {templates && templates.length === 0 && <p>No templates yet.</p>}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
        {templates?.map((template) => (
          <div
            key={template.id}
            onClick={() => navigate(`/templates/${template.id}/builder`)}
            style={{
              border: '1px solid #e5e7eb',
              borderRadius: 8,
              padding: 16,
              cursor: 'pointer',
              transition: 'box-shadow 0.15s',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)')}
            onMouseLeave={(e) => (e.currentTarget.style.boxShadow = 'none')}
          >
            {template.pdf_url && (
              <div style={{ height: 160, overflow: 'hidden', borderRadius: 4, marginBottom: 12, background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img
                  src={template.pdf_url.replace(/\.pdf$/, '.jpg')}
                  alt={template.name}
                  style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain' }}
                  onError={(e) => {
                    e.currentTarget.style.display = 'none';
                  }}
                />
              </div>
            )}
            <h3 style={{ margin: '0 0 8px', fontSize: 16 }}>{template.name}</h3>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', fontSize: 14, color: '#6b7280' }}>
              <span
                style={{
                  padding: '2px 8px',
                  borderRadius: 12,
                  fontSize: 12,
                  fontWeight: 600,
                  background: template.status === 'active' ? '#dcfce7' : '#fef3c7',
                  color: template.status === 'active' ? '#166534' : '#92400e',
                }}
              >
                {template.status}
              </span>
              <span>{template.page_count} {template.page_count === 1 ? 'page' : 'pages'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
