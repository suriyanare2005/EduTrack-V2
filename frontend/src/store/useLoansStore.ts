import { create } from 'zustand';
import type { Loan, Payment, Reminder, DocumentItem, NotificationItem } from '../types';
import { apiRequest } from '../lib/api';

interface LoansState {
  loans: Loan[];
  payments: Payment[];
  reminders: Reminder[];
  documents: DocumentItem[];
  notifications: NotificationItem[];
  loading: boolean;
  
  // Action triggers
  setLoans: (loans: Loan[]) => void;
  addLoan: (loan: Omit<Loan, 'id' | 'status' | 'nextEmiDate' | 'nextEmiAmount'>) => Promise<Loan>;
  updateLoan: (loan: Loan) => Promise<void>;
  removeLoan: (id: string) => Promise<void>;
  
  setPayments: (payments: Payment[]) => void;
  addPayment: (payment: Omit<Payment, 'id'>) => Promise<Payment>;
  
  setReminders: (reminders: Reminder[]) => void;
  addReminder: (reminder: Omit<Reminder, 'id' | 'isActive'>) => Promise<Reminder>;
  updateReminder: (reminder: Reminder) => Promise<void>;
  removeReminder: (id: string) => Promise<void>;
  
  setDocuments: (documents: DocumentItem[]) => void;
  addDocument: (documentOrFormData: DocumentItem | FormData) => Promise<DocumentItem>;
  removeDocument: (id: string) => Promise<void>;

  setNotifications: (notifications: NotificationItem[]) => void;
  markNotificationRead: (id: string) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  removeNotification: (id: string) => Promise<void>;

  // Async Fetchers
  fetchLoans: () => Promise<void>;
  fetchPayments: (loanId?: string) => Promise<void>;
  fetchReminders: () => Promise<void>;
  fetchNotifications: () => Promise<void>;
  fetchDocuments: () => Promise<void>;
  syncWithBackend: () => Promise<void>;
}

// Helper to get formatted dates relative to current date for mock consistency
const getPastDate = (monthsAgo: number, day: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() - monthsAgo);
  d.setDate(day);
  return d.toISOString().split('T')[0];
};

const getFutureDate = (monthsAhead: number, day: number): string => {
  const d = new Date();
  d.setMonth(d.getMonth() + monthsAhead);
  d.setDate(day);
  return d.toISOString().split('T')[0];
};

const initialLoans: Loan[] = [
  {
    id: 'loan-sbi-123',
    nickname: 'SBI Premier Loan',
    lender: 'State Bank of India',
    type: 'education',
    principal: 1500000,
    disbursedAmount: 1500000,
    outstandingBalance: 1245000,
    interestRate: 9.55,
    interestType: 'compound',
    tenureMonths: 120,
    disbursementDate: '2023-07-15',
    emiStartDate: '2024-08-10',
    moratorium: {
      enabled: true,
      startDate: '2023-07-15',
      endDate: '2024-07-15',
    },
    status: 'repaying',
    nextEmiDate: getFutureDate(0, 10),
    nextEmiAmount: 19450,
    notes: 'Primary loan for B.Tech CSE tuition and living fees.',
  },
  {
    id: 'loan-hdfc-456',
    nickname: 'HDFC Study Abroad',
    lender: 'HDFC Bank',
    type: 'education',
    principal: 800000,
    disbursedAmount: 400000,
    outstandingBalance: 400000,
    interestRate: 11.2,
    interestType: 'simple',
    tenureMonths: 84,
    disbursementDate: '2026-01-10',
    emiStartDate: '2027-02-10',
    moratorium: {
      enabled: true,
      startDate: '2026-01-10',
      endDate: '2027-01-10',
    },
    status: 'moratorium',
    nextEmiDate: getFutureDate(0, 10),
    nextEmiAmount: 3733,
    notes: 'Top-up loan for hostel fees and laptop expense.',
  },
];

const initialPayments: Payment[] = [
  {
    id: 'pay-sbi-1',
    loanId: 'loan-sbi-123',
    paymentDate: getPastDate(1, 10),
    amount: 19450,
    principalComponent: 9550,
    interestComponent: 9900,
    paymentMode: 'auto_debit',
    notes: 'Auto-debit clearing'
  },
  {
    id: 'pay-sbi-2',
    loanId: 'loan-sbi-123',
    paymentDate: getPastDate(2, 10),
    amount: 19450,
    principalComponent: 9470,
    interestComponent: 9980,
    paymentMode: 'auto_debit',
  },
  {
    id: 'pay-sbi-3',
    loanId: 'loan-sbi-123',
    paymentDate: getPastDate(3, 10),
    amount: 19450,
    principalComponent: 9390,
    interestComponent: 10060,
    paymentMode: 'upi',
    notes: 'Paid manually via GPay'
  },
];

