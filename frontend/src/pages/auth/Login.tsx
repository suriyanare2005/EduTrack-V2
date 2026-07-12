import React, { useState, useEffect } from 'react';
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
  const googleLoginAction = useAuthStore((state) => state.googleLoginAction);

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

  const handleGoogleCredentialResponse = async (response: any) => {
    toast.loading('Signing in with Google...', { id: 'google-login' });
    try {
      await googleLoginAction(response.credential);
      toast.success('Logged in via Google!', { id: 'google-login' });
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Google Sign-In failed', {
        id: 'google-login',
        description: err.message || 'Verification failed on server.',
      });
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;
    const initializeGoogleSignIn = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById("google-signin-button"),
          { 
            theme: "outline", 
            size: "large", 
            width: "320", 
            text: "signin_with", 
            shape: "pill" 
          }
        );
      }
    };

    initializeGoogleSignIn();
    const timer = setInterval(() => {
      if ((window as any).google) {
        initializeGoogleSignIn();
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [googleClientId]);

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

      {googleClientId ? (
        <div className="w-full flex justify-center py-1 mt-1">
          <div id="google-signin-button"></div>
        </div>
      ) : (
        <div className="w-full text-center py-3 px-4 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-border rounded-2xl">
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Google Sign-In is not configured</span>
          <span className="text-[9px] text-text-secondary/70 mt-0.5 block">Define VITE_GOOGLE_CLIENT_ID in your environment variables to enable.</span>
        </div>
      )}

      <p className="text-sm text-text-secondary text-center mt-6">
        Don't have an account?{' '}
        <Link to="/auth/signup" className="text-primary hover:underline font-semibold">
          Sign Up
        </Link>
      </p>
    </div>
  );
};
