import React from 'react';
import { Outlet } from 'react-router-dom';

export const AuthLayout: React.FC = () => {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4 sm:p-6 md:p-8">
      <div className="w-full max-w-md bg-card rounded-3xl border border-border shadow-md p-6 sm:p-8">
        {/* Render child auth page */}
        <Outlet />
      </div>
    </div>
  );
};
