import React, { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Bell, Plus, MessageSquare, Calculator, FolderOpen, TrendingUp, Calendar, ArrowUpRight } from 'lucide-react';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { useAuthStore } from '../store/useAuthStore';
import { StatusBadge } from '../components/shared/StatusBadge';
import { ProgressBar } from '../components/shared/ProgressBar';
import { EmptyState } from '../components/shared/EmptyState';
import { Button } from '@/components/ui/button';
import { calculateAccruedInterest } from '../lib/finance';

export const Dashboard: React.FC = () => {
  const navigate = useNavigate();
  const loans = useLoansStore((state) => state.loans);
  const payments = useLoansStore((state) => state.payments);
  const notifications = useLoansStore((state) => state.notifications);
  const notificationCount = useMemo(() => notifications.filter(n => !n.isRead).length, [notifications]);
  const profile = useAuthStore((state) => state.profile);

  // Compute Greetings based on local time
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    if (hour < 12) return 'Good morning';
    if (hour < 17) return 'Good afternoon';
    return 'Good evening';
  }, []);

  const userName = profile?.fullName ? profile.fullName.split(' ')[0] : 'Borrower';

  // Compute Financial Aggregates
  const financialSummary = useMemo(() => {
    if (loans.length === 0) {
      return { totalOutstanding: 0, totalPrincipal: 0, totalInterestAccrued: 0, nextDueDate: 'N/A' };
    }

    const totalOutstanding = loans.reduce((acc, loan) => acc + Number(loan.outstandingBalance || 0), 0);
    const totalPrincipal = loans.reduce((acc, loan) => acc + Number(loan.principal || 0), 0);
    
    // Interest Accrued Mock calculations for UI display
    // In a real app, this is retrieved from payment components and daily accrual schedules
    const totalInterestAccrued = loans.reduce((acc, loan) => {
      return acc + calculateAccruedInterest(loan, payments);
    }, 0);

    // Find earliest EMI due date
    const activeLoans = loans.filter((l) => l.status !== 'completed');
    let nextDueDate = 'N/A';
    if (activeLoans.length > 0) {
      const dates = activeLoans.map((l) => new Date(l.nextEmiDate).getTime());
      const minDate = new Date(Math.min(...dates));
      nextDueDate = minDate.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
    }

    return { totalOutstanding, totalPrincipal, totalInterestAccrued, nextDueDate };
  }, [loans]);

  // Format currency with Indian separators
  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  // Quick Action List
  const quickActions = [
    { label: 'EMI Calculator', icon: Calculator, path: '/calculator', color: 'text-indigo-600 bg-indigo-50 dark:text-indigo-400 dark:bg-indigo-950/30' },
    { label: 'Simulator', icon: TrendingUp, path: '/simulator', color: 'text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/30' },
    { label: 'Documents', icon: FolderOpen, path: '/documents', color: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-950/30' },
    { label: 'Reminders', icon: Calendar, path: '/reminders', color: 'text-amber-600 bg-amber-50 dark:text-amber-400 dark:bg-amber-950/30' },
  ];

  // Right action for Top Bar: Bell notification button
  const topBarRight = (
    <button
      onClick={() => navigate('/notifications')}
      className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 relative active:scale-95"
      aria-label="View notifications"
    >
      <Bell className="w-5 h-5 text-text-primary" />
      {notificationCount > 0 && (
        <span className="absolute top-1 right-1 w-4 h-4 bg-error text-[10px] font-bold text-white rounded-full flex items-center justify-center border border-card">
          {notificationCount}
        </span>
      )}
    </button>
  );

  return (
    <AppShell title={`${greeting}, ${userName} 👋`} rightActions={topBarRight}>
      <div className="space-y-6">
        
        {/* Total Outstanding Balance Summary Card */}
        {loans.length > 0 && (
          <div className="bg-primary text-white rounded-3xl p-6 shadow-lg border border-primary/20 relative overflow-hidden">
            {/* Background decorative circles */}
            <div className="absolute -right-10 -top-10 w-32 h-32 bg-white/10 rounded-full blur-xl pointer-events-none" />
            <div className="absolute -left-10 -bottom-10 w-24 h-24 bg-primary-light/30 rounded-full blur-lg pointer-events-none" />

            <span className="text-xs font-semibold uppercase tracking-wider text-indigo-200">Total Outstanding Balance</span>
            <h3 className="text-3xl font-bold font-mono tracking-tight mt-1 mb-6">
              {formatCurrency(financialSummary.totalOutstanding)}
            </h3>
            
            <div className="grid grid-cols-2 gap-y-3 gap-x-4 border-t border-indigo-500/30 pt-4">
              <div>
                <span className="text-[10px] text-indigo-200 block">Total Principal</span>
                <span className="text-sm font-bold font-mono">{formatCurrency(financialSummary.totalPrincipal)}</span>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-indigo-200 block">Interest Accrued</span>
                <span className="text-sm font-bold font-mono text-indigo-100">{formatCurrency(financialSummary.totalInterestAccrued)}</span>
              </div>
              <div className="col-span-2 flex justify-between items-center border-t border-indigo-500/20 pt-2.5 text-[10px] text-indigo-200">
                <span>Next Due Date</span>
                <span className="font-semibold text-white text-xs">{financialSummary.nextDueDate}</span>
              </div>
            </div>
          </div>
        )}

        {/* Quick Actions Row */}
        <div>
          <h4 className="text-sm font-bold text-text-primary mb-3">Quick Tools</h4>
          <div className="grid grid-cols-4 gap-3">
            {quickActions.map((action) => {
              const Icon = action.icon;
              return (
                <button
                  key={action.label}
                  onClick={() => navigate(action.path)}
                  className="flex flex-col items-center p-3 rounded-2xl bg-card border border-border shadow-sm hover:shadow-md transition-all duration-200 active:scale-95"
                >
                  <div className={`p-2.5 rounded-xl ${action.color} mb-2`}>
                    <Icon className="w-5 h-5" />
                  </div>
                  <span className="text-[10px] font-semibold text-text-secondary text-center leading-tight">
                    {action.label}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Active Loans Section */}
        <div>
          <div className="flex justify-between items-center mb-3">
            <h4 className="text-sm font-bold text-text-primary">Active Education Loans</h4>
            {loans.length > 0 && (
              <button
                onClick={() => navigate('/moratorium')}
                className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
              >
                Track Moratorium <ArrowUpRight className="w-3 h-3" />
              </button>
            )}
          </div>

          {loans.length === 0 ? (
            <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
              <EmptyState
                illustration={
                  <svg viewBox="0 0 100 100" className="w-24 h-24 text-slate-400" fill="none">
                    <circle cx="50" cy="50" r="40" stroke="currentColor" strokeWidth="4" strokeDasharray="6 6" />
                    <path d="M50 35 V65 M35 50 H65" stroke="currentColor" strokeWidth="4" strokeLinecap="round" />
                  </svg>
                }
                title="No active loans"
                description="Add your education loans to track monthly EMIs, moratorium details, and simulate repayment strategies."
                action={
                  <Button
                    onClick={() => navigate('/loans/add')}
                    className="rounded-xl px-6 py-5 bg-primary hover:bg-primary-light text-white font-semibold flex items-center gap-1.5"
                  >
                    <Plus className="w-4 h-4" /> Add Your First Loan
                  </Button>
                }
              />
            </div>
          ) : (
            <div className="space-y-4">
              {loans.map((loan) => {
                const repaidPercentage = ((loan.principal - loan.outstandingBalance) / loan.principal) * 100;
                
                return (
                  <motion.div
                    key={loan.id}
                    onClick={() => navigate(`/loans/${loan.id}`)}
                    whileTap={{ scale: 0.98 }}
                    className={`bg-card border border-border rounded-3xl p-4 shadow-sm hover:shadow-md cursor-pointer transition-shadow duration-200 relative overflow-hidden flex flex-col gap-3 ${
                      loan.status === 'overdue' ? 'border-l-4 border-l-error' : ''
                    }`}
                  >
                    {/* Card Header */}
                    <div className="flex justify-between items-start">
                      <div>
                        <h5 className="font-bold text-text-primary text-base leading-tight truncate max-w-[200px]">
                          {loan.nickname}
                        </h5>
                        <span className="text-xs text-text-secondary">{loan.lender}</span>
                      </div>
                      <StatusBadge status={loan.status} />
                    </div>

                    {/* Balance and Interest Rate */}
                    <div className="flex justify-between items-end mt-1">
                      <div>
                        <span className="text-[10px] text-text-secondary block">Outstanding Balance</span>
                        <span className="text-lg font-bold font-mono text-text-primary leading-none">
                          {formatCurrency(loan.outstandingBalance)}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-[10px] text-text-secondary block">Rate (p.a.)</span>
                        <span className="text-sm font-semibold font-mono text-text-primary">
                          {loan.interestRate}%
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar */}
                    <div className="mt-1">
                      <ProgressBar percentage={repaidPercentage} />
                    </div>

                    {/* Card Footer */}
                    <div className="flex justify-between items-center border-t border-slate-100 dark:border-slate-800/80 pt-3 mt-1 text-xs">
                      <span className="text-text-secondary">
                        Next EMI: <span className="font-semibold text-text-primary font-mono">{formatCurrency(loan.nextEmiAmount)}</span>
                      </span>
                      <span className="text-text-secondary font-medium">
                        Due: {new Date(loan.nextEmiDate).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                      </span>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Buttons */}
      {loans.length > 0 && (
        <>
          {/* Add New Loan FAB (Bottom Right) */}
          <motion.button
            onClick={() => navigate('/loans/add')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-20 right-4 z-40 w-14 h-14 bg-primary hover:bg-primary-light text-white rounded-full flex items-center justify-center shadow-lg active:shadow-xl transition-colors duration-200"
            aria-label="Add new loan"
          >
            <Plus className="w-7 h-7" />
          </motion.button>

          {/* AI assistant FAB (Bottom Left) */}
          <motion.button
            onClick={() => navigate('/assistant')}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="fixed bottom-20 left-4 z-40 w-14 h-14 bg-white dark:bg-slate-800 text-primary dark:text-indigo-400 border border-border rounded-full flex items-center justify-center shadow-lg active:shadow-xl transition-colors duration-200"
            aria-label="Ask AI Assistant"
          >
            <MessageSquare className="w-6 h-6" />
          </motion.button>
        </>
      )}
    </AppShell>
  );
};
