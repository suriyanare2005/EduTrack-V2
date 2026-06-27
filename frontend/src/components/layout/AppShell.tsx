import React from 'react';
import { TopAppBar } from './TopAppBar';
import { BottomNav } from './BottomNav';

interface AppShellProps {
  children: React.ReactNode;
  title: string;
  showBack?: boolean;
  rightActions?: React.ReactNode;
  hideBottomNav?: boolean;
}

export const AppShell: React.FC<AppShellProps> = ({
  children,
  title,
  showBack = false,
  rightActions,
  hideBottomNav = false,
}) => {
  return (
    <div className="flex flex-col min-h-screen bg-background text-text-primary">
      {/* Top sticky app bar */}
      <TopAppBar title={title} showBack={showBack} rightActions={rightActions} />

      {/* Main content viewport */}
      <main className="flex-1 max-w-md w-full mx-auto px-4 pt-4 pb-24 overflow-x-hidden">
        {children}
      </main>

      {/* Bottom navigation bar */}
      {!hideBottomNav && <BottomNav />}
    </div>
  );
};
