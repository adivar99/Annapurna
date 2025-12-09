'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import authService from '../services/authService';
import { AuthError } from '../services/interfaces';

const registerSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  username: z.string().min(1, 'Username is required'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

type RegisterFormData = z.infer<typeof registerSchema>;

export default function RegisterPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const {
    register,
    handleSubmit,
    formState: { errors, isValid },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    mode: 'onChange',
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await authService.register({
        name: data.name,
        email: data.email,
        password: data.password,
        username: data.username,
        userRole: 'patient', // Default role, can be made configurable later
      });
      
      console.log('Registration successful:', response);
      // Redirect to home page or dashboard after successful registration
      router.push('/home');
    } catch (err) {
      const authError = err as AuthError;
      setError(authError.message || 'Registration failed. Please try again.');
      console.error('Registration error:', authError);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div
      className="register-container h-screen flex justify-end items-center bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: "url('/assets/login_background.png')",
      }}
    >
      <div className="w-full max-w-[400px] m-4 mr-24 p-4 bg-white rounded-lg shadow-lg">
        <div className="flex justify-center mb-4 text-[#333]">
          <h2 className="text-2xl font-semibold">Register</h2>
        </div>
        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col gap-4">
          {error && (
            <div className="p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              {error}
            </div>
          )}
          <div className="flex flex-col">
            <label htmlFor="name" className="mb-2 text-sm font-medium text-[#333]">
              Name
            </label>
            <input
              id="name"
              type="text"
              placeholder="Enter your full name"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.name
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              {...register('name')}
            />
            {errors.name && (
              <p className="mt-1 text-sm text-red-500">{errors.name.message}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="username" className="mb-2 text-sm font-medium text-[#333]">
              Username
            </label>
            <input
              id="username"
              type="text"
              placeholder="Enter your username"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.username
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              {...register('username')}
            />
            {errors.username && (
              <p className="mt-1 text-sm text-red-500">{errors.username.message}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="email" className="mb-2 text-sm font-medium text-[#333]">
              Email
            </label>
            <input
              id="email"
              type="email"
              placeholder="Enter your email"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.email
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              {...register('email')}
            />
            {errors.email && (
              <p className="mt-1 text-sm text-red-500">{errors.email.message}</p>
            )}
          </div>

          <div className="flex flex-col">
            <label htmlFor="password" className="mb-2 text-sm font-medium text-[#333]">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className={`w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 ${
                errors.password
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-gray-300 focus:ring-blue-500'
              }`}
              {...register('password')}
            />
            {errors.password && (
              <p className="mt-1 text-sm text-red-500">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isValid || isLoading}
            className="mt-4 px-6 py-2 bg-blue-600 text-white rounded-md font-medium transition-colors hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
          >
            {isLoading ? 'Registering...' : 'Register'}
          </button>
        </form>
        <div className="flex justify-center pt-4 mt-4">
          <Link
            href="/login"
            className="text-blue-600 hover:text-blue-800 transition-colors"
          >
            Already have an account? Login
          </Link>
        </div>
      </div>
    </div>
  );
}

