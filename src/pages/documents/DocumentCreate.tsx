import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useToastStore } from '@/stores/toastStore';
import {
  ArrowLeft,
  Check,
  FileText,
  GripVertical,
  Plus,
  Search,
  UserPlus,
  X,
} from 'lucide-react';
import { getTemplates } from '../../api/templates';
import { createDocument, addSigner } from '../../api/documents';
import type { Template } from '../../types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Textarea } from '@/components/ui/Textarea';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card';
import { EmptyState } from '@/components/ui/EmptyState';
import { StepIndicator } from '@/components/ui/StepIndicator';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { cn } from '@/lib/utils';

const STEPS = ['Choose Template', 'Document Details', 'Add Signers'];

const detailsSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  custom_message: z.string().optional(),
  reply_to_email: z.string().email('Invalid email').optional().or(z.literal('')),
  reply_to_name: z.string().optional(),
  has_attachments: z.boolean(),
  attachment_instructions: z.string().optional(),
});

type DetailsForm = z.infer<typeof detailsSchema>;

const signerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  email: z.string().email('Invalid email'),
  role: z.string().min(1, 'Role is required'),
});

type SignerForm = z.infer<typeof signerSchema>;

interface SignerEntry {
  name: string;
  email: string;
  role: string;
}

export default function DocumentCreate() {
  const navigate = useNavigate();
  const addToast = useToastStore((s) => s.addToast);
  const [step, setStep] = useState(0);
  const [selectedTemplate, setSelectedTemplate] = useState<Template | null>(null);
  const [signers, setSigners] = useState<SignerEntry[]>([]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  const { data: templates, isLoading: loadingTemplates } = useQuery({
    queryKey: ['templates'],
    queryFn: getTemplates,
  });

  const activeTemplates = templates
    ?.filter((t) => t.status === 'active')
    .filter((t) => t.name.toLowerCase().includes(searchQuery.toLowerCase()));

  const detailsForm = useForm<DetailsForm>({
    resolver: zodResolver(detailsSchema),
    defaultValues: { has_attachments: false },
  });

  const signerForm = useForm<SignerForm>({
    resolver: zodResolver(signerSchema),
  });

  const hasAttachments = detailsForm.watch('has_attachments');

  const createMutation = useMutation({
    mutationFn: async (details: DetailsForm) => {
      const doc = await createDocument({
        template_id: selectedTemplate!.id,
        name: details.name,
        custom_message: details.custom_message || undefined,
        reply_to_email: details.reply_to_email || undefined,
        reply_to_name: details.reply_to_name || undefined,
        has_attachments: details.has_attachments,
        attachment_instructions: details.attachment_instructions || undefined,
      });

      for (let i = 0; i < signers.length; i++) {
        await addSigner(doc.id, {
          name: signers[i].name,
          email: signers[i].email,
          role: signers[i].role,
          sign_order: i + 1,
        });
      }

      return doc;
    },
    onSuccess: (doc) => navigate(`/documents/${doc.id}`),
    onError: () => addToast('Failed to create document', 'error'),
  });

  const handleDetailsSubmit = (data: DetailsForm) => {
    detailsForm.reset(data);
    setStep(2);
  };

  const handleAddSigner = (data: SignerForm) => {
    setSigners((prev) => [...prev, data]);
    signerForm.reset({ name: '', email: '', role: '' });
  };

  const handleRemoveSigner = (index: number) => {
    setSigners((prev) => prev.filter((_, i) => i !== index));
  };

  const handleDragStart = (index: number) => setDragIndex(index);
  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    if (dragIndex === null || dragIndex === index) return;
    setSigners((prev) => {
      const next = [...prev];
      const [moved] = next.splice(dragIndex, 1);
      next.splice(index, 0, moved);
      return next;
    });
    setDragIndex(index);
  };
  const handleDragEnd = () => setDragIndex(null);

  const handleCreate = () => {
    createMutation.mutate(detailsForm.getValues());
  };

  const getTemplateBadgeVariant = (status: string) => {
    if (status === 'active') return 'success' as const;
    if (status === 'draft') return 'default' as const;
    return 'default' as const;
  };

  return (
    <div>
      <PageHeader
        title="Create Document"
        actions={
          <Button variant="ghost" size="sm" onClick={() => navigate('/documents')}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />
      <PageContent>
        <div className="mx-auto max-w-3xl">
          <div className="mb-8">
            <StepIndicator steps={STEPS} currentStep={step} />
          </div>

          {/* Step 1: Choose Template */}
          {step === 0 && (
            <div>
              <div className="mb-4">
                <Input
                  leftIcon={Search}
                  placeholder="Search templates..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              {loadingTemplates && (
                <p className="py-8 text-center text-text-secondary">Loading templates...</p>
              )}

              {activeTemplates && activeTemplates.length === 0 && (
                <EmptyState
                  icon={FileText}
                  title="No templates found"
                  description={searchQuery ? 'Try a different search term' : 'Create an active template first'}
                />
              )}

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {activeTemplates?.map((t) => {
                  const isSelected = selectedTemplate?.id === t.id;
                  return (
                    <div
                      key={t.id}
                      onClick={() => setSelectedTemplate(t)}
                      className={cn(
                        'relative cursor-pointer rounded-lg border-2 p-4 transition-colors hover:border-accent/50',
                        isSelected ? 'border-accent bg-accent-subtle' : 'border-transparent bg-surface'
                      )}
                    >
                      {isSelected && (
                        <div className="absolute right-2 top-2 flex h-5 w-5 items-center justify-center rounded-full bg-accent">
                          <Check className="h-3 w-3 text-white" />
                        </div>
                      )}
                      <div className="mb-3 flex h-16 items-center justify-center rounded bg-surface-raised">
                        <FileText className="h-8 w-8 text-text-tertiary" />
                      </div>
                      <p className="text-sm font-medium text-text-primary">{t.name}</p>
                      <div className="mt-1.5 flex items-center gap-2">
                        <span className="text-xs text-text-tertiary">{t.page_count} page{t.page_count !== 1 ? 's' : ''}</span>
                        <Badge variant={getTemplateBadgeVariant(t.status)}>{t.status}</Badge>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-6 flex justify-end">
                <Button disabled={!selectedTemplate} onClick={() => setStep(1)}>
                  Next
                </Button>
              </div>
            </div>
          )}

          {/* Step 2: Document Details */}
          {step === 1 && (
            <Card>
              <CardHeader>
                <CardTitle>Document Details</CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={detailsForm.handleSubmit(handleDetailsSubmit)} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Document Name *</label>
                    <Input
                      {...detailsForm.register('name')}
                      error={detailsForm.formState.errors.name?.message}
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-sm font-medium text-text-primary">Custom Message</label>
                    <Textarea
                      {...detailsForm.register('custom_message')}
                      placeholder="Add a personal message to the recipient..."
                      rows={3}
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-text-primary">Reply-To Name</label>
                      <Input {...detailsForm.register('reply_to_name')} />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-text-primary">Reply-To Email</label>
                      <Input
                        type="email"
                        {...detailsForm.register('reply_to_email')}
                        error={detailsForm.formState.errors.reply_to_email?.message}
                      />
                    </div>
                  </div>

                  {/* Attachment toggle */}
                  <div className="flex items-center justify-between rounded-lg border border-border p-4">
                    <div>
                      <p className="text-sm font-medium text-text-primary">Require Attachments</p>
                      <p className="text-sm text-text-secondary">Ask the recipient to upload files when signing</p>
                    </div>
                    <label className="relative inline-flex cursor-pointer">
                      <input
                        type="checkbox"
                        {...detailsForm.register('has_attachments')}
                        className="peer sr-only"
                      />
                      <div className="h-5 w-9 rounded-full bg-surface-raised transition-colors peer-checked:bg-accent peer-focus-visible:ring-2 peer-focus-visible:ring-accent/50 after:absolute after:left-[2px] after:top-[2px] after:h-4 after:w-4 after:rounded-full after:bg-text-tertiary after:transition-transform peer-checked:after:translate-x-4 peer-checked:after:bg-white" />
                    </label>
                  </div>

                  {hasAttachments && (
                    <div className="space-y-1.5">
                      <label className="text-sm font-medium text-text-primary">Attachment Instructions</label>
                      <Textarea
                        {...detailsForm.register('attachment_instructions')}
                        placeholder="Describe what files the signer should upload..."
                        rows={3}
                      />
                    </div>
                  )}

                  <div className="flex justify-between pt-2">
                    <Button type="button" variant="secondary" onClick={() => setStep(0)}>
                      Back
                    </Button>
                    <Button type="submit">Next</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Step 3: Add Signers */}
          {step === 2 && (
            <div>
              <form onSubmit={signerForm.handleSubmit(handleAddSigner)} className="mb-6 flex items-start gap-2">
                <div className="flex-1">
                  <Input
                    placeholder="Name"
                    {...signerForm.register('name')}
                    error={signerForm.formState.errors.name?.message}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Email"
                    type="email"
                    {...signerForm.register('email')}
                    error={signerForm.formState.errors.email?.message}
                  />
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Role"
                    {...signerForm.register('role')}
                    error={signerForm.formState.errors.role?.message}
                  />
                </div>
                <Button type="submit" size="icon" variant="secondary">
                  <Plus className="h-4 w-4" />
                </Button>
              </form>

              {signers.length === 0 ? (
                <EmptyState
                  icon={UserPlus}
                  title="No signers added yet"
                  description="Add at least one signer to create the document"
                  className="py-12"
                />
              ) : (
                <div className="mb-6 space-y-1.5">
                  {signers.map((signer, i) => (
                    <div
                      key={i}
                      draggable
                      onDragStart={() => handleDragStart(i)}
                      onDragOver={(e) => handleDragOver(e, i)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        'flex items-center gap-3 rounded-lg border px-3 py-2.5',
                        dragIndex === i ? 'border-accent bg-accent-subtle' : 'border-border bg-surface'
                      )}
                    >
                      <GripVertical className="h-4 w-4 cursor-grab text-text-tertiary" />
                      <div className="flex h-7 w-7 items-center justify-center rounded-full bg-accent-subtle text-xs font-semibold text-accent">
                        {signer.name.charAt(0).toUpperCase()}
                      </div>
                      <span className="flex-1 text-sm font-medium text-text-primary">{signer.name}</span>
                      <span className="text-sm text-text-secondary">{signer.email}</span>
                      <Badge variant="outline">{signer.role}</Badge>
                      <Badge variant="default">#{i + 1}</Badge>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveSigner(i)}
                        className="h-7 w-7"
                      >
                        <X className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}

              <div className="flex justify-between">
                <Button type="button" variant="secondary" onClick={() => setStep(1)}>
                  Back
                </Button>
                <Button
                  type="button"
                  onClick={handleCreate}
                  disabled={signers.length === 0 || createMutation.isPending}
                  loading={createMutation.isPending}
                >
                  Create Document
                </Button>
              </div>

              {createMutation.isError && (
                <p className="mt-3 text-sm text-danger">Failed to create document. Please try again.</p>
              )}
            </div>
          )}
        </div>
      </PageContent>
    </div>
  );
}
