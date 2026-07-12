import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Mail, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { toast } from 'sonner';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { apiRequest } from '../../lib/api';
import { Link } from 'react-router-dom';

const forgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

type ForgotPasswordValues = z.infer<typeof forgotPasswordSchema>;

export const ForgotPassword: React.FC = () => {
  const [emailSent, setEmailSent] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  const navigate = useNavigate();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<ForgotPasswordValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const emailValue = watch('email');

  const onSubmit = async (data: ForgotPasswordValues) => {
    setIsSubmitting(true);
    try {
      // TODO: Configure SMTP or professional email sending service (e.g. SendGrid, Mailgun, Amazon SES)
      // inside the backend router at `POST /api/auth/reset-password` to transmit real reset links.
      await apiRequest('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({ email: data.email }),
      });
      setEmailSent(true);
      toast.success('Reset link sent!', {
        description: 'Check your email inbox for password recovery instructions.',
      });
    } catch (error: any) {
      toast.error('Error sending link', {
        description: error.message || 'Please double-check your email and try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex flex-col w-full relative">
      {/* Back Arrow link (Form Mode) */}
      {!emailSent && (
        <button
          onClick={() => navigate('/auth/login')}
          className="absolute -top-2 -left-2 p-2 rounded-xl text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200"
          aria-label="Back to login"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
      )}

      {/* Main Content */}
      <div className="flex flex-col items-center w-full mt-4">
        {!emailSent ? (
          <>
            {/* Form View */}
            <div className="text-center mb-6 w-full">
              <h1 className="text-2xl font-bold tracking-tight text-text-primary">Reset Password</h1>
              <p className="text-sm text-text-secondary mt-1">
                Enter your registered email below, and we'll send a password recovery link.
              </p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 w-full">
              {/* Email */}
              <div className="space-y-1 w-full">
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

              {/* Submit button */}
              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-5 rounded-2xl text-base font-semibold bg-primary hover:bg-primary-light text-white transition-all duration-300 mt-2 flex items-center justify-center gap-2"
              >
                {isSubmitting ? (
                  <>
                    <LoadingSpinner size="xs" /> Sending Link...
                  </>
                ) : (
                  'Send Reset Link'
                )}
              </Button>
            </form>
          </>
        ) : (
          <>
            {/* Success View */}
            <div className="flex flex-col items-center text-center py-4 w-full">
              <div className="mb-6 text-primary flex items-center justify-center bg-indigo-50 dark:bg-indigo-950/40 rounded-full p-6 w-20 h-20">
                <Mail className="w-10 h-10" />
              </div>
              
              <h2 className="text-2xl font-bold text-text-primary tracking-tight mb-2">Check your inbox</h2>
              <p className="text-text-secondary text-sm leading-relaxed max-w-xs mb-4">
                We've sent a password recovery link to <span className="font-semibold text-text-primary">{emailValue}</span>. Please click the link to reset your password.
              </p>

              <div className="mt-2 p-4 bg-amber-50 dark:bg-amber-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-2xl text-[11px] text-amber-800 dark:text-amber-300 w-full mb-6 text-left">
                <span className="font-bold block mb-1">🛠️ Development Integration Notice:</span>
                Since SMTP/email service is not configured (see backend code TODOs), you can test the password reset screen directly:
                <Link
                  to={`/auth/reset-password?email=${encodeURIComponent(emailValue)}&token=mock-reset-token`}
                  className="font-bold underline text-primary block mt-1 hover:text-primary-light"
                >
                  Open Password Reset Page &rarr;
                </Link>
              </div>

              <Button
                onClick={() => navigate('/auth/login')}
                className="w-full py-5 rounded-2xl text-base font-semibold bg-primary hover:bg-primary-light text-white transition-all duration-300 flex items-center justify-center"
              >
                Back to Login
              </Button>
            </div>
          </>
        )}
      </div>
    </div>
  );
};
