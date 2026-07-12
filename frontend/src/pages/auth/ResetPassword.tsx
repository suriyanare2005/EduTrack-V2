import React, { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { apiRequest } from '../../lib/api';

const resetPasswordSchema = z.object({
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type ResetPasswordValues = z.infer<typeof resetPasswordSchema>;

export const ResetPassword: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const email = searchParams.get('email') || '';
  const token = searchParams.get('token') || '';

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  const onSubmit = async (data: ResetPasswordValues) => {
    if (!email || !token) {
      toast.error('Missing parameters', {
        description: 'Email and token are required to reset password.',
      });
      return;
    }

    setIsSubmitting(true);
    try {
      await apiRequest('/api/auth/reset-password/confirm', {
        method: 'POST',
        body: JSON.stringify({
          email,
          token,
          new_password: data.password,
        }),
      });

      toast.success('Password updated successfully!', {
        description: 'You can now log in with your new credentials.',
      });
      navigate('/auth/login', { replace: true });
    } catch (error: any) {
      toast.error('Failed to reset password', {
        description: error.message || 'The reset link might be invalid or expired.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      {/* Back to Login Arrow */}
      <button
        onClick={() => navigate('/auth/login')}
        className="absolute -top-2 -left-2 p-2 rounded-xl text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
        aria-label="Back to login"
      >
        <ArrowLeft className="w-5 h-5" />
      </button>

      {/* Main Header */}
      <div className="text-center mb-6 mt-4">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create New Password</h1>
        <p className="text-sm text-text-secondary mt-1">
          Resetting password for <span className="font-semibold text-text-primary">{email || 'unknown'}</span>
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* New Password */}
        <div className="space-y-1">
          <Label htmlFor="password">New Password</Label>
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="rounded-xl py-5 pr-10"
              {...register('password')}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary"
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.password && (
            <p className="text-xs text-error mt-0.5">{errors.password.message}</p>
          )}
        </div>

        {/* Confirm Password */}
        <div className="space-y-1">
          <Label htmlFor="confirmPassword">Confirm Password</Label>
          <div className="relative">
            <Input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              placeholder="••••••••"
              className="rounded-xl py-5 pr-10"
              {...register('confirmPassword')}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute inset-y-0 right-0 flex items-center pr-3 text-text-secondary"
            >
              {showConfirmPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>
          {errors.confirmPassword && (
            <p className="text-xs text-error mt-0.5">{errors.confirmPassword.message}</p>
          )}
        </div>

        {/* Submit Button */}
        <Button
          type="submit"
          disabled={isSubmitting || !email || !token}
          className="w-full py-5 rounded-2xl text-base font-semibold bg-primary hover:bg-primary-light text-white transition-all duration-300 mt-2 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="xs" /> Updating Password...
            </>
          ) : (
            'Reset Password'
          )}
        </Button>
      </form>
    </div>
  );
};
