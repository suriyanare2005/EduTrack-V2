import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { calculateMoratoriumInterest } from '../lib/finance';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Clock, Info, Bell } from 'lucide-react';

export const MoratoriumTracker: React.FC = () => {
  const navigate = useNavigate();
  const loans = useLoansStore((state) => state.loans);
  const addReminder = useLoansStore((state) => state.addReminder);

  // Filter loans that have moratorium defined
  const moratoriumLoans = useMemo(() => {
    return loans.filter((l) => l.moratorium?.enabled);
  }, [loans]);

  // Selected loan state
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    moratoriumLoans.length > 0 ? moratoriumLoans[0].id : ''
  );

  const selectedLoan = useMemo(() => {
    return moratoriumLoans.find((l) => l.id === selectedLoanId);
  }, [moratoriumLoans, selectedLoanId]);

  // Capitalize toggle state
  const [interestCapitalized, setInterestCapitalized] = useState(true);
  const [reminderSheetOpen, setReminderSheetOpen] = useState(false);
  const [reminderDaysBefore, setReminderDaysBefore] = useState<number>(3); // 3 days default

  // Calculations
  const calculations = useMemo(() => {
    if (!selectedLoan || !selectedLoan.moratorium) return null;

    const start = new Date(selectedLoan.moratorium.startDate);
    const end = new Date(selectedLoan.moratorium.endDate);
    const now = new Date();

    const totalDurationDays = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    
    // Days elapsed
    const elapsedDays = Math.max(0, Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)));
    
    // Days remaining
    const daysRemaining = Math.max(0, Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    // Moratorium status
    const isActive = now >= start && now <= end;

    // Daily interest rate: P * R / 365 / 100
    const dailyInterestRate = (selectedLoan.principal * (selectedLoan.interestRate / 100)) / 365;

    // Interest accrued so far
    const accruedSoFar = Math.min(
      calculateMoratoriumInterest(selectedLoan.principal, selectedLoan.interestRate, selectedLoan.moratorium.startDate, now.toISOString().split('T')[0]),
      calculateMoratoriumInterest(selectedLoan.principal, selectedLoan.interestRate, selectedLoan.moratorium.startDate, selectedLoan.moratorium.endDate)
    );

    // Projected total accrued
    const totalProjected = calculateMoratoriumInterest(
      selectedLoan.principal,
      selectedLoan.interestRate,
      selectedLoan.moratorium.startDate,
      selectedLoan.moratorium.endDate
    );

    return {
      totalDurationDays,
      elapsedDays,
      daysRemaining,
      isActive,
      dailyInterestRate,
      accruedSoFar,
      totalProjected,
    };
  }, [selectedLoan]);

  // Chart data
  const chartData = useMemo(() => {
    if (!selectedLoan || !selectedLoan.moratorium || !calculations) return [];
    
    const start = new Date(selectedLoan.moratorium.startDate);
    const end = new Date(selectedLoan.moratorium.endDate);
    const monthsDiff = (end.getFullYear() - start.getFullYear()) * 12 + (end.getMonth() - start.getMonth());
    
    const data = [];
    const monthlyAccrual = (calculations.totalProjected / Math.max(1, monthsDiff));

    for (let i = 1; i <= Math.max(1, monthsDiff); i++) {
      const d = new Date(start);
      d.setMonth(start.getMonth() + i);
      const label = d.toLocaleDateString('en-IN', { month: 'short', year: '2-digit' });
      data.push({
        name: label,
        'Accrued Interest': Math.round(monthlyAccrual * i),
        'Monthly Share': Math.round(monthlyAccrual),
      });
    }
    return data;
  }, [selectedLoan, calculations]);

  // Formatters
  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSetReminder = () => {
    if (!selectedLoan || !selectedLoan.moratorium) return;

    // Calculate reminder trigger date
    const targetDate = new Date(selectedLoan.moratorium.endDate);
    targetDate.setDate(targetDate.getDate() - reminderDaysBefore);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const newReminder = {
      id: `rem-mock-${Math.random().toString(36).substr(2, 9)}`,
      loanId: selectedLoan.id,
      label: `Moratorium Ending – ${selectedLoan.nickname}`,
      dueDate: targetDateStr,
      daysBefore: reminderDaysBefore,
      recurrence: 'one_time' as const,
      channelInApp: true,
      channelPush: true,
      isActive: true,
    };

    addReminder(newReminder);
    setReminderSheetOpen(false);
    toast.success('Reminder scheduled successfully!', {
      description: `We will alert you ${reminderDaysBefore} days before moratorium ends (${formatDate(selectedLoan.moratorium.endDate)}).`,
    });
  };

  return (
    <AppShell title="Moratorium Tracker" showBack={true} hideBottomNav={true}>
      <div className="space-y-6">
        
        {/* Selector */}
        {moratoriumLoans.length > 1 && (
          <div className="bg-card border border-border rounded-3xl p-4 shadow-sm">
            <Label className="text-text-secondary text-xs uppercase block mb-1">Select Loan</Label>
            <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
              <SelectTrigger className="rounded-xl h-11 bg-card">
                <SelectValue placeholder="Choose loan profile" />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {moratoriumLoans.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {moratoriumLoans.length === 0 ? (
          <div className="bg-card border border-border rounded-3xl p-6 shadow-sm">
            <div className="text-center py-8 text-text-secondary text-sm space-y-4 max-w-sm mx-auto">
              <Clock className="w-12 h-12 mx-auto text-slate-300" />
              <h3 className="text-lg font-bold text-text-primary">No moratorium loans defined</h3>
              <p className="leading-relaxed">None of your active loans have a moratorium period specified. Edit your loan parameters to set a grace period.</p>
              <Button onClick={() => navigate('/dashboard')} className="rounded-2xl py-5 px-6 font-semibold bg-primary hover:bg-primary-light text-white">
                Back to Dashboard
              </Button>
            </div>
          </div>
        ) : (
          selectedLoan && calculations && selectedLoan.moratorium && (
            <>
              {/* Circular Countdown Card */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm flex flex-col items-center gap-4 text-center">
                <span className="text-[10px] text-text-secondary uppercase tracking-wider">Moratorium Duration</span>
                
                {/* Visual Ring Indicator */}
                <div className="relative w-36 h-36 flex items-center justify-center">
                  <svg className="w-full h-full transform -rotate-90" viewBox="0 0 100 100">
                    <circle cx="50" cy="50" r="40" fill="transparent" stroke="var(--border)" strokeWidth="6" />
                    <circle
                      cx="50"
                      cy="50"
                      r="40"
                      fill="transparent"
                      stroke="url(#morRingGrad)"
                      strokeWidth="8"
                      strokeDasharray={251.2}
                      strokeDashoffset={251.2 - (251.2 * (calculations.totalDurationDays - calculations.daysRemaining)) / calculations.totalDurationDays}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="morRingGrad" x1="0" y1="0" x2="1" y2="1">
                        <stop offset="0%" stopColor="#3730A3" />
                        <stop offset="100%" stopColor="#F59E0B" />
                      </linearGradient>
                    </defs>
                  </svg>
                  <div className="absolute flex flex-col items-center">
                    <span className="text-3xl font-extrabold font-mono text-text-primary tracking-tighter">
                      {calculations.daysRemaining}
                    </span>
                    <span className="text-[10px] text-text-secondary uppercase font-semibold">Days Left</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-8 w-full border-t border-slate-100 dark:border-slate-800/80 pt-4 text-xs font-medium">
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">Start Date</span>
                    <span className="text-text-primary font-mono">{formatDate(selectedLoan.moratorium.startDate)}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-text-secondary block uppercase">End Date</span>
                    <span className="text-text-primary font-mono">{formatDate(selectedLoan.moratorium.endDate)}</span>
                  </div>
                </div>
              </div>

              {/* Interest Accrual statistics */}
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Interest Accruals</h3>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] text-text-secondary block uppercase">Accrued to Date</span>
                    <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block">
                      {formatCurrency(calculations.accruedSoFar)}
                    </span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80">
                    <span className="text-[10px] text-text-secondary block uppercase">Daily Accrual</span>
                    <span className="text-lg font-bold font-mono text-amber-600 dark:text-amber-400 mt-1 block">
                      {formatCurrency(calculations.dailyInterestRate)}
                    </span>
                  </div>
                </div>

                <div className="flex justify-between items-center text-xs border-b border-slate-100 dark:border-slate-800/80 pb-3">
                  <span className="text-text-secondary">Projected Moratorium Total</span>
                  <span className="font-bold text-text-primary font-mono">{formatCurrency(calculations.totalProjected)}</span>
                </div>

                {/* Capitalization Toggle */}
                <div className="space-y-3 pt-1">
                  <div className="flex justify-between items-center">
                    <div className="space-y-0.5">
                      <Label className="text-xs font-bold text-text-primary">Capitalize Accrued Interest?</Label>
                      <p className="text-[10px] text-text-secondary">Interest will be added to the principal balance.</p>
                    </div>
                    <Switch checked={interestCapitalized} onCheckedChange={setInterestCapitalized} />
                  </div>

                  <div className="flex items-start gap-2 bg-slate-50 dark:bg-slate-800/40 border rounded-2xl p-3 text-xs leading-relaxed text-text-secondary">
                    <Info className="w-4 h-4 text-primary flex-shrink-0 mt-0.5" />
                    <div>
                      {interestCapitalized ? (
                        <p>
                          <strong>Capitalization Effect</strong>: At moratorium end, your loan principal will increase from <strong>{formatCurrency(selectedLoan.principal)}</strong> to <strong>{formatCurrency(selectedLoan.principal + calculations.totalProjected)}</strong>. This will increase your monthly EMI.
                        </p>
                      ) : (
                        <p>
                          <strong>Separate Payment Effect</strong>: You must clear <strong>{formatCurrency(calculations.totalProjected)}</strong> as a lump sum before repayments start to keep your principal unchanged at <strong>{formatCurrency(selectedLoan.principal)}</strong>.
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recharts Bar Chart */}
              {chartData.length > 0 && (
                <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                  <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Interest Growth Trend</h3>
                  <div className="h-44 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                        <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                        <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                        <Tooltip formatter={(value) => formatCurrency(value as number)} />
                        <Bar dataKey="Accrued Interest" fill="#F59E0B" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              )}

              {/* Set Reminder Button */}
              {calculations.isActive && (
                <Sheet open={reminderSheetOpen} onOpenChange={setReminderSheetOpen}>
                  <SheetTrigger asChild>
                    <Button className="w-full py-6 rounded-2xl text-base font-bold bg-primary hover:bg-primary-light text-white shadow-md flex items-center justify-center gap-2">
                      <Bell className="w-5 h-5" /> Set Moratorium End Alert
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-3xl max-w-md mx-auto p-6 focus-visible:outline-none">
                    <SheetHeader className="mb-4">
                      <SheetTitle className="text-lg font-bold">Moratorium Completion Alert</SheetTitle>
                      <SheetDescription className="text-xs text-text-secondary">
                        Configure a payment warning reminder before your grace period concludes.
                      </SheetDescription>
                    </SheetHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Alert Warning Timing</Label>
                        <Select
                          value={reminderDaysBefore.toString()}
                          onValueChange={(val) => setReminderDaysBefore(parseInt(val, 10))}
                        >
                          <SelectTrigger className="rounded-xl h-11 bg-card">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            <SelectItem value="1">1 Day Before</SelectItem>
                            <SelectItem value="3">3 Days Before</SelectItem>
                            <SelectItem value="5">5 Days Before</SelectItem>
                            <SelectItem value="7">7 Days Before</SelectItem>
                            <SelectItem value="14">14 Days Before</SelectItem>
                            <SelectItem value="30">30 Days Before</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <Button
                        onClick={handleSetReminder}
                        className="w-full py-5 bg-primary hover:bg-primary-light text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center mt-2"
                      >
                        Schedule Reminder
                      </Button>
                    </div>
                  </SheetContent>
                </Sheet>
              )}
            </>
          )
        )}
      </div>
    </AppShell>
  );
};
