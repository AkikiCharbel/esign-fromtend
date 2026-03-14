import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { FileText, Plus, Search, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { getDocuments, deleteDocument } from '../../api/documents';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { EmptyState } from '@/components/ui/EmptyState';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/Table';
import { Spinner } from '@/components/ui/Spinner';
import { useToastStore } from '@/stores/toastStore';

export default function DocumentIndex() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const [search, setSearch] = useState('');

  const { data: documents, isLoading, error } = useQuery({
    queryKey: ['documents'],
    queryFn: getDocuments,
  });

  const deleteMutation = useMutation({
    mutationFn: deleteDocument,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents'] });
      addToast('Document deleted', 'success');
    },
    onError: () => {
      addToast('Failed to delete document', 'error');
    },
  });

  const filtered = documents?.filter((d) =>
    d.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <PageHeader
        title="Documents"
        description="Manage your signing documents"
        actions={
          <Button onClick={() => navigate('/documents/create')}>
            <Plus className="h-4 w-4" />
            New Document
          </Button>
        }
      />
      <PageContent>
        {error && <p className="text-danger">Failed to load documents.</p>}

        {isLoading && (
          <div className="flex items-center justify-center py-20">
            <Spinner size="lg" />
          </div>
        )}

        {documents && documents.length === 0 && (
          <EmptyState
            icon={FileText}
            title="No documents yet"
            description="Create a document from a template to start collecting signatures"
            action={
              <Button onClick={() => navigate('/documents/create')}>
                Create your first document
              </Button>
            }
          />
        )}

        {filtered && filtered.length > 0 && (
          <>
            <div className="mb-4 max-w-sm">
              <Input
                leftIcon={Search}
                placeholder="Search documents..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Template</TableHead>
                  <TableHead>Signers</TableHead>
                  <TableHead>Attachments</TableHead>
                  <TableHead>Created</TableHead>
                  <TableHead className="w-[80px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((doc) => (
                  <TableRow key={doc.id} onClick={() => navigate(`/documents/${doc.id}`)}>
                    <TableCell className="font-medium">{doc.name}</TableCell>
                    <TableCell className="text-text-secondary">
                      {doc.template?.name ?? '—'}
                    </TableCell>
                    <TableCell>
                      <Badge variant="default">
                        {doc.signers?.length ?? 0} signer{(doc.signers?.length ?? 0) !== 1 ? 's' : ''}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {doc.has_attachments ? (
                        <Badge variant="warning">Required</Badge>
                      ) : (
                        <span className="text-text-tertiary">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-text-secondary">
                      {new Date(doc.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-7 w-7"
                        onClick={(e: React.MouseEvent) => {
                          e.stopPropagation();
                          deleteMutation.mutate(doc.id);
                        }}
                      >
                        <Trash2 className="h-3.5 w-3.5 text-text-tertiary" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}

        {documents && documents.length > 0 && filtered && filtered.length === 0 && (
          <EmptyState
            icon={Search}
            title="No documents match"
            description="Try a different search term"
          />
        )}
      </PageContent>
    </>
  );
}
