export interface MoratoriumDetails {
  enabled: boolean;
  startDate: string;
  endDate: string;
}

export type LoanStatus = 'moratorium' | 'repaying' | 'completed' | 'overdue';

export interface Loan {
  id: string;
  nickname: string;
  lender: string;
  type: 'education' | 'top-up';
  principal: number;
  disbursedAmount: number;
  outstandingBalance: number;
  interestRate: number;
  interestType: 'simple' | 'compound';
  tenureMonths: number;
  disbursementDate: string;
  emiStartDate: string;
  moratorium: MoratoriumDetails | null;
  status: LoanStatus;
  nextEmiDate: string;
  nextEmiAmount: number;
  notes?: string;
}

export interface Payment {
  id: string;
  loanId: string;
  paymentDate: string;
  amount: number;
  principalComponent: number;
  interestComponent: number;
  paymentMode: 'bank_transfer' | 'upi' | 'cheque' | 'auto_debit';
  notes?: string;
}

export interface Reminder {
  id: string;
  loanId: string;
  label: string;
  dueDate: string;
  daysBefore: number; // 1, 3, 5, 7
  recurrence: 'one_time' | 'monthly';
  channelInApp: boolean;
  channelPush: boolean;
  isActive: boolean;
}

export interface NotificationItem {
  id: string;
  type: 'reminder' | 'system' | 'moratorium';
  title: string;
  body: string;
  isRead: boolean;
  createdAt: string;
}

export interface DocumentItem {
  id: string;
  loanId: string;
  name: string;
  category: 'sanction_letter' | 'disbursement' | 'noc' | 'itr' | 'other';
  filePath: string;
  fileSize: number;
  expiryDate?: string;
  createdAt: string;
}

export interface SimulationResult {
  originalPayoffDate: string;
  originalTotalInterest: number;
  originalTotalPayable: number;
  simulatedPayoffDate: string;
  simulatedTotalInterest: number;
  simulatedTotalPayable: number;
  monthsSaved: number;
  interestSaved: number;
}
