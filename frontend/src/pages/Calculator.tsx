import React, { useState, useMemo } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { AmortizationTable } from '../components/loans/AmortizationTable';
import { CurrencyInput } from '../components/shared/CurrencyInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Slider } from '@/components/ui/slider';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { calculateEMI } from '../lib/finance';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Download, ChevronDown, ChevronUp, Save } from 'lucide-react';

export const Calculator: React.FC = () => {
  const loans = useLoansStore((state) => state.loans);
  const updateLoan = useLoansStore((state) => state.updateLoan);

  // Input states
  const [principal, setPrincipal] = useState<number>(1000000); // 10 Lakhs default
  const [interestRate, setInterestRate] = useState<number>(9.5); // 9.5% default
  const [tenureValue, setTenureValue] = useState<number>(10); // 10 years default
  const [tenureUnit, setTenureUnit] = useState<'months' | 'years'>('years');
  const [showAmortization, setShowAmortization] = useState(false);
  const [saveSheetOpen, setSaveSheetOpen] = useState(false);
  const [selectedLoanId, setSelectedLoanId] = useState<string>('');

  // Convert tenure to months
  const tenureMonths = useMemo(() => {
    return tenureUnit === 'years' ? tenureValue * 12 : tenureValue;
  }, [tenureValue, tenureUnit]);

  // Calculate results in real-time
  const emi = useMemo(() => {
    return calculateEMI(principal, interestRate, tenureMonths);
  }, [principal, interestRate, tenureMonths]);

  const totalPayable = useMemo(() => {
    return emi * tenureMonths;
  }, [emi, tenureMonths]);

  const totalInterest = useMemo(() => {
    return Math.max(0, totalPayable - principal);
  }, [totalPayable, principal]);

  // Chart data
  const chartData = useMemo(() => {
    return [
      { name: 'Principal Amount', value: principal, color: '#3730A3' }, // Indigo
      { name: 'Total Interest', value: totalInterest, color: '#10B981' }, // Emerald
    ];
  }, [principal, totalInterest]);

  // Formatting helpers
  const formatCurrency = (val: number) => {
    return '₹' + val.toLocaleString('en-IN');
  };

  const handleSaveToLoan = () => {
    if (!selectedLoanId) {
      toast.error('Please select a loan profile');
      return;
    }

    const targetLoan = loans.find((l) => l.id === selectedLoanId);
    if (targetLoan) {
      const updatedLoan = {
        ...targetLoan,
        principal: principal,
        interestRate: interestRate,
        tenureMonths: tenureMonths,
        outstandingBalance: principal, // Reset balance to new principal for mock reference
        nextEmiAmount: emi,
      };

      updateLoan(updatedLoan);
      setSaveSheetOpen(false);
      toast.success('Saved to loan profile!', {
        description: `Updated ${targetLoan.nickname} with calculated parameters.`,
      });
    }
  };

  const handleExport = (format: 'csv' | 'pdf') => {
    toast.success(`Exporting as ${format.toUpperCase()}`, {
      description: 'Your amortization schedule download will start shortly.',
    });
  };

  return (
    <AppShell
      title="EMI Calculator"
      rightActions={
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => handleExport('pdf')}
            className="w-9 h-9 rounded-xl text-text-primary"
            aria-label="Export PDF"
          >
            <Download className="w-4 h-4" />
          </Button>
        </div>
      }
    >
      <div className="space-y-6">
        {/* Sliders Input Card */}
        <div className="bg-card border border-border rounded-3xl p-5 space-y-6 shadow-sm">
          {/* Principal */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold text-text-primary">Principal Loan Amount</Label>
              <span className="font-mono text-sm font-bold text-primary dark:text-indigo-400">
                {formatCurrency(principal)}
              </span>
            </div>
            <CurrencyInput
              value={principal}
              onChange={(val) => setPrincipal(val)}
            />
            <Slider
              value={[principal]}
              min={10000}
              max={5000000}
              step={10000}
              onValueChange={(val) => setPrincipal(val[0])}
              className="py-2"
            />
          </div>

          {/* Interest Rate */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold text-text-primary">Annual Interest Rate (p.a.)</Label>
              <span className="font-mono text-sm font-bold text-primary dark:text-indigo-400">
                {interestRate}%
              </span>
            </div>
            <div className="relative">
              <Input
                type="number"
                step="0.1"
                value={interestRate}
                onChange={(e) => setInterestRate(parseFloat(e.target.value) || 0)}
                className="rounded-xl py-5 pr-8 font-mono text-base"
              />
              <span className="absolute right-3 top-3 text-text-secondary select-none font-bold">%</span>
            </div>
            <Slider
              value={[interestRate]}
              min={1}
              max={25}
              step={0.1}
              onValueChange={(val) => setInterestRate(val[0])}
              className="py-2"
            />
          </div>

          {/* Tenure */}
          <div className="space-y-2">
            <div className="flex justify-between items-center">
              <Label className="font-bold text-text-primary">Loan Tenure</Label>
              <span className="font-mono text-sm font-bold text-primary dark:text-indigo-400">
                {tenureValue} {tenureUnit === 'years' ? 'Years' : 'Months'}
              </span>
            </div>
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="col-span-2">
                <Input
                  type="number"
                  value={tenureValue}
                  onChange={(e) => setTenureValue(parseInt(e.target.value, 10) || 0)}
                  className="rounded-xl py-5 font-mono text-base"
                />
              </div>
              <div>
                <Select
                  value={tenureUnit}
                  onValueChange={(val: 'months' | 'years') => setTenureUnit(val)}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="years">Years</SelectItem>
                    <SelectItem value="months">Months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Slider
              value={[tenureValue]}
              min={1}
              max={tenureUnit === 'years' ? 30 : 360}
              step={1}
              onValueChange={(val) => setTenureValue(val[0])}
              className="py-2"
            />
          </div>
        </div>

        {/* Results Summary Card */}
        {emi > 0 && (
          <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-6">
            <div className="text-center bg-slate-50 dark:bg-slate-800/40 rounded-2xl py-5 border border-slate-100 dark:border-slate-800/80">
              <span className="text-xs text-text-secondary uppercase tracking-wider block">Estimated Monthly EMI</span>
              <span className="text-3xl font-extrabold text-primary dark:text-indigo-400 font-mono tracking-tight mt-1 block">
                {formatCurrency(emi)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80">
                <span className="text-text-secondary block mb-1">Total Interest Payable</span>
                <span className="text-base font-bold font-mono text-text-primary">{formatCurrency(totalInterest)}</span>
              </div>
              <div className="bg-slate-50 dark:bg-slate-800/40 rounded-2xl p-4 border border-slate-100 dark:border-slate-800/80">
                <span className="text-text-secondary block mb-1">Total Amount Repayable</span>
                <span className="text-base font-bold font-mono text-text-primary">{formatCurrency(totalPayable)}</span>
              </div>
            </div>

            {/* Donut Chart */}
            <div className="h-44 w-full flex justify-center items-center relative">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={70}
                    paddingAngle={3}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value) => formatCurrency(value as number)} />
                  <Legend verticalAlign="bottom" height={36} iconType="circle" iconSize={8} />
                </PieChart>
              </ResponsiveContainer>
              <div className="absolute top-[43%] left-[50%] -translate-x-[50%] -translate-y-[50%] text-center">
                <span className="text-[10px] text-text-secondary block uppercase">EMI</span>
                <span className="text-sm font-bold font-mono text-text-primary">{formatCurrency(emi)}</span>
              </div>
            </div>

            {/* Action buttons */}
            <div className="grid grid-cols-2 gap-3">
              {/* Save to Loan Sheet */}
              <Sheet open={saveSheetOpen} onOpenChange={setSaveSheetOpen}>
                <SheetTrigger asChild>
                  <Button variant="outline" className="rounded-2xl py-5 border-primary/20 text-primary font-bold flex items-center justify-center gap-1.5">
                    <Save className="w-4 h-4" /> Save to Profile
                  </Button>
                </SheetTrigger>
                <SheetContent side="bottom" className="rounded-t-3xl max-w-md mx-auto p-6 focus-visible:outline-none">
                  <SheetHeader className="mb-4">
                    <SheetTitle className="text-lg font-bold">Save Parameters to Loan Profile</SheetTitle>
                    <SheetDescription className="text-xs text-text-secondary">
                      Select which active loan profile you would like to update with these parameters.
                    </SheetDescription>
                  </SheetHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label>Select Loan Profile</Label>
                      {loans.length === 0 ? (
                        <p className="text-xs text-text-secondary italic">No active loans found. Create one first.</p>
                      ) : (
                        <Select value={selectedLoanId} onValueChange={setSelectedLoanId}>
                          <SelectTrigger className="rounded-xl h-11 bg-card">
                            <SelectValue placeholder="Choose profile..." />
                          </SelectTrigger>
                          <SelectContent className="rounded-xl">
                            {loans.map((l) => (
                              <SelectItem key={l.id} value={l.id}>
                                {l.nickname} ({l.lender})
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      )}
                    </div>
                    <Button
                      onClick={handleSaveToLoan}
                      disabled={loans.length === 0}
                      className="w-full py-5 bg-primary hover:bg-primary-light text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center mt-2"
                    >
                      Confirm Update
                    </Button>
                  </div>
                </SheetContent>
              </Sheet>

              <Button
                variant="outline"
                onClick={() => handleExport('csv')}
                className="rounded-2xl py-5 border-slate-200 text-text-primary font-semibold flex items-center justify-center gap-1.5"
              >
                <Download className="w-4 h-4" /> Export CSV
              </Button>
            </div>

            {/* Simple Amortization Schedule Toggle */}
            <div className="border-t border-slate-100 dark:border-slate-800/80 pt-4">
              <button 
                onClick={() => setShowAmortization(!showAmortization)}
                className="flex items-center justify-between w-full text-xs font-semibold text-text-primary hover:underline py-1"
              >
                <span>View Full Amortization Schedule</span>
                {showAmortization ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>
              {showAmortization && (
                <div className="mt-4">
                  <AmortizationTable
                    principal={principal}
                    interestRate={interestRate}
                    tenureMonths={tenureMonths}
                    emiStartDate={new Date().toISOString().split('T')[0]}
                    paymentsCount={0}
                  />
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
};
