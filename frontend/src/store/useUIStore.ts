import { create } from 'zustand';

interface UIState {
  darkMode: boolean;
  notificationCount: number;
  toggleDarkMode: () => void;
  setNotificationCount: (count: number) => void;
  initializeUI: () => void;
}

export const useUIStore = create<UIState>((set, get) => ({
  darkMode: false,
  notificationCount: 0,
  toggleDarkMode: () => {
    const nextMode = !get().darkMode;
    set({ darkMode: nextMode });
    localStorage.setItem('darkMode', JSON.stringify(nextMode));
    if (nextMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
  setNotificationCount: (count: number) => set({ notificationCount: count }),
  initializeUI: () => {
    const savedMode = localStorage.getItem('darkMode');
    const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const darkMode = savedMode ? JSON.parse(savedMode) : systemPrefersDark;

    set({ darkMode });
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  },
}));