const initialReminders: Reminder[] = [
  {
    id: 'rem-sbi',
    loanId: 'loan-sbi-123',
    label: 'SBI Loan EMI Payment',
    dueDate: getFutureDate(0, 10),
    daysBefore: 3,
    recurrence: 'monthly',
    channelInApp: true,
    channelPush: true,
    isActive: true,
  },
  {
    id: 'rem-hdfc',
    loanId: 'loan-hdfc-456',
    label: 'HDFC Moratorium Pre-EMI',
    dueDate: getFutureDate(0, 10),
    daysBefore: 1,
    recurrence: 'monthly',
    channelInApp: true,
    channelPush: false,
    isActive: true,
  },
];

const initialDocuments: DocumentItem[] = [
  {
    id: 'doc-sbi-sanction',
    loanId: 'loan-sbi-123',
    name: 'SBI_Loan_Sanction_Letter.pdf',
    category: 'sanction_letter',
    filePath: '/mock-documents/SBI_Sanction.pdf',
    fileSize: 1024 * 1024 * 2.4,
    createdAt: getPastDate(12, 15),
  },
  {
    id: 'doc-sbi-disburse',
    loanId: 'loan-sbi-123',
    name: 'SBI_Disbursement_Receipt_1.pdf',
    category: 'disbursement',
    filePath: '/mock-documents/SBI_Disburse.pdf',
    fileSize: 1024 * 512,
    createdAt: getPastDate(12, 20),
  },
];

const initialNotifications: NotificationItem[] = [
  {
    id: 'notif-1',
    type: 'reminder',
    title: 'Upcoming EMI Due',
    body: 'Your EMI of ₹19,450 for SBI Premier Loan is due in 3 days (Jul 10).',
    isRead: false,
    createdAt: new Date().toISOString(),
  },
  {
    id: 'notif-2',
    type: 'moratorium',
    title: 'Daily Accrued Interest Update',
    body: 'Interest of ₹122.74 accrued yesterday on your HDFC Study Abroad loan.',
    isRead: false,
    createdAt: getPastDate(0, 25),
  },
  {
    id: 'notif-3',
    type: 'system',
    title: 'Welcome to EduTrack! 👋',
    body: 'Start tracking your education loans and optimize your repayment plan.',
    isRead: true,
    createdAt: getPastDate(0, 20),
  },
];

