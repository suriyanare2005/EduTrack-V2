import React, { useState, useMemo, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Edit2, Calendar, FileText, ChevronRight, Upload, Clock } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useLoansStore } from '../../store/useLoansStore';
import { StatusBadge } from '../../components/shared/StatusBadge';
import { ProgressBar } from '../../components/shared/ProgressBar';
import { AmortizationTable } from '../../components/loans/AmortizationTable';
import { CurrencyInput } from '../../components/shared/CurrencyInput';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { toast } from 'sonner';
import { calculateMoratoriumInterest } from '../../lib/finance';
import { AreaChart, Area, XAxis, Tooltip, ResponsiveContainer } from 'recharts';

export const LoanDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const loans = useLoansStore((state) => state.loans);
  const payments = useLoansStore((state) => state.payments);
  const documents = useLoansStore((state) => state.documents);
  const addPayment = useLoansStore((state) => state.addPayment);
  const updateLoan = useLoansStore((state) => state.updateLoan);
  const addDocument = useLoansStore((state) => state.addDocument);

  // States for logging payment bottom sheet
  const [logPaymentOpen, setLogPaymentOpen] = useState(false);
  const [payDate, setPayDate] = useState(new Date().toISOString().split('T')[0]);
  const [payAmount, setPayAmount] = useState(0);
  const [payMode, setPayMode] = useState<'bank_transfer' | 'upi' | 'cheque' | 'auto_debit'>('auto_debit');
  const [payNotes, setPayNotes] = useState('');
  const [isLogging, setIsLogging] = useState(false);

  // Fetch loan details
  const loan = useMemo(() => loans.find((l) => l.id === id), [loans, id]);

  // Fetch loan payments
  const loanPayments = useMemo(() => payments.filter((p) => p.loanId === id), [payments, id]);

  // Fetch loan documents
  const loanDocs = useMemo(() => documents.filter((d) => d.loanId === id), [documents, id]);

  // Pre-fill payment amount when sheet opens
  useEffect(() => {
    if (loan) {
      setPayAmount(loan.nextEmiAmount);
    }
  }, [loan, logPaymentOpen]);

  // Compute Moratorium days remaining
  const moratoriumDays = useMemo(() => {
    if (!loan?.moratorium?.enabled) return 0;
    const end = new Date(loan.moratorium.endDate).getTime();
    const now = new Date().getTime();
    const diff = end - now;
    return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
  }, [loan]);

  // Calculate moratorium interest accrued
  const moratoriumInterest = useMemo(() => {
    if (!loan?.moratorium?.enabled) return 0;
    return calculateMoratoriumInterest(
      loan.principal,
      loan.interestRate,
      loan.moratorium.startDate,
      loan.moratorium.endDate
    );
  }, [loan]);

  // Recharts Monthly Interest Accrued Mock Trend Data
  const chartData = useMemo(() => {
    if (!loan) return [];
    const monthlyRate = loan.interestRate / 12 / 100;
    const data = [];
    const now = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(now.getMonth() - i);
      const label = d.toLocaleDateString('en-IN', { month: 'short' });
      // Simulate interest based on outstanding
      const factor = 1 + (i * 0.005);
      const interest = Math.round(loan.outstandingBalance * factor * monthlyRate);
      data.push({ name: label, Interest: interest });
    }
    return data;
  }, [loan]);

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

      const principalComponent = Math.round(payAmount * 0.6); // Approximate principal split
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

      // Update loan balance
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

      // Reset fields
      setPayNotes('');
      toast.success('Payment logged successfully', {
        description: `${formatCurrency(payAmount)} has been credited to your loan balance.`,
      });
    } catch (err) {
      toast.error('Failed to log payment');
    } finally {
      setIsLogging(false);
    }
  };

  const handleDocumentUpload = () => {
    toast.info('Document Vault Upload', {
      description: 'Document selection started... (Mock upload successful)',
    });
    
    // Inject a mock document
    const mockDoc = {
      id: `doc-mock-${Math.random().toString(36).substr(2, 9)}`,
      loanId: loan.id,
      name: 'Logged_Disbursement_Receipt.pdf',
      category: 'disbursement' as const,
      filePath: '/mock-documents/SBI_Disburse.pdf',
      fileSize: 1024 * 720,
      createdAt: new Date().toISOString().split('T')[0],
    };

    addDocument(mockDoc);
  };

  return (
    <AppShell
      title={loan.nickname}
      showBack={true}
      hideBottomNav={true}
      rightActions={
        <button
          onClick={() => navigate(`/loans/${loan.id}/edit`)}
          className="p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors duration-200 active:scale-95 text-text-primary"
          aria-label="Edit loan"
        >
          <Edit2 className="w-5 h-5" />
        </button>
      }
    >
      <div className="space-y-6">
        
        {/* Status Badge & Header */}
        <div className="flex justify-between items-center bg-card border border-border p-4 rounded-3xl shadow-sm">
          <div>
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Lending Partner</span>
            <span className="text-base font-bold text-text-primary">{loan.lender}</span>
          </div>
          <StatusBadge status={loan.status} />
        </div>

        {/* Repayment Progress Card */}
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm space-y-3">
          <div className="flex justify-between items-center text-xs">
            <span className="text-text-secondary font-medium">Repayment Progress</span>
            <span className="text-text-primary font-bold">
              {formatCurrency(loan.principal - loan.outstandingBalance)} paid of {formatCurrency(loan.principal)}
            </span>
          </div>
          <ProgressBar percentage={((loan.principal - loan.outstandingBalance) / loan.principal) * 100} />
        </div>

        {/* Tabbed view */}
        <Tabs defaultValue="summary" className="w-full">
          <TabsList className="grid grid-cols-3 rounded-2xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-6">
            <TabsTrigger value="summary" className="rounded-xl py-2">Summary</TabsTrigger>
            <TabsTrigger value="amortization" className="rounded-xl py-2">Schedule</TabsTrigger>
            <TabsTrigger value="documents" className="rounded-xl py-2">Documents</TabsTrigger>
          </TabsList>

          {/* TAB 1: SUMMARY */}
          <TabsContent value="summary" className="space-y-6 focus-visible:outline-none">
            {/* Moratorium Countdown Card */}
            {loan.moratorium?.enabled && loan.status === 'moratorium' && (
              <div className="bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-950/20 dark:to-orange-950/20 border border-amber-200/50 dark:border-amber-900/40 rounded-3xl p-5 shadow-sm space-y-4">
                <div className="flex items-center gap-2 text-amber-700 dark:text-amber-400">
                  <Clock className="w-5 h-5" />
                  <h4 className="text-sm font-bold uppercase tracking-wider">Moratorium Period Active</h4>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/70 block uppercase">Days Remaining</span>
                    <span className="text-3xl font-extrabold text-amber-800 dark:text-amber-300 font-mono leading-none">
                      {moratoriumDays}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/70 block uppercase">Accruing Interest</span>
                    <span className="text-lg font-bold text-amber-800 dark:text-amber-300 font-mono">
                      {formatCurrency(moratoriumInterest)}
                    </span>
                  </div>
                </div>
                <div className="text-[10px] text-amber-700/80 dark:text-amber-400/60 leading-relaxed border-t border-amber-200/40 dark:border-amber-900/30 pt-3">
                  This interest is accumulating daily and will be capitalized to your principal when the moratorium ends on {formatDate(loan.moratorium.endDate)}.
                </div>
              </div>
            )}

            {/* Interest Accrued Card */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
              <div>
                <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Cumulative Interest Paid/Accrued</span>
                <div className="flex justify-between items-center mt-1">
                  <span className="text-2xl font-bold font-mono text-text-primary">
                    {formatCurrency(loan.id === 'loan-sbi-123' ? 145000 : 18900)}
                  </span>
                  <span className="text-[10px] font-semibold text-text-secondary bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full capitalize">
                    {loan.interestType} Interest
                  </span>
                </div>
              </div>

              {/* Mini Area Chart */}
              <div className="h-32 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData}>
                    <defs>
                      <linearGradient id="interestGrad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366F1" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="#6366F1" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="name" stroke="#94A3B8" fontSize={10} tickLine={false} axisLine={false} />
                    <Tooltip formatter={(value) => [formatCurrency(value as number), 'Interest']} />
                    <Area type="monotone" dataKey="Interest" stroke="#6366F1" strokeWidth={2} fillOpacity={1} fill="url(#interestGrad)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Next EMI Card */}
            {loan.status !== 'completed' && (
              <div className="bg-card border border-border rounded-3xl p-5 shadow-sm flex flex-col gap-4 relative overflow-hidden">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider block">
                      {loan.status === 'moratorium' ? 'Next Accrued Pre-EMI' : 'Next Monthly EMI'}
                    </span>
                    <span className="text-3xl font-extrabold font-mono tracking-tight text-primary dark:text-indigo-400 mt-0.5 block">
                      {formatCurrency(loan.nextEmiAmount)}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Payment Due</span>
                    <span className="text-sm font-semibold text-text-primary flex items-center gap-1 mt-1 justify-end">
                      <Calendar className="w-4 h-4 text-text-secondary" />
                      {formatDate(loan.nextEmiDate)}
                    </span>
                  </div>
                </div>

                {/* Mark as Paid Bottom Sheet Trigger */}
                <Sheet open={logPaymentOpen} onOpenChange={setLogPaymentOpen}>
                  <SheetTrigger asChild>
                    <Button className="w-full py-5 rounded-2xl text-sm font-bold bg-accent hover:bg-emerald-600 text-white transition-all duration-300 shadow-md">
                      Log EMI as Paid
                    </Button>
                  </SheetTrigger>
                  <SheetContent side="bottom" className="rounded-t-3xl max-w-md mx-auto p-6 focus-visible:outline-none">
                    <SheetHeader className="mb-4">
                      <SheetTitle className="text-lg font-bold">Log Manual Payment</SheetTitle>
                      <SheetDescription className="text-xs text-text-secondary">
                        Enter the transaction details to credit the outstanding balance of your {loan.nickname}.
                      </SheetDescription>
                    </SheetHeader>
                    
                    <form onSubmit={handleLogPayment} className="space-y-4">
                      {/* Payment Date */}
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

                      {/* Payment Amount */}
                      <div className="space-y-1">
                        <Label>Amount Paid</Label>
                        <CurrencyInput
                          value={payAmount}
                          onChange={(val) => setPayAmount(val)}
                        />
                      </div>

                      {/* Payment Mode */}
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

                      {/* Notes */}
                      <div className="space-y-1">
                        <Label htmlFor="payNotes">Notes (Optional)</Label>
                        <Input
                          id="payNotes"
                          placeholder="e.g. Paid from HDFC savings account"
                          value={payNotes}
                          onChange={(e) => setPayNotes(e.target.value)}
                          className="rounded-xl h-11"
                        />
                      </div>

                      {/* Submit */}
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
              </div>
            )}

            {/* Recent Payments Section */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
              <div className="flex justify-between items-center">
                <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Recent Transactions</h4>
                {loanPayments.length > 0 && (
                  <Link
                    to={`/loans/${loan.id}/payments`}
                    className="text-xs font-semibold text-primary hover:underline flex items-center gap-0.5"
                  >
                    View All <ChevronRight className="w-4 h-4" />
                  </Link>
                )}
              </div>

              {loanPayments.length === 0 ? (
                <div className="text-center py-6 text-text-secondary text-sm leading-relaxed">
                  No payments logged yet for this loan account.
                </div>
              ) : (
                <div className="space-y-3">
                  {loanPayments.slice(0, 3).map((pay) => (
                    <div
                      key={pay.id}
                      className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800/80 last:border-b-0"
                    >
                      <div className="space-y-0.5">
                        <span className="text-xs font-bold text-text-primary font-mono">{formatCurrency(pay.amount)}</span>
                        <span className="text-[10px] text-text-secondary block">
                          {pay.paymentMode.replace('_', ' ').toUpperCase()} • {formatDate(pay.paymentDate)}
                        </span>
                      </div>
                      <span className="text-[10px] text-emerald-600 bg-emerald-50 dark:text-emerald-400 dark:bg-emerald-950/20 px-2 py-0.5 rounded-full font-semibold">
                        On-Time
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Loan Terms Detailed Summary */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider border-b border-slate-50 dark:border-slate-800/80 pb-2">Loan Parameters</h4>
              
              <div className="grid grid-cols-2 gap-y-4 gap-x-2 text-xs">
                <div>
                  <span className="text-[10px] text-text-secondary block">Sanctioned Principal</span>
                  <span className="font-semibold text-text-primary font-mono">{formatCurrency(loan.principal)}</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Interest Rate (p.a.)</span>
                  <span className="font-semibold text-text-primary font-mono">{loan.interestRate}% ({loan.interestType})</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Tenure (Months)</span>
                  <span className="font-semibold text-text-primary font-mono">{loan.tenureMonths} Months</span>
                </div>
                <div>
                  <span className="text-[10px] text-text-secondary block">Disbursement Date</span>
                  <span className="font-semibold text-text-primary">{formatDate(loan.disbursementDate)}</span>
                </div>
              </div>
            </div>
          </TabsContent>

          {/* TAB 2: AMORTIZATION */}
          <TabsContent value="amortization" className="bg-card border border-border rounded-3xl p-4 shadow-sm focus-visible:outline-none">
            <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider mb-4 px-2">Amortization Table</h4>
            <AmortizationTable
              principal={loan.principal}
              interestRate={loan.interestRate}
              tenureMonths={loan.tenureMonths}
              emiStartDate={loan.emiStartDate}
              paymentsCount={loanPayments.length}
            />
          </TabsContent>

          {/* TAB 3: DOCUMENTS */}
          <TabsContent value="documents" className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4 focus-visible:outline-none">
            <div className="flex justify-between items-center mb-1">
              <h4 className="text-sm font-bold text-text-primary uppercase tracking-wider">Vault Files ({loanDocs.length})</h4>
              <Button
                variant="outline"
                size="sm"
                onClick={handleDocumentUpload}
                className="rounded-xl text-xs flex items-center gap-1.5 h-8 border-primary/20 text-primary"
              >
                <Upload className="w-3.5 h-3.5" /> Upload File
              </Button>
            </div>

            {loanDocs.length === 0 ? (
              <div className="text-center py-8 text-text-secondary text-sm space-y-2">
                <FileText className="w-10 h-10 mx-auto text-slate-300" />
                <p>No documents uploaded for this loan yet.</p>
              </div>
            ) : (
              <div className="space-y-3">
                {loanDocs.map((doc) => (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 border border-slate-100 dark:border-slate-800"
                  >
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-xl">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div>
                        <span className="text-xs font-bold text-text-primary truncate block max-w-[180px]">
                          {doc.name}
                        </span>
                        <span className="text-[9px] text-text-secondary uppercase">
                          {doc.category.replace('_', ' ')} • {(doc.fileSize / (1024 * 1024)).toFixed(2)} MB
                        </span>
                      </div>
                    </div>
                    
                    <button
                      onClick={() => navigate(`/documents/${doc.id}/preview`)}
                      className="p-2 text-text-secondary hover:text-primary transition-colors duration-200"
                      aria-label="Preview document"
                    >
                      <ChevronRight className="w-5 h-5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </AppShell>
  );
};
