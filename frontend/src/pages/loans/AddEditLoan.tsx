import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { motion, AnimatePresence } from 'framer-motion';
import { Trash2, Save } from 'lucide-react';
import { AppShell } from '../../components/layout/AppShell';
import { useLoansStore } from '../../store/useLoansStore';
import { CurrencyInput } from '../../components/shared/CurrencyInput';
import { LoadingSpinner } from '../../components/shared/LoadingSpinner';
import { calculateEMI } from '../../lib/finance';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { toast } from 'sonner';

const loanFormSchema = z.object({
  nickname: z.string().min(1, 'Nickname is required'),
  lender: z.string().min(1, 'Lender/Bank name is required'),
  type: z.enum(['education', 'top-up']),
  principal: z.number().min(1000, 'Principal must be at least ₹1,000'),
  interestRate: z.number().positive('Interest rate must be positive').max(30, 'Rate cannot exceed 30%'),
  interestType: z.enum(['simple', 'compound']),
  tenureValue: z.number().positive('Tenure must be positive'),
  tenureUnit: z.enum(['months', 'years']),
  disbursementDate: z.string().min(1, 'Disbursement date is required'),
  emiStartDate: z.string().min(1, 'EMI start date is required'),
  moratoriumEnabled: z.boolean(),
  moratoriumStartDate: z.string().optional(),
  moratoriumEndDate: z.string().optional(),
  outstandingBalance: z.number().nonnegative('Outstanding balance cannot be negative'),
}).refine((data) => {
  if (data.moratoriumEnabled) {
    return !!data.moratoriumStartDate && !!data.moratoriumEndDate;
  }
  return true;
}, {
  message: "Moratorium dates are required",
  path: ["moratoriumStartDate"],
});

type LoanFormValues = z.infer<typeof loanFormSchema>;

