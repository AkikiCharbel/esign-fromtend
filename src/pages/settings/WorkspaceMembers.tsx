import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { UserPlus, Users, X } from 'lucide-react';
import { axios } from '../../api/client';
import {
  getMembers,
  getInvitations,
  createInvitation,
  cancelInvitation,
  updateMemberRole,
  removeMember,
} from '../../api/workspace';
import { useAuthStore } from '../../stores/authStore';
import { useToastStore } from '@/stores/toastStore';
import PageHeader from '@/components/layout/PageHeader';
import PageContent from '@/components/layout/PageContent';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Select } from '@/components/ui/Select';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';
import { EmptyState } from '@/components/ui/EmptyState';
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from '@/components/ui/Table';

const inviteSchema = z.object({
  email: z.string().email('Invalid email'),
  role: z.enum(['staff', 'viewer'], { message: 'Role is required' }),
});

type InviteForm = z.infer<typeof inviteSchema>;

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
}

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

function roleBadgeVariant(role: string): 'default' | 'success' | 'warning' | 'outline' {
  switch (role) {
    case 'admin':
      return 'success';
    case 'staff':
      return 'default';
    case 'viewer':
      return 'outline';
    default:
      return 'default';
  }
}

function getAxiosErrorMessage(err: unknown, fallback: string): string {
  if (axios.isAxiosError(err)) {
    return err.response?.data?.message ?? fallback;
  }
  return fallback;
}

