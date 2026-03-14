import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Plus, FileText, Trash2 } from 'lucide-react';
import { getTemplates, createTemplate, deleteTemplate, updateTemplate } from '../../api/templates';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/EmptyState';
import { useToastStore } from '@/stores/toastStore';

function TemplateCardSkeleton() {
  return (
    <Card className="p-5">
      <div className="mb-4 flex h-20 w-full items-center justify-center rounded-lg bg-surface-raised animate-pulse" />
      <div className="h-4 w-3/4 animate-pulse rounded bg-surface-raised" />
      <div className="mt-2 h-3 w-full animate-pulse rounded bg-surface-raised" />
      <div className="mt-1 h-3 w-2/3 animate-pulse rounded bg-surface-raised" />
      <div className="mt-4 flex items-center justify-between">
        <div className="h-5 w-14 animate-pulse rounded-full bg-surface-raised" />
        <div className="h-7 w-24 animate-pulse rounded bg-surface-raised" />
      </div>
    </Card>
  );
}

export default function TemplateIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const { data: templates, isLoading, error } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const createMutation = useMutation({
    mutationFn: () => createTemplate({ name: 'Untitled Template' }),
    onSuccess: (template) => navigate(`/templates/${template.id}/builder`),
    onError: () => addToast('Failed to create template', 'error'),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteTemplate,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      addToast('Template deleted', 'success');
    },
    onError: () => addToast('Failed to delete template', 'error'),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: number; status: string }) => updateTemplate(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['templates'] });
    },
    onError: () => addToast('Failed to update status', 'error'),
  });

  return (
    <>
      <PageHeader
        title="Templates"
        description="PDF templates with configurable form fields"
        actions={
          <Button
            onClick={() => createMutation.mutate()}
            loading={createMutation.isPending}
          >
            <Plus className="h-4 w-4" />
            New Template
          </Button>
        }
      />
      <PageContent>
        {error && <p className="text-danger">Failed to load templates.</p>}

        {isLoading && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <TemplateCardSkeleton key={i} />
            ))}
          </div>
        )}

        {templates && templates.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No templates yet"
            description="Upload a PDF and add form fields to create your first template"
            action={
              <Button
                onClick={() => createMutation.mutate()}
                loading={createMutation.isPending}
              >
                Create your first template
              </Button>
            }
          />
        )}

        {templates && templates.length > 0 && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {templates.map((template) => (
              <Card
                key={template.id}
                hoverable
                className="p-5"
                onClick={() => navigate(`/templates/${template.id}/builder`)}
              >
                <div className="mb-4 flex h-20 w-full items-center justify-center rounded-lg bg-accent-subtle">
                  <FileText className="h-10 w-10 text-accent" />
                </div>
                <h3 className="font-medium text-text-primary">{template.name}</h3>
                {template.description && (
                  <p className="mt-1 text-sm text-text-secondary line-clamp-2">
                    {template.description}
                  </p>
                )}
                <div className="mt-4 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={template.status === 'active' ? 'success' : 'warning'}
                      className="cursor-pointer"
                      onClick={(e) => {
                        e.stopPropagation();
                        statusMutation.mutate({
                          id: template.id,
                          status: template.status === 'active' ? 'draft' : 'active',
                        });
                      }}
                      title={`Click to ${template.status === 'active' ? 'deactivate' : 'activate'}`}
                    >
                      {template.status}
                    </Badge>
                    <span className="text-xs text-text-tertiary">
                      {template.page_count} {template.page_count === 1 ? 'page' : 'pages'}
                    </span>
                  </div>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 text-text-tertiary hover:text-danger"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (window.confirm('Delete this template? This cannot be undone.')) {
                          deleteMutation.mutate(template.id);
                        }
                      }}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/templates/${template.id}/builder`);
                      }}
                    >
                      Open Builder
                    </Button>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </PageContent>
    </>
  );
}