export const AddEditLoan: React.FC = () => {
  const { id } = useParams<{ id?: string }>();
  const navigate = useNavigate();
  const isEditMode = !!id;

  const loans = useLoansStore((state) => state.loans);
  const addLoan = useLoansStore((state) => state.addLoan);
  const updateLoan = useLoansStore((state) => state.updateLoan);
  const removeLoan = useLoansStore((state) => state.removeLoan);

  const [isSaving, setIsSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<LoanFormValues>({
    resolver: zodResolver(loanFormSchema),
    defaultValues: {
      nickname: '',
      lender: '',
      type: 'education',
      principal: 0,
      interestRate: 0,
      interestType: 'compound',
      tenureValue: 0,
      tenureUnit: 'years',
      disbursementDate: '',
      emiStartDate: '',
      moratoriumEnabled: false,
      moratoriumStartDate: '',
      moratoriumEndDate: '',
      outstandingBalance: 0,
    },
  });

  // Watch fields for conditional rendering and syncing
  const moratoriumEnabled = watch('moratoriumEnabled');
  const principalValue = watch('principal');
  const typeValue = watch('type');
  const interestTypeValue = watch('interestType');
  const tenureUnitValue = watch('tenureUnit');
  const outstandingBalanceValue = watch('outstandingBalance');

  // Load existing loan data in edit mode
  useEffect(() => {
    if (isEditMode && id) {
      const loan = loans.find((l) => l.id === id);
      if (loan) {
        const isYears = loan.tenureMonths % 12 === 0;
        reset({
          nickname: loan.nickname,
          lender: loan.lender,
          type: loan.type,
          principal: loan.principal,
          interestRate: loan.interestRate,
          interestType: loan.interestType,
          tenureValue: isYears ? loan.tenureMonths / 12 : loan.tenureMonths,
          tenureUnit: isYears ? 'years' : 'months',
          disbursementDate: loan.disbursementDate,
          emiStartDate: loan.emiStartDate,
          moratoriumEnabled: !!loan.moratorium?.enabled,
          moratoriumStartDate: loan.moratorium?.startDate || '',
          moratoriumEndDate: loan.moratorium?.endDate || '',
          outstandingBalance: loan.outstandingBalance,
        });
      } else {
        toast.error('Loan not found');
        navigate('/dashboard', { replace: true });
      }
    }
  }, [id, isEditMode, loans, reset, navigate]);

  // Sync outstanding balance to principal automatically for new loans when principal changes
  useEffect(() => {
    if (!isEditMode && principalValue > 0 && outstandingBalanceValue === 0) {
      setValue('outstandingBalance', principalValue);
    }
  }, [principalValue, setValue, isEditMode, outstandingBalanceValue]);

  const onSubmit = async (data: LoanFormValues) => {
    setIsSaving(true);
    try {
      // Calculate tenure in months
      const tenureMonths = data.tenureUnit === 'years' ? data.tenureValue * 12 : data.tenureValue;

      // Determine loan status
      let status: 'moratorium' | 'repaying' | 'completed' = 'repaying';
      const now = new Date().getTime();
      
      if (data.moratoriumEnabled && data.moratoriumStartDate && data.moratoriumEndDate) {
        const start = new Date(data.moratoriumStartDate).getTime();
        const end = new Date(data.moratoriumEndDate).getTime();
        if (now >= start && now <= end) {
          status = 'moratorium';
        }
      }
      if (data.outstandingBalance === 0) {
        status = 'completed';
      }

      // Calculate EMI
      const emi = calculateEMI(data.principal, data.interestRate, tenureMonths);

      const loanPayload = {
        id: isEditMode && id ? id : `loan-${Math.random().toString(36).substr(2, 9)}`,
        nickname: data.nickname,
        lender: data.lender,
        type: data.type,
        principal: data.principal,
        disbursedAmount: data.principal, // Assume fully disbursed for now
        outstandingBalance: data.outstandingBalance,
        interestRate: data.interestRate,
        interestType: data.interestType,
        tenureMonths,
        disbursementDate: data.disbursementDate,
        emiStartDate: data.emiStartDate,
        moratorium: data.moratoriumEnabled
          ? {
              enabled: true,
              startDate: data.moratoriumStartDate || '',
              endDate: data.moratoriumEndDate || '',
            }
          : null,
        status,
        nextEmiDate: data.emiStartDate,
        nextEmiAmount: status === 'moratorium' ? Math.round((data.outstandingBalance * data.interestRate / 100) / 12) : emi,
      };

      // Mock delay
      await new Promise((resolve) => setTimeout(resolve, 1000));

      if (isEditMode) {
        updateLoan(loanPayload);
        toast.success('Loan updated successfully');
        navigate(`/loans/${id}`);
      } else {
        addLoan(loanPayload);
        toast.success('Loan added successfully');
        navigate('/dashboard');
      }
    } catch (err) {
      toast.error('Failed to save loan details');
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!id) return;
    try {
      removeLoan(id);
      toast.success('Loan deleted successfully');
      navigate('/dashboard', { replace: true });
    } catch (err) {
      toast.error('Failed to delete loan');
    }
  };

  return (
    <AppShell
      title={isEditMode ? 'Edit Loan' : 'Add Loan'}
      showBack={true}
      hideBottomNav={true}
    >
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pb-24">
        {/* Basic Fields Card */}
        <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Basic Loan Details</h3>

          {/* Nickname */}
          <div className="space-y-1">
            <Label htmlFor="nickname">Loan Nickname</Label>
            <Input
              id="nickname"
              placeholder="e.g. My SBI Student Loan"
              className="rounded-xl py-5"
              {...register('nickname')}
            />
            {errors.nickname && <p className="text-xs text-error">{errors.nickname.message}</p>}
          </div>

          {/* Lender */}
          <div className="space-y-1">
            <Label htmlFor="lender">Lender / Bank Name</Label>
            <Input
              id="lender"
              placeholder="e.g. State Bank of India"
              className="rounded-xl py-5"
              {...register('lender')}
            />
            {errors.lender && <p className="text-xs text-error">{errors.lender.message}</p>}
          </div>

          {/* Grid for Type & Interest Type */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label>Loan Type</Label>
              <Select
                value={typeValue}
                onValueChange={(val: 'education' | 'top-up') => setValue('type', val)}
              >
                <SelectTrigger className="rounded-xl h-11 bg-card">
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="education">Education</SelectItem>
                  <SelectItem value="top-up">Top-Up</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1">
              <Label>Interest Schema</Label>
              <Select
                value={interestTypeValue}
                onValueChange={(val: 'simple' | 'compound') => setValue('interestType', val)}
              >
                <SelectTrigger className="rounded-xl h-11 bg-card">
                  <SelectValue placeholder="Select schema" />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="compound">Compound</SelectItem>
                  <SelectItem value="simple">Simple</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </div>

        {/* Financial details card */}
        <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Financial Terms</h3>

          {/* Principal */}
          <div className="space-y-1">
            <Label>Sanctioned Principal Amount</Label>
            <CurrencyInput
              value={watch('principal')}
              onChange={(val) => setValue('principal', val)}
            />
            {errors.principal && <p className="text-xs text-error">{errors.principal.message}</p>}
          </div>

          {/* Interest Rate */}
          <div className="space-y-1">
            <Label htmlFor="interestRate">Annual Interest Rate (p.a. %)</Label>
            <div className="relative">
              <Input
                id="interestRate"
                type="number"
                step="0.01"
                placeholder="e.g. 9.55"
                className="rounded-xl py-5 pr-8 font-mono"
                {...register('interestRate', { valueAsNumber: true })}
              />
              <span className="absolute right-3 top-3 text-text-secondary select-none font-semibold text-sm">%</span>
            </div>
            {errors.interestRate && <p className="text-xs text-error">{errors.interestRate.message}</p>}
          </div>

          {/* Tenure grid */}
          <div className="grid grid-cols-3 gap-4 items-end">
            <div className="col-span-2 space-y-1">
              <Label htmlFor="tenureValue">Loan Tenure</Label>
              <Input
                id="tenureValue"
                type="number"
                placeholder="e.g. 10"
                className="rounded-xl py-5 font-mono"
                {...register('tenureValue', { valueAsNumber: true })}
              />
            </div>
            <div>
              <Select
                value={tenureUnitValue}
                onValueChange={(val: 'months' | 'years') => setValue('tenureUnit', val)}
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
          {errors.tenureValue && <p className="text-xs text-error">{errors.tenureValue.message}</p>}

          {/* Current Outstanding Balance */}
          <div className="space-y-1">
            <Label>Current Outstanding Balance</Label>
            <CurrencyInput
              value={watch('outstandingBalance')}
              onChange={(val) => setValue('outstandingBalance', val)}
            />
            {errors.outstandingBalance && <p className="text-xs text-error">{errors.outstandingBalance.message}</p>}
          </div>
        </div>

        {/* Milestone Dates Card */}
        <div className="bg-card border border-border rounded-3xl p-5 space-y-4 shadow-sm">
          <h3 className="text-sm font-bold text-text-primary uppercase tracking-wider">Milestones & Moratorium</h3>

          {/* Disbursement Date */}
          <div className="space-y-1">
            <Label htmlFor="disbursementDate">Disbursement Date</Label>
            <Input
              id="disbursementDate"
              type="date"
              className="rounded-xl h-11 font-mono"
              {...register('disbursementDate')}
            />
            {errors.disbursementDate && <p className="text-xs text-error">{errors.disbursementDate.message}</p>}
          </div>

          {/* EMI Start Date */}
          <div className="space-y-1">
            <Label htmlFor="emiStartDate">EMI Repayment Start Date</Label>
            <Input
              id="emiStartDate"
              type="date"
              className="rounded-xl h-11 font-mono"
              {...register('emiStartDate')}
            />
            {errors.emiStartDate && <p className="text-xs text-error">{errors.emiStartDate.message}</p>}
          </div>

          {/* Moratorium Switch */}
          <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
            <div className="space-y-0.5">
              <Label className="text-sm font-semibold text-text-primary">Moratorium Period</Label>
              <p className="text-xs text-text-secondary">Has a pre-EMI study/grace period?</p>
            </div>
            <Switch
              checked={moratoriumEnabled}
              onCheckedChange={(checked) => setValue('moratoriumEnabled', checked)}
            />
          </div>

          {/* Moratorium Dates (Conditional with Framer Motion) */}
          <AnimatePresence>
            {moratoriumEnabled && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.3 }}
                className="overflow-hidden space-y-4 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2"
              >
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <Label htmlFor="moratoriumStartDate">Moratorium Start</Label>
                    <Input
                      id="moratoriumStartDate"
                      type="date"
                      className="rounded-xl h-11 font-mono"
                      {...register('moratoriumStartDate')}
                    />
                  </div>
                  <div className="space-y-1">
                    <Label htmlFor="moratoriumEndDate">Moratorium End</Label>
                    <Input
                      id="moratoriumEndDate"
                      type="date"
                      className="rounded-xl h-11 font-mono"
                      {...register('moratoriumEndDate')}
                    />
                  </div>
                </div>
                {errors.moratoriumStartDate && (
                  <p className="text-xs text-error">{errors.moratoriumStartDate.message}</p>
                )}
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Form Action Controls */}
        <div className="space-y-3">
          <Button
            type="submit"
            disabled={isSaving}
            className="w-full py-6 rounded-2xl text-base font-semibold bg-primary hover:bg-primary-light text-white transition-all duration-300 shadow-md flex items-center justify-center gap-2"
          >
            {isSaving ? (
              <>
                <LoadingSpinner size="xs" /> Saving Loan Details...
              </>
            ) : (
              <>
                <Save className="w-5 h-5" /> Save Loan
              </>
            )}
          </Button>

          {isEditMode && (
            <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
              <DialogTrigger asChild>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full py-6 rounded-2xl border-error text-error hover:bg-red-50 dark:hover:bg-red-950/20 font-semibold flex items-center justify-center gap-2"
                >
                  <Trash2 className="w-5 h-5" /> Delete Loan
                </Button>
              </DialogTrigger>
              <DialogContent className="rounded-3xl max-w-sm">
                <DialogHeader>
                  <DialogTitle className="text-lg font-bold">Delete Loan Account?</DialogTitle>
                  <DialogDescription className="text-sm text-text-secondary leading-relaxed">
                    Are you sure you want to delete this loan account? All payment histories and amortization schedule data will be permanently wiped. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter className="grid grid-cols-2 gap-2 mt-4">
                  <Button
                    type="button"
                    variant="outline"
                    className="rounded-xl"
                    onClick={() => setShowDeleteConfirm(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    type="button"
                    variant="destructive"
                    className="rounded-xl bg-error hover:bg-red-600 text-white"
                    onClick={handleDelete}
                  >
                    Confirm Delete
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </form>
    </AppShell>
  );
};