export default function WorkspaceMembers() {
  const queryClient = useQueryClient();
  const addToast = useToastStore((s) => s.addToast);
  const currentUser = useAuthStore((s) => s.user);
  const isAdmin = currentUser?.roles.includes('admin');
  const [showInviteForm, setShowInviteForm] = useState(false);

  const { data: members, isLoading: membersLoading } = useQuery({
    queryKey: ['workspace', 'members'],
    queryFn: getMembers,
  });

  const { data: invitations, isLoading: invitationsLoading } = useQuery({
    queryKey: ['workspace', 'invitations'],
    queryFn: getInvitations,
  });

  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors },
  } = useForm<InviteForm>({
    resolver: zodResolver(inviteSchema),
    defaultValues: { email: '', role: 'staff' },
  });

  const inviteMutation = useMutation({
    mutationFn: createInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'invitations'] });
      addToast('Invitation sent', 'success');
      reset();
      setShowInviteForm(false);
    },
    onError: (err: unknown) => {
      if (axios.isAxiosError(err) && err.response?.data?.errors?.email) {
        setError('email', { message: err.response.data.errors.email[0] });
      } else {
        addToast(getAxiosErrorMessage(err, 'Failed to send invitation'), 'error');
      }
    },
  });

  const cancelMutation = useMutation({
    mutationFn: cancelInvitation,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'invitations'] });
      addToast('Invitation cancelled', 'success');
    },
    onError: () => addToast('Failed to cancel invitation', 'error'),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: number; role: string }) =>
      updateMemberRole(memberId, role),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'members'] });
      addToast('Role updated', 'success');
    },
    onError: (err: unknown) => {
      addToast(getAxiosErrorMessage(err, 'Failed to update role'), 'error');
    },
  });

  const removeMutation = useMutation({
    mutationFn: removeMember,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workspace', 'members'] });
      addToast('Member removed', 'success');
    },
    onError: (err: unknown) => {
      addToast(getAxiosErrorMessage(err, 'Failed to remove member'), 'error');
    },
  });

  const onInviteSubmit = (data: InviteForm) => {
    inviteMutation.mutate(data);
  };

  const isLoading = membersLoading || invitationsLoading;

  return (
    <>
      <PageHeader
        title="Members"
        actions={
          isAdmin ? (
            <Button onClick={() => setShowInviteForm((v) => !v)}>
              <UserPlus className="h-4 w-4" />
              Invite Member
            </Button>
          ) : undefined
        }
      />
      <PageContent>
        {/* Invite form */}
        {showInviteForm && (
          <div className="mb-6 rounded-lg border border-border bg-surface p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-medium text-text-primary">Send Invitation</h3>
              <button
                onClick={() => setShowInviteForm(false)}
                className="rounded-md p-1 text-text-tertiary hover:text-text-primary"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
            <form onSubmit={handleSubmit(onInviteSubmit)} className="flex items-start gap-3">
              <div className="flex-1">
                <Input
                  type="email"
                  placeholder="colleague@company.com"
                  {...register('email')}
                  error={errors.email?.message}
                />
              </div>
              <div className="w-32">
                <Select {...register('role')} error={errors.role?.message}>
                  <option value="staff">Staff</option>
                  <option value="viewer">Viewer</option>
                </Select>
              </div>
              <Button type="submit" loading={inviteMutation.isPending}>
                Send Invite
              </Button>
            </form>
          </div>
        )}

        {isLoading ? (
          <div className="flex justify-center py-16">
            <Spinner size="lg" />
          </div>
        ) : (
          <div className="space-y-8">
            {/* Active Members */}
            <div>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                Active Members
              </h3>
              {members && members.length > 0 ? (
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Member</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Joined</TableHead>
                        {isAdmin && <TableHead className="text-right">Actions</TableHead>}
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {members.map((member) => {
                        const isSelf = member.id === currentUser?.id;
                        const isRemovingThis =
                          removeMutation.isPending &&
                          removeMutation.variables === member.id;
                        return (
                          <TableRow key={member.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-surface-raised text-xs font-medium text-text-secondary">
                                  {getInitials(member.name)}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-text-primary">
                                    {member.name}
                                    {isSelf && (
                                      <span className="ml-1.5 text-xs text-text-tertiary">(You)</span>
                                    )}
                                  </p>
                                  <p className="text-xs text-text-tertiary">{member.email}</p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {isAdmin && !isSelf ? (
                                <Select
                                  value={member.role}
                                  onChange={(e) =>
                                    updateRoleMutation.mutate({
                                      memberId: member.id,
                                      role: e.target.value,
                                    })
                                  }
                                  className="!w-28"
                                >
                                  <option value="admin">Admin</option>
                                  <option value="staff">Staff</option>
                                  <option value="viewer">Viewer</option>
                                </Select>
                              ) : (
                                <Badge variant={roleBadgeVariant(member.role)}>
                                  {member.role}
                                </Badge>
                              )}
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-text-tertiary">
                                {formatDate(member.joined_at)}
                              </span>
                            </TableCell>
                            {isAdmin && (
                              <TableCell className="text-right">
                                {!isSelf && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-danger"
                                    loading={isRemovingThis}
                                    onClick={() => removeMutation.mutate(member.id)}
                                  >
                                    Remove
                                  </Button>
                                )}
                              </TableCell>
                            )}
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              ) : (
                <EmptyState icon={Users} title="No members" description="Your workspace has no members yet." />
              )}
            </div>

            {/* Pending Invitations */}
            {invitations && invitations.length > 0 && (
              <div>
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-text-tertiary">
                  Pending Invitations
                </h3>
                <div className="rounded-lg border border-border overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Email</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Sent</TableHead>
                        <TableHead>Expires</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {invitations.map((inv) => {
                        const isCancellingThis =
                          cancelMutation.isPending &&
                          cancelMutation.variables === inv.id;
                        return (
                          <TableRow key={inv.id}>
                            <TableCell>
                              <span className="text-sm text-text-primary">{inv.email}</span>
                            </TableCell>
                            <TableCell>
                              <Badge variant={roleBadgeVariant(inv.role)}>{inv.role}</Badge>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-text-tertiary">
                                {formatDate(inv.created_at)}
                              </span>
                            </TableCell>
                            <TableCell>
                              <span className="text-sm text-text-tertiary">
                                {inv.expires_at ? formatDate(inv.expires_at) : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                variant="ghost"
                                size="sm"
                                loading={isCancellingThis}
                                onClick={() => cancelMutation.mutate(inv.id)}
                              >
                                Cancel
                              </Button>
                            </TableCell>
                          </TableRow>
                        );
                      })}
                    </TableBody>
                  </Table>
                </div>
              </div>
            )}
          </div>
        )}
      </PageContent>
    </>
  );
}
