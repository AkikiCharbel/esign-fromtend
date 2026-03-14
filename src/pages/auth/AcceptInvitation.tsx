import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, useParams } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { axios } from '../../api/client';
import { getInvitationPreview, acceptInvitation } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Spinner } from '@/components/ui/Spinner';

const acceptSchema = z
  .object({
    name: z.string().min(1, 'Your name is required').max(100),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

type AcceptForm = z.infer<typeof acceptSchema>;

type SubmitErrorState = 'expired' | 'accepted' | null;

export default function AcceptInvitation() {
  const { token } = useParams<{ token: string }>();
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [submitError, setSubmitError] = useState<SubmitErrorState>(null);

  const {
    data: invitation,
    isLoading,
    error: fetchError,
  } = useQuery({
    queryKey: ['invitation', token],
    queryFn: () => getInvitationPreview(token!),
    enabled: !!token,
    retry: false,
  });

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<AcceptForm>({
    resolver: zodResolver(acceptSchema),
  });

  const onSubmit = async (data: AcceptForm) => {
    if (!token) return;
    try {
      const result = await acceptInvitation({
        token,
        name: data.name,
        password: data.password,
        password_confirmation: data.password_confirmation,
      });
      setAuth(result.token, result.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err)) {
        const status = err.response?.status;
        if (status === 410) {
          setSubmitError('expired');
        } else if (status === 409) {
          setSubmitError('accepted');
        } else if (status === 422) {
          const serverErrors = err.response?.data?.errors as Record<string, string[]> | undefined;
          if (serverErrors) {
            for (const [field, messages] of Object.entries(serverErrors)) {
              if (field === 'name' || field === 'password' || field === 'password_confirmation') {
                setError(field, { message: messages[0] });
              }
            }
          } else {
            setError('name', { message: err.response?.data?.message ?? 'Validation error' });
          }
        } else {
          setError('name', { message: 'An unexpected error occurred' });
        }
      }
    }
  };

  const isNotFound = !token || !!fetchError;
  const isExpired = invitation?.is_expired || submitError === 'expired';
  const isAccepted = invitation?.is_accepted || submitError === 'accepted';
  const showForm = !isLoading && !isNotFound && !isExpired && !isAccepted && !!invitation;

  return (
    <div className="theme-public flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--pub-bg)' }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pub-text)' }}>
            eSign
          </h1>
        </div>

        {isLoading && (
          <div className="flex flex-col items-center gap-3 py-16">
            <Spinner size="lg" />
            <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
              Loading invitation...
            </p>
          </div>
        )}

        {!isLoading && isExpired && (
          <div
            className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center shadow-sm"
            style={{ background: 'var(--pub-surface)', borderColor: 'var(--pub-border)' }}
          >
            <Clock className="h-12 w-12" style={{ color: 'var(--pub-warning)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--pub-text)' }}>
              This invitation has expired
            </h2>
            <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
              Contact your workspace admin to request a new invitation.
            </p>
          </div>
        )}

        {!isLoading && isAccepted && (
          <div
            className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center shadow-sm"
            style={{ background: 'var(--pub-surface)', borderColor: 'var(--pub-border)' }}
          >
            <CheckCircle className="h-12 w-12" style={{ color: 'var(--pub-success)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--pub-text)' }}>
              This invitation has already been used
            </h2>
            <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
              You can sign in to your account.
            </p>
            <Button onClick={() => navigate('/login')} className="mt-2">
              Go to Login
            </Button>
          </div>
        )}

        {!isLoading && isNotFound && !isExpired && !isAccepted && (
          <div
            className="flex flex-col items-center gap-3 rounded-lg border p-8 text-center shadow-sm"
            style={{ background: 'var(--pub-surface)', borderColor: 'var(--pub-border)' }}
          >
            <AlertCircle className="h-12 w-12" style={{ color: 'var(--pub-danger)' }} />
            <h2 className="text-lg font-semibold" style={{ color: 'var(--pub-text)' }}>
              Invitation not found
            </h2>
            <p className="text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
              This invitation link is invalid. Please check with your workspace admin.
            </p>
          </div>
        )}

        {showForm && (
          <>
            <div
              className="rounded-lg border p-6 shadow-sm"
              style={{ background: 'var(--pub-surface)', borderColor: 'var(--pub-border)' }}
            >
              <h2 className="text-lg font-semibold" style={{ color: 'var(--pub-text)' }}>
                You&apos;ve been invited to join{' '}
                <span style={{ color: 'var(--pub-accent)' }}>{invitation.workspace_name}</span>
              </h2>
              <div className="mt-2 flex items-center gap-2 text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
                <span>Invited by {invitation.invited_by_name}</span>
                <Badge variant="outline">{invitation.role}</Badge>
              </div>
            </div>

            <form
              onSubmit={handleSubmit(onSubmit)}
              className="space-y-4 rounded-lg border p-6 shadow-sm"
              style={{ background: 'var(--pub-surface)', borderColor: 'var(--pub-border)' }}
            >
              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--pub-text)' }}>
                  Email
                </label>
                <Input
                  type="email"
                  value={invitation.email}
                  readOnly
                  disabled
                  className="!bg-gray-50 !text-gray-500 !border-gray-300"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--pub-text)' }}>
                  Your Name
                </label>
                <Input
                  {...register('name')}
                  placeholder="John Doe"
                  error={errors.name?.message}
                  className="!bg-white !text-gray-900 !border-gray-300 placeholder:!text-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--pub-text)' }}>
                  Password
                </label>
                <Input
                  type="password"
                  {...register('password')}
                  placeholder="Min. 8 characters"
                  error={errors.password?.message}
                  className="!bg-white !text-gray-900 !border-gray-300 placeholder:!text-gray-400"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" style={{ color: 'var(--pub-text)' }}>
                  Confirm Password
                </label>
                <Input
                  type="password"
                  {...register('password_confirmation')}
                  placeholder="Repeat your password"
                  error={errors.password_confirmation?.message}
                  className="!bg-white !text-gray-900 !border-gray-300 placeholder:!text-gray-400"
                />
              </div>

              <Button type="submit" loading={isSubmitting} className="w-full">
                Join Workspace
              </Button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
