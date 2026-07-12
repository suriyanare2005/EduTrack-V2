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
  updateDocument: (id: string, name: string) => Promise<DocumentItem>;

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
  clearStore: () => void;
}

// Helper to get formatted dates relative to current date for mock consistency

export const useLoansStore = create<LoansState>((set, get) => ({
  loans: [],
  payments: [],
  reminders: [],
  documents: [],
  notifications: [],
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
  updateDocument: async (id, name) => {
    const data = await apiRequest<DocumentItem>(`/api/documents/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ name }),
    });
    set((state) => ({
      documents: state.documents.map((d) => (d.id === id ? data : d)),
    }));
    return data;
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

  clearStore: () => {
    set({
      loans: [],
      payments: [],
      reminders: [],
      documents: [],
      notifications: [],
    });
  },
}));
