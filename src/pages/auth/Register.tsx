import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { Pencil } from 'lucide-react';
import { axios } from '../../api/client';
import { register as registerApi } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/Input';

const registerSchema = z
  .object({
    workspace_name: z.string().min(1, 'Workspace name is required').max(100),
    workspace_slug: z
      .string()
      .min(1, 'Workspace URL is required')
      .max(50)
      .regex(/^[a-z0-9-]+$/, 'Only lowercase letters, numbers, and hyphens'),
    name: z.string().min(1, 'Your name is required').max(100),
    email: z.string().email('Invalid email address'),
    password: z.string().min(8, 'Password must be at least 8 characters'),
    password_confirmation: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.password_confirmation, {
    message: 'Passwords do not match',
    path: ['password_confirmation'],
  });

type RegisterForm = z.infer<typeof registerSchema>;

function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [editingSlug, setEditingSlug] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RegisterForm>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      workspace_name: '',
      workspace_slug: '',
      name: '',
      email: '',
      password: '',
      password_confirmation: '',
    },
  });

  const slug = watch('workspace_slug');

  const handleWorkspaceNameChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const value = e.target.value;
      if (!slugManuallyEdited) {
        setValue('workspace_slug', slugify(value), { shouldValidate: slug.length > 0 });
      }
    },
    [slugManuallyEdited, setValue, slug.length],
  );

  const onSubmit = async (data: RegisterForm) => {
    try {
      const result = await registerApi(data);
      setAuth(result.token, result.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const serverErrors = err.response.data?.errors as Record<string, string[]> | undefined;
        if (serverErrors) {
          for (const [field, messages] of Object.entries(serverErrors)) {
            if (field in registerSchema.shape || field === 'password_confirmation') {
              setError(field as keyof RegisterForm, { message: messages[0] });
            }
          }
        } else {
          setError('email', { message: err.response.data?.message ?? 'Validation error' });
        }
      } else {
        setError('email', { message: 'An unexpected error occurred' });
      }
    }
  };

  return (
    <div className="theme-public flex min-h-screen items-center justify-center px-4" style={{ background: 'var(--pub-bg)' }}>
      <div className="w-full max-w-md space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--pub-text)' }}>
            eSign
          </h1>
          <h2 className="mt-2 text-xl font-semibold" style={{ color: 'var(--pub-text)' }}>
            Create your workspace
          </h2>
          <p className="mt-1 text-sm" style={{ color: 'var(--pub-text-secondary)' }}>
            Already have an account?{' '}
            <Link to="/login" className="font-medium hover:underline" style={{ color: 'var(--pub-accent)' }}>
              Sign in
            </Link>
          </p>
        </div>

        <form
          onSubmit={handleSubmit(onSubmit)}
          className="space-y-4 rounded-lg border p-6 shadow-sm"
          style={{ background: 'var(--pub-surface)', borderColor: 'var(--pub-border)' }}
        >
          <div className="space-y-1.5">
            <label className="text-sm font-medium" style={{ color: 'var(--pub-text)' }}>
              Workspace Name
            </label>
            <Input
              {...register('workspace_name', {
                onChange: handleWorkspaceNameChange,
              })}
              placeholder="My Company"
              error={errors.workspace_name?.message}
              className="!bg-white !text-gray-900 !border-gray-300 placeholder:!text-gray-400"
            />
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium" style={{ color: 'var(--pub-text)' }}>
                Workspace URL
              </span>
              {!editingSlug && (
                <button
                  type="button"
                  onClick={() => {
                    setEditingSlug(true);
                    setSlugManuallyEdited(true);
                  }}
                  className="inline-flex items-center gap-1 text-xs hover:underline"
                  style={{ color: 'var(--pub-accent)' }}
                >
                  <Pencil className="h-3 w-3" />
                  Edit
                </button>
              )}
            </div>
            {editingSlug ? (
              <Input
                {...register('workspace_slug')}
                placeholder="my-company"
                error={errors.workspace_slug?.message}
                className="!bg-white !text-gray-900 !border-gray-300 placeholder:!text-gray-400 !font-mono"
              />
            ) : (
              <p className="rounded-md border px-3 py-2 text-sm font-mono" style={{ color: 'var(--pub-text-secondary)', borderColor: 'var(--pub-border)', background: 'var(--pub-bg)' }}>
                app.com/{slug || '...'}
              </p>
            )}
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
              Work Email
            </label>
            <Input
              type="email"
              {...register('email')}
              placeholder="you@company.com"
              error={errors.email?.message}
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
            Create Workspace
          </Button>
        </form>
      </div>
    </div>
  );
}
