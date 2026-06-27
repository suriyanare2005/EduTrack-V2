import React, { useState, useMemo, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import { Plus, CheckCircle, Clock } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useLoansStore } from '../../store/useLoansStore';
import { CurrencyInput } from '../../components/shared/CurrencyInput';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';

export const PaymentHistory: React.FC = () => {
  const { id } = useParams<{ id: string }>();

  const loans = useLoansStore((state) => state.loans);
  const payments = useLoansStore((state) => state.payments);
  const addPayment = useLoansStore((state) => state.addPayment);
  const updateLoan = useLoansStore((state) => state.updateLoan);

  const [activeFilter, setActiveFilter] = useState<'all' | 'on_time' | 'late'>('all');
  
  // Log payment sheet state
  const [logPaymentOpen, setLogPaymentOpen] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState<'bank_transfer' | 'upi' | 'cheque' | 'auto_debit'>('auto_debit');
  const [payNotes, setPayNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  const loan = useMemo(() => loans.find((l) => l.id === id), [loans, id]);
  const loanPayments = useMemo(() => payments.filter((p) => p.loanId === id), [payments, id]);

  useEffect(() => {
    if (loan) {
      setPayAmount(loan.nextEmiAmount);
    }
  }, [loan, logPaymentOpen]);

  // Aggregate values
  const aggregates = useMemo(() => {
    const totalPaid = loanPayments.reduce((acc, p) => acc + p.amount, 0);
    const count = loanPayments.length;
    // In our mock, everything is on-time.
    const onTimeRate = count > 0 ? 100 : 0;
    return { totalPaid, count, onTimeRate };
  }, [loanPayments]);

  const filteredPayments = useMemo(() => {
    if (activeFilter === 'all') return loanPayments;
    if (activeFilter === 'on_time') return loanPayments; // All are on time in mock
    return []; // No late payments logged in mock
  }, [loanPayments, activeFilter]);

  if (!loan) return null;

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

  const handleLogPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (payAmount <= 0) {
      toast.error('Payment amount must be greater than zero');
      return;
    }

    setIsLogging(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 1000));

      const principalComponent = Math.round(payAmount * 0.6);
      const interestComponent = payAmount - principalComponent;

      const newPayment = {
        id: `pay-${Math.random().toString(36).substr(2, 9)}`,
        loanId: loan.id,
        paymentDate: payDate,
        amount: payAmount,
        principalComponent,
        interestComponent,
        paymentMode: payMode,
        notes: payNotes || undefined,
      };

      const newOutstanding = Math.max(0, loan.outstandingBalance - payAmount);
      const isCompleted = newOutstanding === 0;

      const updatedLoan = {
        ...loan,
        outstandingBalance: newOutstanding,
        status: (isCompleted ? 'completed' : loan.status) as any,
        nextEmiDate: new Date(new Date(loan.nextEmiDate).setMonth(new Date(loan.nextEmiDate).getMonth() + 1)).toISOString().split('T')[0],
      };

      addPayment(newPayment);
      updateLoan(updatedLoan);
      setLogPaymentOpen(false);

      setPayNotes('');
      toast.success('Payment logged successfully');
    } catch (err) {
      toast.error('Failed to log payment');
    } finally {
      setIsLogging(false);
    }
  };

  return (
    <AppShell
      title="Payment History"
      showBack={true}
      hideBottomNav={true}
    >
      <div className="space-y-6">
        
        {/* Header strip info */}
        <div className="bg-card border border-border p-4 rounded-3xl shadow-sm text-center">
          <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Account Nickname</span>
          <span className="text-base font-bold text-text-primary">{loan.nickname}</span>
        </div>

        {/* Aggregates Summary strip */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm grid grid-cols-3 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-800">
          <div>
            <span className="text-[10px] text-text-secondary block uppercase">Total Paid</span>
            <span className="text-sm font-bold font-mono text-text-primary">
              {formatCurrency(aggregates.totalPaid)}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-secondary block uppercase">Payments</span>
            <span className="text-sm font-bold font-mono text-text-primary">
              {aggregates.count}
            </span>
          </div>
          <div>
            <span className="text-[10px] text-text-secondary block uppercase">On-Time Rate</span>
            <span className="text-sm font-bold font-mono text-emerald-600 dark:text-emerald-400">
              {aggregates.onTimeRate}%
            </span>
          </div>
        </div>

        {/* Filters bar */}
        <div className="flex gap-2">
          {['all', 'on_time', 'late'].map((filter) => {
            const label = filter.replace('_', ' ');
            const active = activeFilter === filter;
            return (
              <button
                key={filter}
                onClick={() => setActiveFilter(filter as any)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border transition-all duration-200 capitalize ${
                  active
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-card border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {label}
              </button>
            );
          })}
        </div>

        {/* Payments List */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <h4 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Payment Ledger</h4>

          {filteredPayments.length === 0 ? (
            <div className="text-center py-8 text-text-secondary text-sm space-y-2">
              <Clock className="w-8 h-8 mx-auto text-slate-300 animate-pulse" />
              <p>No transactions found for this filter criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredPayments.map((pay) => (
                <div
                  key={pay.id}
                  className="flex justify-between items-start py-3 border-b border-slate-50 dark:border-slate-800/80 last:border-b-0 last:pb-0"
                >
                  <div className="space-y-1">
                    <span className="text-sm font-bold text-text-primary font-mono">{formatCurrency(pay.amount)}</span>
                    <div className="text-[10px] text-text-secondary space-y-0.5">
                      <p className="font-semibold">{pay.paymentMode.replace('_', ' ').toUpperCase()}</p>
                      <p className="font-mono">{formatDate(pay.paymentDate)}</p>
                      {pay.notes && <p className="italic text-text-secondary/80">"{pay.notes}"</p>}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-1">
                    <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2.5 py-0.5 rounded-full font-bold flex items-center gap-0.5">
                      <CheckCircle className="w-3 h-3" /> On-Time
                    </span>
                    <span className="text-[9px] text-text-secondary font-mono">
                      P: {formatCurrency(pay.principalComponent)} • I: {formatCurrency(pay.interestComponent)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Floating Action Button (FAB) to log manual payment */}
      <Sheet open={logPaymentOpen} onOpenChange={setLogPaymentOpen}>
        <SheetTrigger asChild>
          <button
            className="fixed bottom-6 right-4 z-40 w-14 h-14 bg-primary hover:bg-primary-light text-white rounded-full flex items-center justify-center shadow-lg active:shadow-xl transition-colors duration-200"
            aria-label="Log payment"
          >
            <Plus className="w-7 h-7" />
          </button>
        </SheetTrigger>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-md mx-auto p-6 focus-visible:outline-none">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg font-bold">Log Manual Payment</SheetTitle>
            <SheetDescription className="text-xs text-text-secondary">
              Record a payment to deduct from your active outstanding balance.
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={handleLogPayment} className="space-y-4">
            <div className="space-y-1">
              <Label htmlFor="payDate">Payment Date</Label>
              <Input
                id="payDate"
                type="date"
                value={payDate}
                onChange={(e) => setPayDate(e.target.value)}
                className="rounded-xl font-mono h-11"
                required
              />
            </div>

            <div className="space-y-1">
              <Label>Amount Paid</Label>
              <CurrencyInput
                value={payAmount}
                onChange={(val) => setPayAmount(val)}
              />
            </div>

            <div className="space-y-1">
              <Label>Payment Mode</Label>
              <Select
                value={payMode}
                onValueChange={(val: any) => setPayMode(val)}
              >
                <SelectTrigger className="rounded-xl h-11 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="auto_debit">Auto-Debit</SelectItem>
                  <SelectItem value="upi">UPI (GPay/PhonePe)</SelectItem>
                  <SelectItem value="bank_transfer">Net Banking / NEFT</SelectItem>
                  <SelectItem value="cheque">Cheque</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label htmlFor="payNotes">Notes (Optional)</Label>
              <Input
                id="payNotes"
                placeholder="e.g. Extra payment made to reduce principal"
                value={payNotes}
                onChange={(e) => setPayNotes(e.target.value)}
                className="rounded-xl h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={isLogging}
              className="w-full py-5 bg-primary hover:bg-primary-light text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-4"
            >
              {isLogging ? <LoadingSpinner size="xs" /> : 'Confirm Payment Log'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};
