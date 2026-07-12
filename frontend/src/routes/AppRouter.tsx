import React from 'react';
import { createBrowserRouter, Navigate, RouterProvider, Outlet } from 'react-router-dom';

// Import Pages
import { Onboarding } from '../pages/Onboarding';
import { Login } from '../pages/auth/Login';
import { SignUp } from '../pages/auth/SignUp';
import { ForgotPassword } from '../pages/auth/ForgotPassword';
import { ResetPassword } from '../pages/auth/ResetPassword';
import { Dashboard } from '../pages/Dashboard';
import { Calculator } from '../pages/Calculator';
import { Documents } from '../pages/Documents';
import { DocumentPreview } from '../pages/DocumentPreview';
import { Simulator } from '../pages/Simulator';
import { Settings } from '../pages/Settings';
import { Notifications } from '../pages/Notifications';
import { Assistant } from '../pages/Assistant';
import { MoratoriumTracker } from '../pages/MoratoriumTracker';
import { InterestTracker } from '../pages/InterestTracker';
import { Reminders } from '../pages/Reminders';
import { AddEditLoan } from '../pages/loans/AddEditLoan';
import { LoanDetail } from '../pages/loans/LoanDetail';
import { PaymentHistory } from '../pages/loans/PaymentHistory';

import { AuthLayout } from '../components/layout/AuthLayout';

import { useAuthStore } from '../store/useAuthStore';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

const ProtectedRoute: React.FC = () => {
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/auth/login" replace />;
  }

  return <Outlet />;
};

const PublicRoute: React.FC = () => {
  const session = useAuthStore((state) => state.session);
  const loading = useAuthStore((state) => state.loading);

  if (loading) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-slate-50 dark:bg-slate-900">
        <LoadingSpinner />
      </div>
    );
  }

  if (session) {
    return <Navigate to="/dashboard" replace />;
  }

  return <Outlet />;
};

const router = createBrowserRouter([
  // Redirect Root to Dashboard
  {
    path: '/',
    element: <Navigate to="/dashboard" replace />,
  },
  
  // Onboarding Screen
  {
    path: '/onboarding',
    element: <Onboarding />,
  },
  
  // Auth Routes
  {
    element: <PublicRoute />,
    children: [
      {
        element: <AuthLayout />,
        children: [
          { path: '/auth/login', element: <Login /> },
          { path: '/auth/signup', element: <SignUp /> },
          { path: '/auth/forgot-password', element: <ForgotPassword /> },
          { path: '/auth/reset-password', element: <ResetPassword /> },
        ]
      }
    ],
  },
  
  // App / Authenticated Routes
  {
    element: <ProtectedRoute />,
    children: [
      { path: '/dashboard', element: <Dashboard /> },
      
      // Loans Drill-down
      { path: '/loans/add', element: <AddEditLoan /> },
      { path: '/loans/:id', element: <LoanDetail /> },
      { path: '/loans/:id/edit', element: <AddEditLoan /> },
      { path: '/loans/:id/payments', element: <PaymentHistory /> },
      
      // Quick Actions and Bell
      { path: '/notifications', element: <Notifications /> },
      { path: '/assistant', element: <Assistant /> },
      { path: '/moratorium', element: <MoratoriumTracker /> },
      { path: '/interest-tracker', element: <InterestTracker /> },
      { path: '/reminders', element: <Reminders /> },
      
      // Other Bottom Nav Items
      { path: '/calculator', element: <Calculator /> },
      { path: '/documents', element: <Documents /> },
      { path: '/documents/:docId/preview', element: <DocumentPreview /> },
      { path: '/simulator', element: <Simulator /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
  
  // Fallback 404 Route
  {
    path: '*',
    element: <Navigate to="/dashboard" replace />,
  },
]);

export const AppRouter: React.FC = () => {
  return <RouterProvider router={router} />;
};
