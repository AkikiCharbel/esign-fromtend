import { useRef } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getWorkspace, updateWorkspace, uploadLogo, deleteLogo } from '../../api/workspace';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Spinner } from '@/components/ui/Spinner';
import { Tooltip } from '@/components/ui/tooltip';
import { useToastStore } from '@/stores/toastStore';

const TIMEZONES = [
  'UTC',
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Anchorage',
  'Pacific/Honolulu',
  'Europe/London',
  'Europe/Paris',
  'Europe/Berlin',
  'Asia/Tokyo',
  'Asia/Shanghai',
  'Asia/Kolkata',
  'Asia/Dubai',
  'Australia/Sydney',
  'Pacific/Auckland',
];

const settingsSchema = z.object({
  name: z.string().min(1, 'Workspace name is required').max(100),
  timezone: z.string().min(1, 'Timezone is required'),
});

type SettingsForm = z.infer<typeof settingsSchema>;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

export default function WorkspaceSettings() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const { data: workspace, isLoading } = useQuery({
    queryKey: ['workspace'],
    queryFn: getWorkspace,
  });

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<SettingsForm>({
    resolver: zodResolver(settingsSchema),
    values: workspace
      ? {
          name: workspace.name,
          timezone: String(workspace.settings?.timezone ?? 'UTC'),
        }
      : undefined,
  });

  const saveMutation = useMutation({
    mutationFn: (data: SettingsForm) =>
      updateWorkspace({
        name: data.name,
        settings: { timezone: data.timezone },
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      addToast('Settings saved', 'success');
    },
    onError: () => addToast('Failed to save settings', 'error'),
  });

  const logoUploadMutation = useMutation({
    mutationFn: uploadLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      addToast('Logo uploaded', 'success');
    },
    onError: () => addToast('Failed to upload logo', 'error'),
  });

  const logoDeleteMutation = useMutation({
    mutationFn: deleteLogo,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace'] });
      addToast('Logo removed', 'success');
    },
    onError: () => addToast('Failed to remove logo', 'error'),
  });

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      addToast('File must be under 2MB', 'error');
      return;
    }
    logoUploadMutation.mutate(file);
    e.target.value = '';
  };

  const onSubmit = (data: SettingsForm) => {
    saveMutation.mutate(data);
  };

  if (isLoading) {
    return (
      <>
        <PageHeader title="Workspace Settings" />
        <PageContent>
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        </PageContent>
      </>
    );
  }

  return (
    <>
      <PageHeader title="Workspace Settings" />
      <PageContent>
        <div className="space-y-6 max-w-2xl">
          <Card>
            <CardHeader>
              <CardTitle>General</CardTitle>
              <CardDescription>Manage your workspace identity and preferences</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Logo */}
              <div className="flex items-center gap-4">
                <div className="flex h-20 w-20 shrink-0 items-center justify-center rounded-full bg-surface-raised overflow-hidden">
                  {workspace?.logo_url ? (
                    <img
                      src={workspace.logo_url}
                      alt="Workspace logo"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-lg font-semibold text-text-secondary">
                      {workspace?.name ? getInitials(workspace.name) : '?'}
                    </span>
                  )}
                </div>
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      loading={logoUploadMutation.isPending}
                      onClick={() => fileInputRef.current?.click()}
                    >
                      Upload Logo
                    </Button>
                    {workspace?.logo_url && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-danger"
                        loading={logoDeleteMutation.isPending}
                        onClick={() => logoDeleteMutation.mutate()}
                      >
                        Remove
                      </Button>
                    )}
                  </div>
                  <p className="text-xs text-text-tertiary">JPG, PNG, or WebP. Max 2MB.</p>
                </div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileSelect}
                  className="hidden"
                />
              </div>

              <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Workspace Name</label>
                  <Input {...register('name')} error={errors.name?.message} />
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Workspace URL</label>
                  <div className="rounded-md border border-border bg-surface-raised px-3 py-2 text-sm text-text-secondary font-mono">
                    app.com/{workspace?.slug ?? '...'}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-sm font-medium text-text-primary">Timezone</label>
                  <Select {...register('timezone')} error={errors.timezone?.message}>
                    {TIMEZONES.map((tz) => (
                      <option key={tz} value={tz}>
                        {tz.replace(/_/g, ' ')}
                      </option>
                    ))}
                  </Select>
                </div>

                <Button type="submit" loading={isSubmitting || saveMutation.isPending}>
                  Save Changes
                </Button>
              </form>
            </CardContent>
          </Card>

          <Card className="border-danger/30">
            <CardHeader>
              <CardTitle className="!text-danger">Danger Zone</CardTitle>
              <CardDescription>This cannot be undone</CardDescription>
            </CardHeader>
            <CardContent>
              <Tooltip content="Contact support to delete your workspace">
                <span className="inline-block">
                  <Button variant="danger" disabled>
                    Delete Workspace
                  </Button>
                </span>
              </Tooltip>
            </CardContent>
          </Card>
        </div>
      </PageContent>
    </>
  );
}
