import { useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { ExternalLink, Paperclip, Plus, Send, UserPlus, X } from 'lucide-react';
import { getDocument, addSigner, removeSigner } from '../../api/documents';
import { createSubmission } from '../../api/submissions';
import PdfViewer from '../../components/PdfViewer/PdfViewer';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { Spinner } from '@/components/ui/Spinner';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { useToastStore } from '@/stores/toastStore';

const sendSchema = z.object({
  recipient_name: z.string().min(1, 'Name is required'),
  recipient_email: z.string().email('Invalid email'),
});

type SendForm = z.infer<typeof sendSchema>;

const signerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.string().min(1, 'Role is required'),
});

type SignerFormData = z.infer<typeof signerSchema>;

export default function DocumentShow() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const documentId = Number(id);
  const [showSendPanel, setShowSendPanel] = useState(false);
  const [showAddSigner, setShowAddSigner] = useState(false);

  const { data: document, isLoading, error } = useQuery({
    queryKey: ['documents', documentId],
    queryFn: () => getDocument(documentId),
    enabled: !isNaN(documentId),
  });

  const sendForm = useForm<SendForm>({
    resolver: zodResolver(sendSchema),
  });

  const signerForm = useForm<SignerFormData>({
    resolver: zodResolver(signerSchema),
  });

  const sendMutation = useMutation({
    mutationFn: (data: SendForm) =>
      createSubmission({
        document_id: documentId,
        recipient_name: data.recipient_name,
        recipient_email: data.recipient_email,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
      addToast('Submission created successfully', 'success');
      navigate('/submissions');
    },
    onError: () => addToast('Failed to send submission', 'error'),
  });

  const addSignerMutation = useMutation({
    mutationFn: (data: SignerFormData) => {
      const signers = document?.signers ?? [];
      return addSigner(documentId, {
        ...data,
        sign_order: signers.length + 1,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
      signerForm.reset({ name: '', email: '', role: '' });
      setShowAddSigner(false);
      addToast('Signer added', 'success');
    },
    onError: () => addToast('Failed to add signer', 'error'),
  });

  const removeSignerMutation = useMutation({
    mutationFn: removeSigner,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['documents', documentId] });
      addToast('Signer removed', 'success');
    },
    onError: () => addToast('Failed to remove signer', 'error'),
  });

  const handleSend = (data: SendForm) => {
    sendMutation.mutate(data);
  };

  const handleAddSigner = (data: SignerFormData) => {
    addSignerMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error || !document) {
    return (
      <div className="p-6">
        <p className="text-danger">Failed to load document.</p>
      </div>
    );
  }

  const signers = document.signers ?? [];

  return (
    <div>
      <PageHeader
        title={document.name}
        actions={
          <Button onClick={() => setShowSendPanel((v) => !v)}>
            <Send className="mr-1.5 h-4 w-4" />
            Send to...
          </Button>
        }
      />

      {/* Send panel - inline slide down */}
      {showSendPanel && (
        <div className="border-b border-border bg-surface px-6 py-4">
          <form onSubmit={sendForm.handleSubmit(handleSend)} className="mx-auto flex max-w-2xl items-start gap-3">
            <div className="flex-1">
              <Input
                placeholder="Recipient name"
                {...sendForm.register('recipient_name')}
                error={sendForm.formState.errors.recipient_name?.message}
              />
            </div>
            <div className="flex-1">
              <Input
                placeholder="Recipient email"
                type="email"
                {...sendForm.register('recipient_email')}
                error={sendForm.formState.errors.recipient_email?.message}
              />
            </div>
            <Button type="submit" disabled={sendMutation.isPending} loading={sendMutation.isPending}>
              Send
            </Button>
          </form>
          {sendMutation.isError && (
            <p className="mx-auto mt-2 max-w-2xl text-sm text-danger">Failed to send. Please try again.</p>
          )}
        </div>
      )}

      <PageContent>
        <div className="flex flex-col gap-6 lg:flex-row">
          {/* LEFT — Template Preview */}
          <div className="flex-1 min-w-0">
            <Card>
              <CardHeader>
                <CardTitle>Template Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {document.template && (
                  <div className="space-y-3">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium text-text-primary">{document.template.name}</span>
                      <Badge variant={document.template.status === 'active' ? 'success' : 'default'}>
                        {document.template.status}
                      </Badge>
                    </div>
                    <p className="text-xs text-text-tertiary">
                      {document.template.page_count} page{document.template.page_count !== 1 ? 's' : ''}
                    </p>
                    {document.template.pdf_url && (
                      <div className="h-[300px] overflow-hidden rounded-md border border-border">
                        <PdfViewer pdfUrl={document.template.pdf_url} />
                      </div>
                    )}
                    <Link
                      to={`/templates/${document.template.id}/builder`}
                      className="inline-flex items-center gap-1 text-sm text-accent hover:text-accent-hover"
                    >
                      Open Builder
                      <ExternalLink className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                )}
                {!document.template && (
                  <p className="text-sm text-text-secondary">No template linked.</p>
                )}
              </CardContent>
            </Card>
          </div>

          {/* RIGHT — Signers + Details */}
          <div className="w-full shrink-0 space-y-6 lg:w-[300px]">
            {/* Signers Card */}
            <Card>
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle>Signers</CardTitle>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowAddSigner((v) => !v)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  Add Signer
                </Button>
              </CardHeader>
              <CardContent>
                {showAddSigner && (
                  <form onSubmit={signerForm.handleSubmit(handleAddSigner)} className="mb-4 space-y-2">
                    <Input
                      placeholder="Name"
                      {...signerForm.register('name')}
                      error={signerForm.formState.errors.name?.message}
                    />
                    <Input
                      placeholder="Email"
                      type="email"
                      {...signerForm.register('email')}
                      error={signerForm.formState.errors.email?.message}
                    />
                    <Input
                      placeholder="Role"
                      {...signerForm.register('role')}
                      error={signerForm.formState.errors.role?.message}
                    />
                    <div className="flex gap-2">
                      <Button type="submit" size="sm" loading={addSignerMutation.isPending}>
                        Add
                      </Button>
                      <Button type="button" variant="ghost" size="sm" onClick={() => setShowAddSigner(false)}>
                        Cancel
                      </Button>
                    </div>
                  </form>
                )}

                {signers.length === 0 && !showAddSigner ? (
                  <EmptyState
                    icon={UserPlus}
                    title="No signers"
                    className="py-6"
                  />
                ) : (
                  <div className="space-y-2">
                    {signers.map((signer) => (
                      <div key={signer.id} className="flex items-center gap-2.5">
                        <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
                          {signer.name.charAt(0).toUpperCase()}
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium text-text-primary">{signer.name}</p>
                          <p className="truncate text-xs text-text-tertiary">{signer.email}</p>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <Badge variant="outline" className="text-[10px]">{signer.role}</Badge>
                          <span className="text-[10px] text-text-tertiary">#{signer.sign_order}</span>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-5 w-5"
                            onClick={() => removeSignerMutation.mutate(signer.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Document Details Card */}
            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {document.custom_message && (
                    <div>
                      <p className="text-xs font-medium text-text-tertiary">Custom Message</p>
                      <p className="mt-0.5 text-sm text-text-secondary">{document.custom_message}</p>
                    </div>
                  )}
                  {(document.reply_to_name || document.reply_to_email) && (
                    <div>
                      <p className="text-xs font-medium text-text-tertiary">Reply To</p>
                      <p className="mt-0.5 text-sm text-text-secondary">
                        {document.reply_to_name}{document.reply_to_name && document.reply_to_email ? ' — ' : ''}{document.reply_to_email}
                      </p>
                    </div>
                  )}
                  {document.has_attachments && (
                    <div className="flex items-center gap-1.5">
                      <Paperclip className="h-3.5 w-3.5 text-text-tertiary" />
                      <Badge variant="warning">Attachments Required</Badge>
                    </div>
                  )}
                  {!document.custom_message && !document.reply_to_name && !document.reply_to_email && !document.has_attachments && (
                    <p className="text-sm text-text-tertiary">No additional details set.</p>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </PageContent>
    </div>
  );
}
