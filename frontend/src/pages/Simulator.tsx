import React, { useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { toast } from 'sonner';
import { calculateEMI, calculatePayoffSimulation } from '../lib/finance';
import type { PayoffSimulationResult } from '../lib/finance';
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid } from 'recharts';
import { motion, AnimatePresence } from 'framer-motion';
import { Save, Trophy } from 'lucide-react';
import { addMonths, format } from 'date-fns';
import { CurrencyInput } from '../components/shared/CurrencyInput';
import { LoadingSpinner } from '../components/shared/LoadingSpinner';

export const Simulator: React.FC = () => {
  const navigate = useNavigate();
  const loans = useLoansStore((state) => state.loans);
  const updateLoan = useLoansStore((state) => state.updateLoan);

  // Selected Loan
  const repayingLoans = useMemo(() => loans.filter((l) => l.status === 'repaying'), [loans]);
  const [selectedLoanId, setSelectedLoanId] = useState<string>(
    repayingLoans.length > 0 ? repayingLoans[0].id : ''
  );

  const selectedLoan = useMemo(() => {
    return loans.find((l) => l.id === selectedLoanId);
  }, [loans, selectedLoanId]);

  // Input states
  const [mode, setMode] = useState<'extra' | 'lump'>('extra');
  const [extraPayment, setExtraPayment] = useState<number>(3000); // 3k default extra
  const [lumpSumAmount, setLumpSumAmount] = useState<number>(50000); // 50k default lump sum
  const [lumpSumMonthsAhead, setLumpSumMonthsAhead] = useState<number>(6); // 6 months ahead default
  const [simResult, setSimResult] = useState<PayoffSimulationResult | null>(null);
  const [isSimulating, setIsSimulating] = useState(false);

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      month: 'short',
      year: 'numeric',
    });
  };

  const handleSimulate = async () => {
    if (!selectedLoan) {
      toast.error('Please select a loan profile');
      return;
    }

    setIsSimulating(true);
    try {
      await new Promise((resolve) => setTimeout(resolve, 800));

      const result = calculatePayoffSimulation(
        selectedLoan.outstandingBalance,
        selectedLoan.interestRate,
        selectedLoan.tenureMonths, // Remaining tenure placeholder
        selectedLoan.nextEmiDate,
        mode === 'extra' ? extraPayment : 0,
        mode === 'lump' ? lumpSumAmount : 0,
        mode === 'lump' ? lumpSumMonthsAhead : 0
      );

      setSimResult(result);
      toast.success('Simulation computed successfully!');
    } catch (err) {
      toast.error('Simulation calculation failed');
    } finally {
      setIsSimulating(false);
    }
  };

  // Compile visual comparison chart data
  const chartData = useMemo(() => {
    if (!selectedLoan || !simResult) return [];

    const data = [];
    const monthlyRate = selectedLoan.interestRate / 12 / 100;
    const regularEmi = calculateEMI(selectedLoan.outstandingBalance, selectedLoan.interestRate, selectedLoan.tenureMonths);
    const startDate = new Date(selectedLoan.nextEmiDate);

    // 1. original balance trajectory
    // 2. simulated balance trajectory

    const limit = Math.max(12, selectedLoan.tenureMonths);
    const step = Math.max(1, Math.round(limit / 10)); // sample 10 points

    for (let m = 0; m <= limit; m += step) {
      const label = format(addMonths(startDate, m), 'MMM yy');
      
      // Calculate original balance at month m
      let orgBalance = selectedLoan.outstandingBalance;
      for (let i = 1; i <= m; i++) {
        const interest = orgBalance * monthlyRate;
        let emi = regularEmi;
        if (orgBalance + interest < emi) emi = orgBalance + interest;
        orgBalance = Math.max(0, orgBalance + interest - emi);
      }

      // Calculate simulated balance at month m
      let simBalance = selectedLoan.outstandingBalance;
      for (let i = 1; i <= m; i++) {
        const interest = simBalance * monthlyRate;
        let emi = regularEmi;
        if (simBalance + interest < emi) emi = simBalance + interest;
        
        let extra = mode === 'extra' ? extraPayment : 0;
        if (mode === 'lump' && i === lumpSumMonthsAhead) extra += lumpSumAmount;

        simBalance = Math.max(0, simBalance + interest - emi - extra);
      }

      data.push({
        name: label,
        'Original Balance': Math.round(orgBalance),
        'Simulated Balance': Math.round(simBalance),
      });

      if (orgBalance === 0 && simBalance === 0) break;
    }

    return data;
  }, [selectedLoan, simResult, extraPayment, lumpSumAmount, lumpSumMonthsAhead, mode]);

  const handleApplyToPlan = () => {
    if (!selectedLoan || !simResult) return;

    // Apply simulation details to loan notes as active plan
    const updatedLoan = {
      ...selectedLoan,
      notes: `${selectedLoan.notes || ''}\n\n[Active Payoff Plan]: Accelerated with ${
        mode === 'extra'
          ? `${formatCurrency(extraPayment)}/month extra EMI`
          : `${formatCurrency(lumpSumAmount)} lump-sum prepayment`
      }. Projected payoff date shortened to ${formatDate(simResult.simulatedPayoffDate)} (saves ${formatCurrency(simResult.interestSaved)}).`,
    };

    updateLoan(updatedLoan);
    toast.success('Simulation applied to loan profile!', {
      description: 'The schedule details have been updated in your profile notes.',
    });
    navigate(`/loans/${selectedLoan.id}`);
  };

  return (
    <AppShell title="Payoff Simulator">
      <div className="space-y-6">
        
        {/* Selector Card */}
        <div className="bg-card border border-border rounded-3xl p-4 shadow-sm flex flex-col gap-2">
          <Label className="text-text-secondary text-xs uppercase block">Select Loan profile</Label>
          {repayingLoans.length === 0 ? (
            <p className="text-xs text-text-secondary italic">No active repaying loans found.</p>
          ) : (
            <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
              <SelectTrigger className="rounded-xl h-11 bg-card">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-xl">
                {repayingLoans.map((l) => (
                  <SelectItem key={l.id} value={l.id}>
                    {l.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>

        {selectedLoan && (
          <>
            {/* Parameters Strip */}
            <div className="bg-card border border-border rounded-3xl p-4 shadow-sm grid grid-cols-4 gap-2 text-center divide-x divide-slate-100 dark:divide-slate-800">
              <div>
                <span className="text-[9px] text-text-secondary block uppercase">Outstanding</span>
                <span className="text-xs font-bold font-mono text-text-primary">
                  {formatCurrency(selectedLoan.outstandingBalance)}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-text-secondary block uppercase">Rate (p.a.)</span>
                <span className="text-xs font-bold font-mono text-text-primary">
                  {selectedLoan.interestRate}%
                </span>
              </div>
              <div>
                <span className="text-[9px] text-text-secondary block uppercase">EMI</span>
                <span className="text-xs font-bold font-mono text-text-primary">
                  {formatCurrency(selectedLoan.nextEmiAmount)}
                </span>
              </div>
              <div>
                <span className="text-[9px] text-text-secondary block uppercase">Months Left</span>
                <span className="text-xs font-bold font-mono text-text-primary">
                  {selectedLoan.tenureMonths}
                </span>
              </div>
            </div>

            {/* Inputs Tabs */}
            <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
              <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Acceleration Input</h3>

              <Tabs defaultValue="extra" onValueChange={(val) => setMode(val as any)} className="w-full">
                <TabsList className="grid grid-cols-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 p-1 mb-4">
                  <TabsTrigger value="extra" className="rounded-lg text-xs py-1.5">Extra Monthly</TabsTrigger>
                  <TabsTrigger value="lump" className="rounded-lg text-xs py-1.5">Lump-Sum Prepay</TabsTrigger>
                </TabsList>

                {/* Extra Monthly */}
                <TabsContent value="extra" className="space-y-4 focus-visible:outline-none">
                  <div className="space-y-2">
                    <div className="flex justify-between items-center text-xs">
                      <Label className="text-text-primary font-semibold">Additional Payment per Month</Label>
                      <span className="font-mono font-bold text-primary dark:text-indigo-400">
                        {formatCurrency(extraPayment)}/mo
                      </span>
                    </div>
                    <CurrencyInput
                      value={extraPayment}
                      onChange={(val: number) => setExtraPayment(val)}
                    />
                    <Slider
                      value={[extraPayment]}
                      min={500}
                      max={50000}
                      step={500}
                      onValueChange={(val) => setExtraPayment(val[0])}
                      className="py-2"
                    />
                  </div>
                </TabsContent>

                {/* Lump Sum */}
                <TabsContent value="lump" className="space-y-4 focus-visible:outline-none">
                  <div className="space-y-3">
                    {/* Amount */}
                    <div className="space-y-1">
                      <Label className="text-xs font-semibold text-text-primary">Prepayment Amount</Label>
                      <CurrencyInput
                        value={lumpSumAmount}
                        onChange={(val: number) => setLumpSumAmount(val)}
                      />
                    </div>
                    
                    {/* Time Offset */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <Label className="text-text-primary font-semibold">Prepay Timing (months ahead)</Label>
                        <span className="font-mono font-bold text-primary dark:text-indigo-400">
                          In {lumpSumMonthsAhead} Months
                        </span>
                      </div>
                      <Slider
                        value={[lumpSumMonthsAhead]}
                        min={1}
                        max={selectedLoan.tenureMonths}
                        step={1}
                        onValueChange={(val) => setLumpSumMonthsAhead(val[0])}
                        className="py-3"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              <Button
                onClick={handleSimulate}
                disabled={isSimulating}
                className="w-full py-5 bg-primary hover:bg-primary-light text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center gap-2 mt-2"
              >
                {isSimulating ? <LoadingSpinner size="xs" /> : <>Simulate Repayment Freedom</>}
              </Button>
            </div>

            {/* Results Animation Area */}
            <AnimatePresence>
              {simResult && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.4 }}
                  className="space-y-6 overflow-hidden"
                >
                  {/* Trophy Highlight Banner */}
                  <div className="bg-gradient-to-br from-emerald-500 to-teal-600 text-white rounded-3xl p-5 shadow-lg flex items-center gap-4 relative">
                    <div className="p-3 bg-white/20 rounded-2xl">
                      <Trophy className="w-8 h-8 text-yellow-300 fill-yellow-300" />
                    </div>
                    <div>
                      <h4 className="text-base font-bold">Repayment Acceleration Saved!</h4>
                      <p className="text-xs text-emerald-100 leading-relaxed mt-0.5">
                        You save <strong className="text-white font-mono text-sm">{formatCurrency(simResult.interestSaved)}</strong> in interest and pay off your loan <strong className="text-white font-mono text-sm">{simResult.monthsSaved} months</strong> earlier!
                      </p>
                    </div>
                  </div>

                  {/* Side by side comparison */}
                  <div className="grid grid-cols-2 gap-4">
                    {/* Original card */}
                    <div className="bg-card border border-border rounded-3xl p-4 shadow-sm space-y-3">
                      <span className="text-[10px] text-text-secondary block uppercase font-bold">Original Plan</span>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[9px] text-text-secondary block">Payoff Date</span>
                          <span className="font-bold text-text-primary">{formatDate(simResult.originalPayoffDate)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-secondary block">Total Interest</span>
                          <span className="font-bold text-text-primary font-mono">{formatCurrency(simResult.originalTotalInterest)}</span>
                        </div>
                      </div>
                    </div>

                    {/* Accelerated card */}
                    <div className="bg-card border border-emerald-300 dark:border-emerald-900 rounded-3xl p-4 shadow-sm space-y-3 bg-emerald-500/5">
                      <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block uppercase font-bold">Accelerated Plan</span>
                      <div className="space-y-2 text-xs">
                        <div>
                          <span className="text-[9px] text-text-secondary block">Payoff Date</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400">{formatDate(simResult.simulatedPayoffDate)}</span>
                        </div>
                        <div>
                          <span className="text-[9px] text-text-secondary block">Total Interest</span>
                          <span className="font-bold text-emerald-600 dark:text-emerald-400 font-mono">{formatCurrency(simResult.simulatedTotalInterest)}</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Line Comparison Chart */}
                  {chartData.length > 0 && (
                    <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
                      <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Outstanding Balance Trajectory</h3>
                      <div className="h-44 w-full">
                        <ResponsiveContainer width="100%" height="100%">
                          <LineChart data={chartData}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
                            <XAxis dataKey="name" stroke="#94A3B8" fontSize={9} tickLine={false} />
                            <YAxis stroke="#94A3B8" fontSize={9} tickLine={false} axisLine={false} tickFormatter={(val) => `₹${val}`} />
                            <Tooltip formatter={(value) => formatCurrency(value as number)} />
                            <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                            <Line type="monotone" dataKey="Original Balance" stroke="#3730A3" strokeWidth={2.5} dot={false} />
                            <Line type="monotone" dataKey="Simulated Balance" stroke="#10B981" strokeWidth={3} dot={false} />
                          </LineChart>
                        </ResponsiveContainer>
                      </div>
                    </div>
                  )}

                  {/* Apply to loan button */}
                  <Button
                    onClick={handleApplyToPlan}
                    className="w-full py-6 rounded-2xl text-base font-bold bg-accent hover:bg-emerald-600 text-white shadow-md flex items-center justify-center gap-1.5"
                  >
                    <Save className="w-5 h-5" /> Apply simulation notes to profile
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </>
        )}
      </div>
    </AppShell>
  );
};
