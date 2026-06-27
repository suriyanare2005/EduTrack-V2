import React from 'react';
import { generateAmortizationSchedule } from '../../lib/finance';
import { ScrollArea } from '@/components/ui/scroll-area';

interface AmortizationTableProps {
  principal: number;
  interestRate: number;
  tenureMonths: number;
  emiStartDate: string;
  paymentsCount: number; // Number of payments logged so far
}

export const AmortizationTable: React.FC<AmortizationTableProps> = ({
  principal,
  interestRate,
  tenureMonths,
  emiStartDate,
  paymentsCount,
}) => {
  const schedule = generateAmortizationSchedule(principal, interestRate, tenureMonths, emiStartDate);

  // Format currency with Indian separators
  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric' });
  };

  if (schedule.length === 0) {
    return (
      <div className="text-center py-8 text-text-secondary text-sm">
        Unable to calculate amortization schedule. Please review loan details.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Table Headers */}
      <div className="grid grid-cols-5 gap-2 px-3 py-2 text-[10px] font-bold text-text-secondary uppercase bg-slate-50 dark:bg-slate-800/50 rounded-xl">
        <span>Month</span>
        <span>Date</span>
        <span className="text-right">EMI</span>
        <span className="text-right">Interest</span>
        <span className="text-right">Balance</span>
      </div>

      {/* Scrollable Rows */}
      <ScrollArea className="h-[320px] pr-1">
        <div className="space-y-1.5">
          {schedule.map((row) => {
            const isPaid = row.month <= paymentsCount;

            return (
              <div
                key={row.month}
                className={`grid grid-cols-5 gap-2 px-3 py-2 text-xs rounded-xl border border-transparent font-mono ${
                  isPaid
                    ? 'bg-slate-100/50 text-text-secondary dark:bg-slate-900/30 line-through decoration-slate-400'
                    : 'bg-card text-text-primary hover:border-slate-100 dark:hover:border-slate-800'
                }`}
              >
                <span className="font-semibold text-left">{row.month}</span>
                <span className="font-sans text-left">{formatDate(row.date)}</span>
                <span className="text-right font-bold">{formatCurrency(row.emi)}</span>
                <span className="text-right text-text-secondary">{formatCurrency(row.interestComponent)}</span>
                <span className="text-right font-bold text-primary dark:text-indigo-400">
                  {formatCurrency(row.balance)}
                </span>
              </div>
            );
          })}
        </div>
      </ScrollArea>
    </div>
  );
};
