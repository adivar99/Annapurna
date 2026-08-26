'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '../context/AuthContext';
import { AuthError } from '../services/interfaces';

const loginSchema = z.object({
  login: z.string().min(1, 'Email or username is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginPage() {
  const router = useRouter();
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await login({
        email: data.login,
        password: data.password,
      });

      console.log('Login successful:', response);
      router.push('/home');
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || 'Login failed. Please check your credentials.');
      console.error('Login error:', authError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="login-container h-screen flex justify-end items-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/assets/login_background.png')",
      }}
    >
      <div className="login-card bg-[#e5dfce]/95 backdrop-blur-sm p-10 rounded-3xl shadow-2xl w-full max-w-md mx-8 border border-white/20">
        <h1 className="login-title text-4xl font-normal text-center mb-2 tracking-wide italiana text-stone-900">
          Annapurna
        </h1>
        <p className="login-subtitle text-center text-sm mb-6 text-stone-600 font-serif italic">
          Sign In to Your Culinary Journey
        </p>

        {error && (
          <div className="error-message bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-4 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="form-field">
            <label
              htmlFor="login"
              className="block text-xs font-semibold uppercase tracking-wider mb-1 text-stone-700"
            >
              Email or Username
            </label>
            <input
              id="login"
              type="text"
              placeholder="Enter your email or username"
              {...register('login')}
              className={`w-full px-4 py-2.5 rounded-xl border ${
                errors.login ? 'border-red-500' : 'border-stone-300'
              } focus:outline-none focus:ring-2 focus:ring-[#758e4f] bg-white text-stone-900 placeholder-stone-400 text-sm`}
            />
            {errors.login && (
              <span className="error-text text-red-500 text-xs mt-1 block">
                {errors.login.message}
              </span>
            )}
          </div>

          <div className="form-field">
            <label
              htmlFor="password"
              className="block text-xs font-semibold uppercase tracking-wider mb-1 text-stone-700"
            >
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              {...register('password')}
              className={`w-full px-4 py-2.5 rounded-xl border ${
                errors.password ? 'border-red-500' : 'border-stone-300'
              } focus:outline-none focus:ring-2 focus:ring-[#758e4f] bg-white text-stone-900 placeholder-stone-400 text-sm`}
            />
            {errors.password && (
              <span className="error-text text-red-500 text-xs mt-1 block">
                {errors.password.message}
              </span>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || isLoading}
            className={`w-full py-3 rounded-xl font-semibold uppercase tracking-wider text-white text-sm transition-all duration-200 shadow-md ${
              isValid && !isLoading
                ? 'bg-[#758e4f] hover:bg-[#627741] cursor-pointer'
                : 'bg-stone-400 cursor-not-allowed opacity-60'
            }`}
          >
            {isLoading ? 'Logging In...' : 'Log In'}
          </button>
        </form>

        <div className="register-link text-center mt-6 text-sm text-stone-600">
          Don&apos;t have an account?{' '}
          <Link
            href="/register"
            className="text-[#758e4f] font-semibold hover:underline"
          >
            Create Account
          </Link>
        </div>
      </div>
    </div>
  );
}
