import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, Calculator, FolderOpen, TrendingUp, User } from 'lucide-react';

export const BottomNav: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const navItems = [
    { label: 'Home', icon: Home, path: '/dashboard' },
    { label: 'Calculate', icon: Calculator, path: '/calculator' },
    { label: 'Documents', icon: FolderOpen, path: '/documents' },
    { label: 'Simulator', icon: TrendingUp, path: '/simulator' },
    { label: 'Profile', icon: User, path: '/settings' },
  ];

  // Helper to check if item is active
  const isActive = (path: string) => {
    if (path === '/dashboard') {
      return location.pathname === '/dashboard' || location.pathname.startsWith('/loans');
    }
    return location.pathname === path;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 bg-card border-t border-border pb-safe shadow-lg">
      <div className="max-w-md mx-auto flex items-center justify-around h-16 px-2">
        {navItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);

          return (
            <button
              key={item.label}
              onClick={() => navigate(item.path)}
              className="flex flex-col items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 active:scale-95"
            >
              <Icon
                className={`w-5 h-5 mb-0.5 transition-colors duration-200 ${
                  active ? 'text-primary' : 'text-text-secondary'
                }`}
              />
              <span
                className={`text-[10px] font-medium transition-colors duration-200 ${
                  active ? 'text-primary font-semibold' : 'text-text-secondary'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
