import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { Bell, Info, Clock, Trash2, CheckSquare } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { useUIStore } from '../store/useUIStore';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { EmptyState } from '../components/shared/EmptyState';
import { toast } from 'sonner';
import { formatDistanceToNow } from 'date-fns';

export const Notifications: React.FC = () => {
  const navigate = useNavigate();
  const notifications = useLoansStore((state) => state.notifications);
  const markNotificationRead = useLoansStore((state) => state.markNotificationRead);
  const markAllNotificationsRead = useLoansStore((state) => state.markAllNotificationsRead);
  const removeNotification = useLoansStore((state) => state.removeNotification);
  const setNotificationCount = useUIStore((state) => state.setNotificationCount);

  const [activeTab, setActiveTab] = useState<'all' | 'reminder' | 'system' | 'moratorium'>('all');

  // Clear unread badge count on visiting the screen
  useEffect(() => {
    setNotificationCount(0);
  }, [setNotificationCount]);

  // Filter notifications based on active tab
  const filteredNotifications = useMemo(() => {
    if (activeTab === 'all') return notifications;
    return notifications.filter((n) => n.type === activeTab);
  }, [notifications, activeTab]);

  const handleMarkAllRead = () => {
    markAllNotificationsRead();
    toast.success('All notifications marked as read');
  };

  const handleNotificationClick = (id: string, type: string) => {
    markNotificationRead(id);
    
    // Redirect based on type
    if (type === 'reminder') {
      navigate('/reminders');
    } else if (type === 'moratorium') {
      navigate('/moratorium');
    }
  };

  const handleDelete = (id: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Stop click bubble redirection
    removeNotification(id);
    toast.success('Notification deleted');
  };

  // Helper to format timestamps relatively
  const formatTime = (timeStr: string) => {
    try {
      return formatDistanceToNow(new Date(timeStr), { addSuffix: true });
    } catch (err) {
      return 'just now';
    }
  };

  // Icon mapping
  const iconMap = {
    reminder: { icon: Bell, bg: 'bg-amber-100 text-amber-600 dark:bg-amber-950/30 dark:text-amber-400' },
    moratorium: { icon: Clock, bg: 'bg-indigo-100 text-indigo-600 dark:bg-indigo-950/30 dark:text-indigo-400' },
    system: { icon: Info, bg: 'bg-emerald-100 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-400' },
  };

  return (
    <AppShell
      title="Notifications"
      showBack={true}
      hideBottomNav={true}
      rightActions={
        notifications.some((n) => !n.isRead) ? (
          <button
            onClick={handleMarkAllRead}
            className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 active:scale-95 text-text-primary"
            aria-label="Mark all as read"
          >
            <CheckSquare className="w-5 h-5" />
          </button>
        ) : undefined
      }
    >
      <div className="space-y-6">
        
        {/* Tab filters */}
        <Tabs defaultValue="all" onValueChange={(val) => setActiveTab(val as any)} className="w-full">
          <TabsList className="grid grid-cols-4 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1">
            <TabsTrigger value="all" className="rounded-lg text-[10px] py-1.5 font-bold">All</TabsTrigger>
            <TabsTrigger value="reminder" className="rounded-lg text-[10px] py-1.5 font-bold">Alerts</TabsTrigger>
            <TabsTrigger value="moratorium" className="rounded-lg text-[10px] py-1.5 font-bold">Moratorium</TabsTrigger>
            <TabsTrigger value="system" className="rounded-lg text-[10px] py-1.5 font-bold">System</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Notifications List */}
        {filteredNotifications.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <EmptyState
              illustration={<Bell className="w-12 h-12 text-slate-300" />}
              title="No Notifications"
              description={`You have no active ${activeTab !== 'all' ? activeTab : ''} notifications at the moment.`}
            />
          </div>
        ) : (
          <div className="space-y-3">
            <AnimatePresence initial={false}>
              {filteredNotifications.map((notif) => {
                const iconConf = iconMap[notif.type] || iconMap.system;
                const Icon = iconConf.icon;

                return (
                  <motion.div
                    key={notif.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, x: -100 }}
                    transition={{ duration: 0.2 }}
                    onClick={() => handleNotificationClick(notif.id, notif.type)}
                    className={`bg-card border border-border rounded-3xl p-4 shadow-sm flex items-start gap-3 hover:shadow-md cursor-pointer transition-shadow duration-200 relative overflow-hidden group ${
                      !notif.isRead ? 'bg-primary/5 dark:bg-indigo-950/10' : ''
                    }`}
                  >
                    {/* Unread indicator dot */}
                    {!notif.isRead && (
                      <span className="absolute top-4 right-4 w-2.5 h-2.5 bg-primary rounded-full" />
                    )}

                    {/* Icon block */}
                    <div className={`p-2.5 rounded-2xl ${iconConf.bg} flex-shrink-0 mt-0.5`}>
                      <Icon className="w-5 h-5" />
                    </div>

                    {/* Text block */}
                    <div className="flex-1 pr-6 space-y-0.5 min-w-0">
                      <h4 className={`text-sm text-text-primary leading-snug truncate ${
                        !notif.isRead ? 'font-bold' : 'font-semibold'
                      }`}>
                        {notif.title}
                      </h4>
                      <p className="text-xs text-text-secondary leading-normal">
                        {notif.body}
                      </p>
                      <span className="text-[10px] text-text-secondary/70 block pt-1 font-medium font-sans">
                        {formatTime(notif.createdAt)}
                      </span>
                    </div>

                    {/* Hover delete trigger */}
                    <button
                      onClick={(e) => handleDelete(notif.id, e)}
                      className="absolute bottom-4 right-4 p-2 rounded-xl text-text-secondary hover:text-error hover:bg-red-50 dark:hover:bg-red-950/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                      aria-label="Delete notification"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </div>
        )}

      </div>
    </AppShell>
  );
};

// Add useMemo to imports to support memoized filters
import { useMemo } from 'react';
