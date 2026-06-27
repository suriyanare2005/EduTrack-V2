import { addMonths, format } from 'date-fns';

export interface AmortizationRow {
  month: number;
  date: string;
  emi: number;
  principalComponent: number;
  interestComponent: number;
  balance: number;
}

/**
 * Calculates monthly EMI based on standard amortization formula:
 * EMI = P * r * (1 + r)^n / ((1 + r)^n - 1)
 */
export const calculateEMI = (principal: number, annualRate: number, tenureMonths: number): number => {
  if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) return 0;
  
  const r = annualRate / 12 / 100; // monthly rate
  const n = tenureMonths;
  
  const emi = principal * r * Math.pow(1 + r, n) / (Math.pow(1 + r, n) - 1);
  return Math.round(emi);
};

/**
 * Generates month-by-month amortization schedule
 */
export const generateAmortizationSchedule = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDateStr: string
): AmortizationRow[] => {
  const schedule: AmortizationRow[] = [];
  if (principal <= 0 || annualRate <= 0 || tenureMonths <= 0) return schedule;

  const emi = calculateEMI(principal, annualRate, tenureMonths);
  const monthlyRate = annualRate / 12 / 100;
  let balance = principal;
  let startDate = new Date(startDateStr);

  for (let i = 1; i <= tenureMonths; i++) {
    const interestComponent = Math.round(balance * monthlyRate);
    let principalComponent = emi - interestComponent;

    // Handle last month rounding issues
    if (i === tenureMonths || balance < principalComponent) {
      principalComponent = balance;
    }

    balance -= principalComponent;
    if (balance < 0) balance = 0;

    const rowDate = addMonths(startDate, i - 1);

    schedule.push({
      month: i,
      date: format(rowDate, 'yyyy-MM-dd'),
      emi: Math.round(principalComponent + interestComponent),
      principalComponent: Math.round(principalComponent),
      interestComponent: Math.round(interestComponent),
      balance: Math.round(balance),
    });

    if (balance === 0) break;
  }

  return schedule;
};

/**
 * Calculates simple interest accrued daily during moratorium period
 */
export const calculateMoratoriumInterest = (
  principal: number,
  annualRate: number,
  startDateStr: string,
  endDateStr: string
): number => {
  if (principal <= 0 || annualRate <= 0) return 0;
  
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  
  const diffTime = Math.abs(end.getTime() - start.getTime());
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
  
  if (diffDays <= 0) return 0;

  // Simple Interest: P * R * T / 100 where T is in years (days / 365)
  const interest = (principal * annualRate * (diffDays / 365.25)) / 100;
  return Math.round(interest);
};

export interface PayoffSimulationResult {
  originalPayoffDate: string;
  originalTotalInterest: number;
  originalTotalPayable: number;
  simulatedPayoffDate: string;
  simulatedTotalInterest: number;
  simulatedTotalPayable: number;
  monthsSaved: number;
  interestSaved: number;
}

/**
 * Simulates repayment acceleration with extra monthly payments
 */
export const calculatePayoffSimulation = (
  principal: number,
  annualRate: number,
  tenureMonths: number,
  startDateStr: string,
  extraMonthlyPayment: number,
  lumpSumAmount: number = 0,
  lumpSumMonthIndex: number = 0
): PayoffSimulationResult => {
  const monthlyRate = annualRate / 12 / 100;
  const regularEmi = calculateEMI(principal, annualRate, tenureMonths);
  const startDate = new Date(startDateStr);
  
  // 1. Calculate original trajectory
  const originalSchedule = generateAmortizationSchedule(principal, annualRate, tenureMonths, startDateStr);
  const originalTotalInterest = originalSchedule.reduce((acc, row) => acc + row.interestComponent, 0);
  const originalPayoffDate = originalSchedule.length > 0 
    ? originalSchedule[originalSchedule.length - 1].date 
    : format(startDate, 'yyyy-MM-dd');

  // 2. Calculate accelerated trajectory
  let balance = principal;
  let simulatedInterest = 0;
  let month = 0;
  const maxMonths = 360; // 30 years safety limit

  while (balance > 0 && month < maxMonths) {
    month++;
    
    // Add interest for the month
    const interest = balance * monthlyRate;
    simulatedInterest += interest;
    
    // Total standard payment
    let standardEmi = regularEmi;
    if (balance + interest < standardEmi) {
      standardEmi = balance + interest;
    }
    
    // Principal payment from regular EMI
    const regularPrincipalPaid = standardEmi - interest;
    balance -= regularPrincipalPaid;
    
    // Apply prepayment if any
    let extraPaid = extraMonthlyPayment;
    if (month === lumpSumMonthIndex) {
      extraPaid += lumpSumAmount;
    }
    
    if (extraPaid > 0 && balance > 0) {
      if (balance < extraPaid) {
        extraPaid = balance;
      }
      balance -= extraPaid;
    }
    
    if (balance < 0) balance = 0;
  }

  const monthsSaved = Math.max(0, originalSchedule.length - month);
  const interestSaved = Math.max(0, originalTotalInterest - Math.round(simulatedInterest));
  const simulatedPayoffDate = format(addMonths(startDate, month - 1), 'yyyy-MM-dd');

  return {
    originalPayoffDate,
    originalTotalInterest,
    originalTotalPayable: principal + originalTotalInterest,
    simulatedPayoffDate,
    simulatedTotalInterest: Math.round(simulatedInterest),
    simulatedTotalPayable: principal + Math.round(simulatedInterest),
    monthsSaved,
    interestSaved,
  };
};
