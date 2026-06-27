import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

const loginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

type LoginFormValues = z.infer<typeof loginSchema>;

export const Login: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const loginAction = useAuthStore((state) => state.loginAction);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
    },
  });

  const onSubmit = async (data: LoginFormValues) => {
    setIsSubmitting(true);
    try {
      await loginAction(data.email, data.password);
      
      toast.success('Logged in successfully!', {
        description: 'Welcome back to EduTrack.',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Authentication failed', {
        description: error.message || 'Invalid credentials. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogleLogin = () => {
    toast.info('Google Sign-In', {
      description: 'Google OAuth flow is starting... (Mock redirect)',
    });
  };

  return (
    <div className="flex flex-col w-full">
      {/* Brand Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Welcome Back</h1>
        <p className="text-sm text-text-secondary mt-1">Log in to your EduTrack account</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Email */}
        <div className="space-y-1">
          <Label htmlFor="email">Email Address</Label>
          <Input
            id="email"
            type="email"
            placeholder="john@example.com"
            className="rounded-xl py-5"
            {...register('email')}
          />
          {errors.email && (
            <p className="text-xs text-error mt-0.5">{errors.email.message}</p>
          )}
        </div>

        {/* Password */}
        <div className="space-y-1">
          <div className="flex justify-between items-center">
            <Label htmlFor="password">Password</Label>
            <Link
              to="/auth/forgot-password"
              className="text-xs font-semibold text-primary hover:underline"
            >
              Forgot Password?
            </Link>
          </div>
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

        {/* Submit button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-5 rounded-2xl text-base font-semibold bg-primary hover:bg-primary-light text-white transition-all duration-300 mt-2 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="xs" /> Logging In...
            </>
          ) : (
            'Log In'
          )}
        </Button>
      </form>

      {/* Divider */}
      <div className="relative flex py-4 items-center">
        <div className="flex-grow border-t border-border"></div>
        <span className="flex-shrink mx-4 text-text-secondary text-xs">or</span>
        <div className="flex-grow border-t border-border"></div>
      </div>

      {/* Google Sign In */}
      <Button
        variant="outline"
        onClick={handleGoogleLogin}
        className="w-full py-5 rounded-2xl border-border text-text-primary font-semibold hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200 flex items-center justify-center gap-2"
      >
        <svg className="w-5 h-5 mr-1" viewBox="0 0 24 24">
          <path
            fill="#EA4335"
            d="M5.266 9.765A7.077 7.077 0 0 1 12 4.909c1.69 0 3.218.6 4.418 1.582L19.91 3A11.966 11.966 0 0 0 12 .909a11.973 11.973 0 0 0-8.8 3.864l2.066 4.992z"
          />
          <path
            fill="#4285F4"
            d="M23.091 12.273c0-.818-.082-1.609-.218-2.364H12v4.51h6.218a5.275 5.275 0 0 1-2.29 3.473l3.527 2.736c2.064-1.9 3.255-4.7 3.255-8.355z"
          />
          <path
            fill="#FBBC05"
            d="M3.2 4.773A11.973 11.973 0 0 0 .909 12c0 2.582.818 4.964 2.227 6.945l2.073-4.99A7.086 7.086 0 0 1 4.909 12c0-.79.127-1.555.355-2.273L3.2 4.773z"
          />
          <path
            fill="#34A853"
            d="M12 23.091c3.245 0 5.973-1.073 7.964-2.927l-3.527-2.736A7.067 7.067 0 0 1 12 19.091a7.077 7.077 0 0 1-6.734-4.855l-2.073 4.99A11.973 11.973 0 0 0 12 23.091z"
          />
        </svg>
        Continue with Google
      </Button>

      {/* Footer link */}
      <p className="text-sm text-text-secondary text-center mt-6">
        Don't have an account?{' '}
        <Link to="/auth/signup" className="text-primary hover:underline font-semibold">
          Sign Up
        </Link>
      </p>
    </div>
  );
};