export const useLoansStore = create<LoansState>((set, get) => ({
  loans: initialLoans,
  payments: initialPayments,
  reminders: initialReminders,
  documents: initialDocuments,
  notifications: initialNotifications,
  loading: false,

  setLoans: (loans) => set({ loans }),
  
  addLoan: async (loanData) => {
    // Generate outstanding balance equal to principal by default
    const body = {
      ...loanData,
      outstanding_balance: loanData.principal,
      status: loanData.moratorium?.enabled ? 'moratorium' : 'repaying',
    };

    const newLoan = await apiRequest<Loan>('/api/loans', {
      method: 'POST',
      body: JSON.stringify(body),
    });

    set((state) => ({ loans: [...state.loans, newLoan] }));
    return newLoan;
  },

  updateLoan: async (updatedLoan) => {
    const data = await apiRequest<Loan>(`/api/loans/${updatedLoan.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedLoan),
    });

    set((state) => ({
      loans: state.loans.map((l) => (l.id === data.id ? data : l)),
    }));
  },

  removeLoan: async (id) => {
    await apiRequest(`/api/loans/${id}`, {
      method: 'DELETE',
    });

    set((state) => ({
      loans: state.loans.filter((l) => l.id !== id),
      payments: state.payments.filter((p) => p.loanId !== id),
      reminders: state.reminders.filter((r) => r.loanId !== id),
      documents: state.documents.filter((d) => d.loanId !== id),
    }));
  },

  setPayments: (payments) => set({ payments }),
  
  addPayment: async (paymentData) => {
    const newPayment = await apiRequest<Payment>('/api/payments', {
      method: 'POST',
      body: JSON.stringify(paymentData),
    });

    set((state) => ({
      payments: [newPayment, ...state.payments],
      loans: state.loans.map((l) => {
        if (l.id === newPayment.loanId) {
          return {
            ...l,
            outstandingBalance: Math.max(0, l.outstandingBalance - newPayment.principalComponent),
          };
        }
        return l;
      }),
    }));

    return newPayment;
  },

  setReminders: (reminders) => set({ reminders }),
  
  addReminder: async (reminderData) => {
    const newReminder = await apiRequest<Reminder>('/api/reminders', {
      method: 'POST',
      body: JSON.stringify(reminderData),
    });

    set((state) => ({ reminders: [...state.reminders, newReminder] }));
    return newReminder;
  },

  updateReminder: async (updatedReminder) => {
    const data = await apiRequest<Reminder>(`/api/reminders/${updatedReminder.id}`, {
      method: 'PUT',
      body: JSON.stringify(updatedReminder),
    });

    set((state) => ({
      reminders: state.reminders.map((r) => (r.id === data.id ? data : r)),
    }));
  },

  removeReminder: async (id) => {
    await apiRequest(`/api/reminders/${id}`, {
      method: 'DELETE',
    });

    set((state) => ({
      reminders: state.reminders.filter((r) => r.id !== id),
    }));
  },

  setDocuments: (documents) => set({ documents }),
  addDocument: async (documentOrFormData) => {
    let bodyData: FormData;
    if (documentOrFormData instanceof FormData) {
      bodyData = documentOrFormData;
    } else {
      bodyData = new FormData();
      bodyData.append('loan_id', documentOrFormData.loanId);
      bodyData.append('name', documentOrFormData.name);
      bodyData.append('category', documentOrFormData.category);
      if (documentOrFormData.expiryDate) {
        bodyData.append('expiry_date', documentOrFormData.expiryDate);
      }
      // Create a fake File/Blob object to satisfy API parameters
      const fakeBlob = new Blob(['mock file content'], { type: 'application/pdf' });
      bodyData.append('file', fakeBlob, documentOrFormData.name);
    }

    const newDoc = await apiRequest<DocumentItem>('/api/documents', {
      method: 'POST',
      body: bodyData,
    });
    set((state) => ({ documents: [newDoc, ...state.documents] }));
    return newDoc;
  },
  removeDocument: async (id) => {
    await apiRequest(`/api/documents/${id}`, {
      method: 'DELETE',
    });
    set((state) => ({
      documents: state.documents.filter((d) => d.id !== id),
    }));
  },

  setNotifications: (notifications) => set({ notifications }),

  markNotificationRead: async (id) => {
    await apiRequest(`/api/notifications/${id}/read`, {
      method: 'POST',
    });

    set((state) => ({
      notifications: state.notifications.map((n) => (n.id === id ? { ...n, isRead: true } : n)),
    }));
  },

  markAllNotificationsRead: async () => {
    await apiRequest('/api/notifications/read-all', {
      method: 'POST',
    });

    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, isRead: true })),
    }));
  },

  removeNotification: async (id) => {
    await apiRequest(`/api/notifications/${id}`, {
      method: 'DELETE',
    });

    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id),
    }));
  },

  // Async Fetchers
  fetchLoans: async () => {
    try {
      const data = await apiRequest<Loan[]>('/api/loans');
      if (data && Array.isArray(data)) {
        set({ loans: data });
      }
    } catch (err) {
      console.log('Loans fetch skipped/failed (offline/unauth)');
    }
  },

  fetchPayments: async (loanId) => {
    try {
      const path = loanId ? `/api/payments?loan_id=${loanId}` : '/api/payments';
      const data = await apiRequest<Payment[]>(path);
      if (data && Array.isArray(data)) {
        set({ payments: data });
      }
    } catch (err) {
      console.log('Payments fetch skipped/failed');
    }
  },

  fetchReminders: async () => {
    try {
      const data = await apiRequest<Reminder[]>('/api/reminders');
      if (data && Array.isArray(data)) {
        set({ reminders: data });
      }
    } catch (err) {
      console.log('Reminders fetch skipped/failed');
    }
  },

  fetchNotifications: async () => {
    try {
      const data = await apiRequest<NotificationItem[]>('/api/notifications');
      if (data && Array.isArray(data)) {
        set({ notifications: data });
      }
    } catch (err) {
      console.log('Notifications fetch skipped/failed');
    }
  },

  fetchDocuments: async () => {
    try {
      const data = await apiRequest<DocumentItem[]>('/api/documents');
      if (data && Array.isArray(data)) {
        set({ documents: data });
      }
    } catch (err) {
      console.log('Documents fetch skipped/failed');
    }
  },

  syncWithBackend: async () => {
    set({ loading: true });
    try {
      await Promise.all([
        get().fetchLoans(),
        get().fetchPayments(),
        get().fetchReminders(),
        get().fetchNotifications(),
        get().fetchDocuments(),
      ]);
    } catch (err) {
      console.log('Full sync skipped/failed');
    } finally {
      set({ loading: false });
    }
  },
}));
