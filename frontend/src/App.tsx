import { useEffect } from 'react';
import { AppRouter } from './routes/AppRouter';
import { useUIStore } from './store/useUIStore';
import { useAuthStore } from './store/useAuthStore';
import { useLoansStore } from './store/useLoansStore';
import { Toaster } from '@/components/ui/sonner';

function App() {
  const initializeUI = useUIStore((state) => state.initializeUI);
  const checkSessionAction = useAuthStore((state) => state.checkSessionAction);
  const syncWithBackend = useLoansStore((state) => state.syncWithBackend);
  const session = useAuthStore((state) => state.session);

  useEffect(() => {
    initializeUI();
    checkSessionAction();
  }, [initializeUI, checkSessionAction]);

  useEffect(() => {
    if (session) {
      syncWithBackend();
    }
  }, [session, syncWithBackend]);

  return (
    <>
      <AppRouter />
      <Toaster position="top-center" closeButton richColors />
    </>
  );
}

export default App;
