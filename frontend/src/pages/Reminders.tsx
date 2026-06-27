import React, { useState, useMemo } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { toast } from 'sonner';
import { Bell, Plus, Trash2, Edit, ChevronDown, ChevronUp } from 'lucide-react';
import type { Reminder } from '../types';

export const Reminders: React.FC = () => {
  const loans = useLoansStore((state) => state.loans);
  const reminders = useLoansStore((state) => state.reminders);
  const addReminder = useLoansStore((state) => state.addReminder);
  const updateReminder = useLoansStore((state) => state.updateReminder);
  const removeReminder = useLoansStore((state) => state.removeReminder);

  // Bottom sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingReminderId, setEditingReminderId] = useState<string | null>(null);
  
  // Form states
  const [selectedLoanId, setSelectedLoanId] = useState('');
  const [label, setLabel] = useState('');
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [daysBefore, setDaysBefore] = useState<number>(3);
  const [recurrence, setRecurrence] = useState<'one_time' | 'monthly'>('monthly');
  const [channelInApp, setChannelInApp] = useState(true);
  const [channelPush, setChannelPush] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Form helper: auto fill label on loan selection
  const handleLoanChange = (loanId: string) => {
    setSelectedLoanId(loanId);
    const selectedLoan = loans.find((l) => l.id === loanId);
    if (selectedLoan) {
      setLabel(`EMI Due – ${selectedLoan.nickname}`);
      setDueDate(selectedLoan.nextEmiDate);
    }
  };

  const handleOpenAddSheet = () => {
    setEditingReminderId(null);
    if (loans.length > 0) {
      setSelectedLoanId(loans[0].id);
      setLabel(`EMI Due – ${loans[0].nickname}`);
      setDueDate(loans[0].nextEmiDate);
    } else {
      setSelectedLoanId('');
      setLabel('');
      setDueDate(new Date().toISOString().split('T')[0]);
    }
    setDaysBefore(3);
    setRecurrence('monthly');
    setChannelInApp(true);
    setChannelPush(false);
    setSheetOpen(true);
  };

  const handleOpenEditSheet = (reminder: Reminder) => {
    setEditingReminderId(reminder.id);
    setSelectedLoanId(reminder.loanId);
    setLabel(reminder.label);
    setDueDate(reminder.dueDate);
    setDaysBefore(reminder.daysBefore);
    setRecurrence(reminder.recurrence);
    setChannelInApp(reminder.channelInApp);
    setChannelPush(reminder.channelPush);
    setSheetOpen(true);
  };

  const handleSaveReminder = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLoanId) {
      toast.error('Please select a loan');
      return;
    }

    const payload: Reminder = {
      id: editingReminderId || `rem-${Math.random().toString(36).substr(2, 9)}`,
      loanId: selectedLoanId,
      label,
      dueDate,
      daysBefore,
      recurrence,
      channelInApp,
      channelPush,
      isActive: true,
    };

    if (editingReminderId) {
      updateReminder(payload);
      toast.success('Reminder updated successfully');
    } else {
      addReminder(payload);
      toast.success('Reminder scheduled successfully');
    }

    setSheetOpen(false);
  };

  const handleToggleActive = (reminder: Reminder) => {
    const updated = { ...reminder, isActive: !reminder.isActive };
    updateReminder(updated);
    toast.success(updated.isActive ? 'Reminder enabled' : 'Reminder disabled');
  };

  const handleDelete = (id: string) => {
    removeReminder(id);
    toast.success('Reminder deleted successfully');
  };

  // Helper to format due date
  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  // Mock past reminders history
  const pastReminders = useMemo(() => {
    return [
      { id: 'past-1', label: 'SBI Loan EMI Payment', date: '2026-06-10', status: 'delivered' },
      { id: 'past-2', label: 'SBI Loan EMI Payment', date: '2026-05-10', status: 'delivered' },
      { id: 'past-3', label: 'HDFC Moratorium Pre-EMI', date: '2026-05-10', status: 'dismissed' },
    ];
  }, []);

  return (
    <AppShell
      title="Payment Reminders"
      showBack={true}
      hideBottomNav={true}
      rightActions={
        <Button
          variant="ghost"
          size="icon"
          onClick={handleOpenAddSheet}
          className="w-9 h-9 rounded-xl text-text-primary"
          aria-label="Add reminder"
        >
          <Plus className="w-5 h-5" />
        </Button>
      }
    >
      <div className="space-y-6">
        
        {/* Header summary card */}
        <div className="bg-card border border-border p-5 rounded-3xl shadow-sm flex items-center justify-between">
          <div className="space-y-0.5">
            <span className="text-[10px] text-text-secondary uppercase tracking-wider block">Active Alerts</span>
            <span className="text-2xl font-bold font-mono text-text-primary">
              {reminders.filter((r) => r.isActive).length} Scheduled
            </span>
          </div>
          <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-full">
            <Bell className="w-6 h-6" />
          </div>
        </div>

        {/* Reminders List */}
        <div className="space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Scheduled EMI Reminders</h3>

          {reminders.length === 0 ? (
            <div className="bg-card border border-border p-8 rounded-3xl shadow-sm text-center text-text-secondary text-sm">
              No reminders configured. Tap the + icon to schedule your first alert.
            </div>
          ) : (
            <div className="space-y-3">
              {reminders.map((reminder) => {
                const targetLoan = loans.find((l) => l.id === reminder.loanId);
                return (
                  <div
                    key={reminder.id}
                    className={`bg-card border border-border rounded-3xl p-4 shadow-sm flex justify-between items-start gap-4 transition-all duration-200 ${
                      !reminder.isActive ? 'opacity-60 bg-slate-50/50 dark:bg-slate-900/10' : ''
                    }`}
                  >
                    <div className="space-y-1 flex-1 min-w-0">
                      <h4 className="font-bold text-sm text-text-primary leading-tight truncate">
                        {reminder.label}
                      </h4>
                      <p className="text-[10px] text-text-secondary">
                        Due: <span className="font-semibold">{formatDate(reminder.dueDate)}</span> ({reminder.daysBefore} days before)
                      </p>
                      {targetLoan && (
                        <p className="text-[9px] text-primary bg-indigo-50 dark:bg-indigo-950/20 px-2 py-0.5 rounded-full inline-block font-semibold">
                          EMI Amount: ₹{targetLoan.nextEmiAmount.toLocaleString('en-IN')}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Active Toggle Switch */}
                      <Switch
                        checked={reminder.isActive}
                        onCheckedChange={() => handleToggleActive(reminder)}
                        className="scale-90"
                      />
                      
                      {/* Actions */}
                      <button
                        onClick={() => handleOpenEditSheet(reminder)}
                        className="p-1.5 rounded-lg text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
                        aria-label="Edit reminder"
                      >
                        <Edit className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(reminder.id)}
                        className="p-1.5 rounded-lg text-error hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
                        aria-label="Delete reminder"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* History Collapsible Section */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <button 
            onClick={() => setShowHistory(!showHistory)}
            className="flex items-center justify-between w-full text-xs font-bold text-text-secondary uppercase tracking-wider"
          >
            <span>View Past Reminder Logs ({pastReminders.length})</span>
            {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
          {showHistory && (
            <div className="space-y-3 pt-2">
              {pastReminders.map((past) => (
                <div key={past.id} className="flex justify-between items-center py-2 border-b border-slate-50 dark:border-slate-800 last:border-0 last:pb-0">
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text-primary block">{past.label}</span>
                    <span className="text-[10px] text-text-secondary font-mono block">Delivered on {formatDate(past.date)}</span>
                  </div>
                  <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full uppercase ${
                    past.status === 'delivered'
                      ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/20 dark:text-emerald-400'
                      : 'bg-slate-100 text-text-secondary dark:bg-slate-800'
                  }`}>
                    {past.status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Add / Edit Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-md mx-auto p-6 focus-visible:outline-none">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg font-bold">
              {editingReminderId ? 'Modify Reminder Alert' : 'Create Payment Alert'}
            </SheetTitle>
            <SheetDescription className="text-xs text-text-secondary">
              Configure timing parameters for mobile push alerts and in-app updates.
            </SheetDescription>
          </SheetHeader>
          
          <form onSubmit={handleSaveReminder} className="space-y-4">
            {/* Loan Select */}
            <div className="space-y-1">
              <Label>Select Loan Profile</Label>
              <Select value={selectedLoanId} onValueChange={handleLoanChange} disabled={!!editingReminderId}>
                <SelectTrigger className="rounded-xl h-11 bg-card">
                  <SelectValue placeholder="Choose profile..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  {loans.map((l) => (
                    <SelectItem key={l.id} value={l.id}>
                      {l.nickname}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Label */}
            <div className="space-y-1">
              <Label htmlFor="label">Reminder Label</Label>
              <Input
                id="label"
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                className="rounded-xl h-11"
                required
              />
            </div>

            {/* Timing grid */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <Label htmlFor="dueDate">EMI Due Date</Label>
                <Input
                  id="dueDate"
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="rounded-xl font-mono h-11"
                  required
                />
              </div>

              <div className="space-y-1">
                <Label>Trigger Advance (Days)</Label>
                <Select
                  value={daysBefore.toString()}
                  onValueChange={(val) => setDaysBefore(parseInt(val, 10))}
                >
                  <SelectTrigger className="rounded-xl h-11 bg-card">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-xl">
                    <SelectItem value="1">1 Day Before</SelectItem>
                    <SelectItem value="3">3 Days Before</SelectItem>
                    <SelectItem value="5">5 Days Before</SelectItem>
                    <SelectItem value="7">7 Days Before</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Channels toggles */}
            <div className="space-y-2 border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
              <Label className="text-xs font-semibold text-text-primary">Notification Channels</Label>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-text-secondary">In-App Notification Center</span>
                <Switch checked={channelInApp} onCheckedChange={setChannelInApp} />
              </div>
              <div className="flex justify-between items-center py-1">
                <span className="text-xs text-text-secondary">PWA Push Notification</span>
                <Switch checked={channelPush} onCheckedChange={setChannelPush} />
              </div>
            </div>

            <Button
              type="submit"
              className="w-full py-5 bg-primary hover:bg-primary-light text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center mt-4"
            >
              {editingReminderId ? 'Save Changes' : 'Schedule Alert'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};
