import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';

interface TopAppBarProps {
  title: string;
  showBack?: boolean;
  rightActions?: React.ReactNode;
}

export const TopAppBar: React.FC<TopAppBarProps> = ({
  title,
  showBack = false,
  rightActions,
}) => {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-40 w-full bg-card border-b border-border shadow-sm">
      <div className="max-w-md mx-auto flex items-center justify-between h-14 px-4">
        {/* Left item */}
        <div className="flex items-center w-12 justify-start">
          {showBack && (
            <button
              onClick={() => navigate(-1)}
              className="p-2 -ml-2 rounded-xl text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 active:scale-95"
              aria-label="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Center title */}
        <h1 className="text-base font-bold text-text-primary truncate text-center max-w-[200px]">
          {title}
        </h1>

        {/* Right item */}
        <div className="flex items-center w-12 justify-end">
          {rightActions && <div className="flex items-center">{rightActions}</div>}
        </div>
      </div>
    </header>
  );
};
