import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useNavigate } from 'react-router-dom';
import { useState } from 'react';
import { login } from '../../api/auth';
import { useAuthStore } from '../../stores/authStore';
import axios from 'axios';

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
      if (axios.isAxiosError(err) && err.response?.status === 422) {
        const message = err.response.data?.message;
        setError(typeof message === 'string' ? message : 'Invalid credentials');
      } else {
        setError('An unexpected error occurred');
      }
    }
  };

  return (
    <div style={{ maxWidth: 400, margin: '100px auto', padding: '0 16px' }}>
      <h1>Sign In</h1>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div style={{ marginBottom: 16 }}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            {...register('email')}
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
          {errors.email && <p style={{ color: 'red', fontSize: 14 }}>{errors.email.message}</p>}
        </div>

        <div style={{ marginBottom: 16 }}>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            {...register('password')}
            style={{ display: 'block', width: '100%', padding: 8 }}
          />
          {errors.password && <p style={{ color: 'red', fontSize: 14 }}>{errors.password.message}</p>}
        </div>

        {error && <p style={{ color: 'red', marginBottom: 16 }}>{error}</p>}

        <button type="submit" disabled={isSubmitting} style={{ padding: '8px 24px' }}>
          {isSubmitting ? 'Signing in...' : 'Sign In'}
        </button>
      </form>
    </div>
  );
}
