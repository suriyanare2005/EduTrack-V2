import React, { useState, useMemo } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import { toast } from 'sonner';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid } from 'recharts';
import { Download } from 'lucide-react';
import { format, subMonths } from 'date-fns';

export const InterestTracker: React.FC = () => {
  const loans = useLoansStore((state) => state.loans);

  // Selected Loan ID (All or specific loan ID)
  const [selectedLoanId, setSelectedLoanId] = useState<string>('all');

  const selectedLoan = useMemo(() => {
    return loans.find((l) => l.id === selectedLoanId);
  }, [loans, selectedLoanId]);

  // Aggregate stats
  const stats = useMemo(() => {
    if (loans.length === 0) {
      return { totalAccrued: 0, totalMoratorium: 0, totalRepayment: 0 };
    }

    if (selectedLoanId !== 'all' && selectedLoan) {
      const isSBI = selectedLoan.id === 'loan-sbi-123';
      const totalAccrued = isSBI ? 145000 : 18900;
      const totalMoratorium = isSBI ? 104500 : 18900;
      const totalRepayment = isSBI ? 40500 : 0;
      return { totalAccrued, totalMoratorium, totalRepayment };
    }

    // "All" selected
    const totalAccrued = loans.reduce((acc, loan) => {
      if (loan.id === 'loan-sbi-123') return acc + 145000;
      if (loan.id === 'loan-hdfc-456') return acc + 18900;
      return acc + (loan.principal * 0.05);
    }, 0);

    const totalMoratorium = loans.reduce((acc, loan) => {
      if (loan.id === 'loan-sbi-123') return acc + 104500;
      if (loan.id === 'loan-hdfc-456') return acc + 18900;
      return acc + (loan.principal * 0.03);
    }, 0);

    const totalRepayment = Math.max(0, totalAccrued - totalMoratorium);

    return { totalAccrued, totalMoratorium, totalRepayment };
  }, [loans, selectedLoanId, selectedLoan]);

  // Chart data (Last 12 months)
  const chartData = useMemo(() => {
    const data = [];
    const now = new Date();
    
    for (let i = 11; i >= 0; i--) {
      const d = subMonths(now, i);
      const label = format(d, 'MMM yy');
      
      let sbiAccrual = 0;
      let hdfcAccrual = 0;

      // SBI: mor ended 2024-07. Active repayment since.
      // Monthly interest: SBI outstanding is around 12L. 12L * 9.55% / 12 = ~9.5k.
      // Moratorium interest was around 12k monthly.
      if (i >= 8) {
        // Moratorium phase
        sbiAccrual = 11937; 
      } else {
        // Repayment phase
        sbiAccrual = 9800 - (11 - i) * 60;
      }

      // HDFC: started 2026-01. Active moratorium.
      // Monthly interest: 4L * 11.2% / 12 = 3733.
      if (i <= 5) {
        hdfcAccrual = 3733;
      }

      let interest = 0;
      if (selectedLoanId === 'all') {
        interest = sbiAccrual + hdfcAccrual;
      } else if (selectedLoanId === 'loan-sbi-123') {
        interest = sbiAccrual;
      } else if (selectedLoanId === 'loan-hdfc-456') {
        interest = hdfcAccrual;
      }

      data.push({
        name: label,
        Interest: Math.round(interest),
        isMoratorium: selectedLoanId === 'loan-hdfc-456' || (selectedLoanId === 'all' && i <= 5) || (selectedLoanId === 'loan-sbi-123' && i >= 8),
      });
    }

    return data;
  }, [selectedLoanId]);

  // Table breakdown rows
  const breakdownRows = useMemo(() => {
    const rows = [];
    const now = new Date();
    
    for (let i = 0; i < 6; i++) {
      const d = subMonths(now, i);
      const label = format(d, 'MMMM yyyy');
      
      let rate = 9.55;
      let accrued = 9800;
      let type = 'Compound';

      if (selectedLoanId === 'loan-sbi-123') {
        rate = 9.55;
        accrued = 9800 - i * 60;
        type = 'Compound';
      } else if (selectedLoanId === 'loan-hdfc-456') {
        rate = 11.2;
        accrued = 3733;
        type = 'Simple';
      } else {
        // All
        rate = 10.37; // average
        accrued = (9800 - i * 60) + (i <= 5 ? 3733 : 0);
        type = 'Mixed';
      }

      rows.push({
        month: label,
        days: 30,
        rate,
        accrued: Math.round(accrued),
        type,
      });
    }
    return rows;
  }, [selectedLoanId]);

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.success(`Exporting as ${format.toUpperCase()}`, {
      description: 'Your interest accrued ledger will start downloading shortly.',
    });
  };

  return (
    <AppShell
      title="Interest Tracker"
      showBack={true}
      hideBottomNav={true}
      rightActions={
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleExport('pdf')}
          className="w-9 h-9 rounded-xl text-text-primary"
          aria-label="Export PDF"
        >
          <Download className="w-4 h-4" />
        </Button>
      }
    >
      <div className="space-y-6">
        
        {/* Selector Card */}
        <div className="bg-card border border-border rounded-3xl p-4 shadow-sm flex flex-col gap-2">
          <Label className="text-text-secondary text-xs uppercase block">Select Loan Account</Label>
          <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
            <SelectTrigger className="rounded-xl h-11 bg-card">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="rounded-xl">
              <SelectItem value="all">Combined Summary (All Loans)</SelectItem>
              {loans.map((l) => (
                <SelectItem key={l.id} value={l.id}>
                  {l.nickname}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Aggregates Summary Cards Row */}
        <div className="grid grid-cols-3 gap-3">
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm text-center">
            <span className="text-[9px] text-text-secondary uppercase block leading-tight mb-1">Lifetime Interest</span>
            <span className="text-xs font-bold font-mono text-primary dark:text-indigo-400 block truncate">
              {formatCurrency(stats.totalAccrued)}
            </span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm text-center">
            <span className="text-[9px] text-text-secondary uppercase block leading-tight mb-1">Moratorium</span>
            <span className="text-xs font-bold font-mono text-amber-600 dark:text-amber-400 block truncate">
              {formatCurrency(stats.totalMoratorium)}
            </span>
          </div>
          <div className="bg-card border border-border rounded-2xl p-3 shadow-sm text-center">
            <span className="text-[9px] text-text-secondary uppercase block leading-tight mb-1">Repayment</span>
            <span className="text-xs font-bold font-mono text-emerald-600 dark:text-emerald-400 block truncate">
              {formatCurrency(stats.totalRepayment)}
            </span>
          </div>
        </div>

        {/* Recharts Line Chart */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Monthly Interest Trend</h3>
          <div className="h-44 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                <Tooltip formatter={(value) => formatCurrency(value as number)} />
                <Line type="monotone" dataKey="Interest" stroke="#3730A3" strokeWidth={3} dot={{ r: 3 }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
          <div className="text-[10px] text-text-secondary text-center leading-relaxed">
            Moratorium periods automatically accrue interest (daily) which is added or paid depending on loan parameters.
          </div>
        </div>

        {/* Breakdown Table Card */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-50 dark:border-slate-800/80 pb-3">
            <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Interest Ledger</h4>
            {selectedLoanId !== 'all' && selectedLoan && (
              <span className="text-[9px] font-bold text-text-secondary bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full uppercase">
                {selectedLoan.interestType}
              </span>
            )}
          </div>

          <ScrollArea className="h-48 pr-1">
            <div className="space-y-3">
              {breakdownRows.map((row, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800 last:border-b-0"
                >
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text-primary block">{row.month}</span>
                    <span className="text-[9px] text-text-secondary block">
                      {row.days} Days • {row.rate}% Annual Rate ({row.type})
                    </span>
                  </div>
                  <span className="text-xs font-bold font-mono text-primary dark:text-indigo-400">
                    {formatCurrency(row.accrued)}
                  </span>
                </div>
              ))}
            </div>
          </ScrollArea>
        </div>

        {/* Export triggers */}
        <Button
          onClick={() => handleExport('csv')}
          variant="outline"
          className="w-full py-6 rounded-2xl border-primary/20 text-primary hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold flex items-center justify-center gap-1.5 shadow-sm"
        >
          <Download className="w-5 h-5" /> Export Interest Ledger CSV
        </Button>

      </div>
    </AppShell>
  );
};
