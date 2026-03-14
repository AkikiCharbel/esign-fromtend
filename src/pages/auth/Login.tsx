import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate, Link } from 'react-router-dom';
import { useState } from 'react';
import { login } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginForm = z.infer<typeof loginSchema>;

export default function Login() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginForm>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginForm) => {
    setError(null);
    try {
      const result = await login(data.email, data.password);
      setAuth(result.token, result.user);
      navigate('/dashboard');
    } catch (err: unknown) {
      if (axios.isAxiosError(err) && (err.response?.status === 422 || err.response?.status === 401)) {
        const message = err.response.data?.message;
        setError(typeof message === 'string' ? message : 'Invalid credentials');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground">Sign In</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Sign in to your eSign account
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Don&apos;t have an account?{' '}
            <Link to="/register" className="font-medium text-accent hover:underline">
              Create workspace
            </Link>
          </p>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="space-y-2">
            <label htmlFor="email" className="text-sm font-medium text-foreground">
              Email
            </label>
            <input
              id="email"
              type="email"
              {...register('email')}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {errors.email && <p className="text-sm text-danger">{errors.email.message}</p>}
          </div>

          <div className="space-y-2">
            <label htmlFor="password" className="text-sm font-medium text-foreground">
              Password
            </label>
            <input
              id="password"
              type="password"
              {...register('password')}
              className="block w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
            {errors.password && <p className="text-sm text-danger">{errors.password.message}</p>}
          </div>

          {error && <p className="text-sm text-danger">{error}</p>}

          <Button type="submit" disabled={isSubmitting} className="w-full">
            {isSubmitting ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </div>
  );
}
