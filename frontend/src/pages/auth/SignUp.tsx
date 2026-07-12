import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { toast } from 'sonner';
import { useAuthStore } from '../../store/useAuthStore';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';

const signUpSchema = z.object({
  fullName: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters'),
  confirmPassword: z.string(),
  agreeToTerms: z.boolean().refine((val) => val === true, 'You must accept the terms'),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

type SignUpFormValues = z.infer<typeof signUpSchema>;

export const SignUp: React.FC = () => {
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();
  const registerAction = useAuthStore((state) => state.registerAction);
  const loginAction = useAuthStore((state) => state.loginAction);
  const googleLoginAction = useAuthStore((state) => state.googleLoginAction);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<SignUpFormValues>({
    resolver: zodResolver(signUpSchema),
    defaultValues: {
      fullName: '',
      email: '',
      password: '',
      confirmPassword: '',
      agreeToTerms: false,
    },
  });

  // Watch for terms checkbox setting
  const agreeToTermsValue = watch('agreeToTerms');

  const handleGoogleCredentialResponse = async (response: any) => {
    toast.loading('Signing up with Google...', { id: 'google-signup' });
    try {
      await googleLoginAction(response.credential);
      toast.success('Signed up via Google!', { id: 'google-signup' });
      navigate('/dashboard');
    } catch (err: any) {
      toast.error('Google Sign-Up failed', {
        id: 'google-signup',
        description: err.message || 'Verification failed on server.',
      });
    }
  };

  const googleClientId = import.meta.env.VITE_GOOGLE_CLIENT_ID;

  useEffect(() => {
    if (!googleClientId) return;
    const initializeGoogleSignUp = () => {
      if (typeof window !== 'undefined' && (window as any).google) {
        (window as any).google.accounts.id.initialize({
          client_id: googleClientId,
          callback: handleGoogleCredentialResponse,
        });
        (window as any).google.accounts.id.renderButton(
          document.getElementById("google-signup-button"),
          { 
            theme: "outline", 
            size: "large", 
            width: "320", 
            text: "signup_with", 
            shape: "pill" 
          }
        );
      }
    };

    initializeGoogleSignUp();
    const timer = setInterval(() => {
      if ((window as any).google) {
        initializeGoogleSignUp();
        clearInterval(timer);
      }
    }, 500);

    return () => clearInterval(timer);
  }, [googleClientId]);

  const onSubmit = async (data: SignUpFormValues) => {
    setIsSubmitting(true);
    try {
      // 1. Register user
      await registerAction(data.email, data.password, data.fullName);
      
      // 2. Automaticaly login
      await loginAction(data.email, data.password);
      
      toast.success('Account created successfully!', {
        description: 'Welcome to EduTrack. Let\'s set up your loans.',
      });
      
      navigate('/dashboard');
    } catch (error: any) {
      toast.error('Registration failed', {
        description: error.message || 'Something went wrong. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };



  return (
    <div className="flex flex-col w-full">
      {/* Brand Title */}
      <div className="text-center mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-text-primary">Create Account</h1>
        <p className="text-sm text-text-secondary mt-1">Get started with EduTrack today</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        {/* Full Name */}
        <div className="space-y-1">
          <Label htmlFor="fullName">Full Name</Label>
          <Input
            id="fullName"
            placeholder="John Doe"
            className="rounded-xl py-5"
            {...register('fullName')}
          />
          {errors.fullName && (
            <p className="text-xs text-error mt-0.5">{errors.fullName.message}</p>
          )}
        </div>

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
          <Label htmlFor="password">Password</Label>
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

        {/* Terms and Conditions */}
        <div className="flex items-start space-x-2 pt-1">
          <Checkbox
            id="agreeToTerms"
            checked={agreeToTermsValue}
            onCheckedChange={(checked) => setValue('agreeToTerms', checked === true)}
            className="rounded-md mt-0.5"
          />
          <div className="grid gap-1.5 leading-none">
            <Label
              htmlFor="agreeToTerms"
              className="text-xs font-medium text-text-secondary cursor-pointer leading-tight"
            >
              I agree to the{' '}
              <Link to="/terms" className="text-primary hover:underline font-semibold">
                Terms of Service
              </Link>{' '}
              and{' '}
              <Link to="/privacy" className="text-primary hover:underline font-semibold">
                Privacy Policy
              </Link>
            </Label>
            {errors.agreeToTerms && (
              <p className="text-xs text-error mt-0.5">{errors.agreeToTerms.message}</p>
            )}
          </div>
        </div>

        {/* Submit button */}
        <Button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-5 rounded-2xl text-base font-semibold bg-primary hover:bg-primary-light text-white transition-all duration-300 mt-2 flex items-center justify-center gap-2"
        >
          {isSubmitting ? (
            <>
              <LoadingSpinner size="xs" /> Creating Account...
            </>
          ) : (
            'Sign Up'
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
      {googleClientId ? (
        <div className="w-full flex justify-center py-1 mt-1">
          <div id="google-signup-button"></div>
        </div>
      ) : (
        <div className="w-full text-center py-3 px-4 bg-slate-50 dark:bg-slate-900/40 border border-dashed border-border rounded-2xl">
          <span className="text-[10px] text-text-secondary font-bold uppercase tracking-wider block">Google Sign-In is not configured</span>
          <span className="text-[9px] text-text-secondary/70 mt-0.5 block">Define VITE_GOOGLE_CLIENT_ID in your environment variables to enable.</span>
        </div>
      )}

      {/* Footer link */}
      <p className="text-sm text-text-secondary text-center mt-6">
        Already have an account?{' '}
        <Link to="/auth/login" className="text-primary hover:underline font-semibold">
          Log In
        </Link>
      </p>
    </div>
  );
};
