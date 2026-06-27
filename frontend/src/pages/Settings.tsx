import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useAuthStore } from '../store/useAuthStore';
import { useUIStore } from '../store/useUIStore';
import { useLoansStore } from '../store/useLoansStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog';
import { 
  Sun, Moon, Bell, Shield, Download, FileJson, FileSpreadsheet, 
  Trash2, LogOut, Edit3, Check 
} from 'lucide-react';
import { toast } from 'sonner';

export const Settings: React.FC = () => {
  const navigate = useNavigate();
  
  // Zustand State bindings
  const profile = useAuthStore((state) => state.profile);
  const setProfile = useAuthStore((state) => state.setProfile);
  const clearAuth = useAuthStore((state) => state.clearAuth);
  
  const darkMode = useUIStore((state) => state.darkMode);
  const toggleDarkMode = useUIStore((state) => state.toggleDarkMode);
  
  const loans = useLoansStore((state) => state.loans);
  const payments = useLoansStore((state) => state.payments);
  const reminders = useLoansStore((state) => state.reminders);
  const documents = useLoansStore((state) => state.documents);

  // Form / Toggle Edit states
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [profileName, setProfileName] = useState(profile?.fullName || 'Suriya K');
  const [profileEmail, setProfileEmail] = useState(profile?.email || 'suriya@example.com');
  
  const [pushEnabled, setPushEnabled] = useState(true);

  // Modal controls
  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [signOutDialogOpen, setSignOutDialogOpen] = useState(false);

  // Save profile changes locally
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    if (!profileName.trim()) {
      toast.error('Name cannot be blank');
      return;
    }
    
    setProfile({
      id: profile?.id || 'usr-mock-99',
      fullName: profileName,
      email: profileEmail,
      created_at: profile?.created_at || new Date().toISOString()
    });
    
    setIsEditingProfile(false);
    toast.success('Profile details updated successfully');
  };

  // Export JSON database utility
  const handleExportJSON = () => {
    try {
      const dataPayload = {
        exportedAt: new Date().toISOString(),
        profile: { fullName: profileName, email: profileEmail },
        loans,
        payments,
        reminders,
        documents: documents.map(d => ({ ...d, filePath: '[redacted_for_export]' }))
      };

      const jsonStr = JSON.stringify(dataPayload, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `edutrack_backup_${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast.success('JSON export file downloaded');
    } catch (err) {
      toast.error('Failed to export data to JSON');
    }
  };

  // Export CSV payments table utility
  const handleExportCSV = () => {
    try {
      if (payments.length === 0) {
        toast.info('No payment records to export');
        return;
      }

      const headers = ['Payment ID', 'Loan ID', 'Payment Date', 'Amount Paid (INR)', 'Principal Portion', 'Interest Portion', 'Mode', 'Notes'];
      const rows = payments.map((p) => [
        p.id,
        p.loanId,
        p.paymentDate,
        p.amount,
        p.principalComponent,
        p.interestComponent,
        p.paymentMode,
        p.notes || ''
      ]);

      const csvContent = [
        headers.join(','),
        ...rows.map((r) => r.map((val) => `"${String(val).replace(/"/g, '""')}"`).join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      
      const link = document.createElement('a');
      link.href = url;
      link.download = `edutrack_payment_ledger_${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast.success('Payments CSV downloaded');
    } catch (err) {
      toast.error('Failed to export data to CSV');
    }
  };

  // Full reset handler
  const handleResetApplication = () => {
    // Clear stores and local storage parameters
    localStorage.clear();
    toast.success('App database wiped successfully!');
    setResetDialogOpen(false);
    setTimeout(() => {
      window.location.href = '/onboarding';
    }, 800);
  };

  // Sign out handler
  const handleSignOut = () => {
    clearAuth();
    setSignOutDialogOpen(false);
    toast.info('Logged out securely');
    navigate('/auth/login');
  };

  return (
    <AppShell title="Profile & Settings">
      <div className="space-y-6 pb-24">
        
        {/* User Card Profile Header */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-primary/10 border border-primary/20 flex items-center justify-center text-primary font-bold text-xl uppercase">
              {profileName.split(' ').map(n => n[0]).join('') || 'U'}
            </div>
            
            <div className="flex-1 min-w-0">
              {isEditingProfile ? (
                <form onSubmit={handleSaveProfile} className="space-y-2 mt-1">
                  <div className="space-y-1.5">
                    <Input 
                      value={profileName} 
                      onChange={(e) => setProfileName(e.target.value)} 
                      placeholder="Full Name"
                      className="h-8 rounded-lg text-xs"
                      required
                    />
                    <Input 
                      value={profileEmail} 
                      onChange={(e) => setProfileEmail(e.target.value)} 
                      placeholder="Email Address"
                      className="h-8 rounded-lg text-xs"
                      type="email"
                      required
                    />
                  </div>
                  <div className="flex gap-1.5">
                    <Button type="submit" size="sm" className="h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-[10px] gap-1">
                      <Check className="w-3 h-3" /> Save
                    </Button>
                    <Button type="button" size="sm" variant="ghost" onClick={() => setIsEditingProfile(false)} className="h-7 px-2 rounded-lg text-[10px]">
                      Cancel
                    </Button>
                  </div>
                </form>
              ) : (
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-text-primary truncate">{profileName}</h2>
                    <button 
                      onClick={() => setIsEditingProfile(true)}
                      className="p-1 text-text-secondary hover:text-text-primary hover:bg-slate-100 dark:hover:bg-slate-800/80 rounded transition-colors"
                      aria-label="Edit Profile"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                  <p className="text-xs text-text-secondary truncate">{profileEmail}</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Configuration Group: Display Preference */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Preferences</h3>
          
          <div className="space-y-3.5">
            {/* Dark Mode Switch */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 text-text-secondary rounded-xl">
                  {darkMode ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-text-primary">Theme Appearance</Label>
                  <p className="text-[10px] text-text-secondary">Toggle between Light and Dark layout modes</p>
                </div>
              </div>
              <Switch checked={darkMode} onCheckedChange={toggleDarkMode} />
            </div>

            {/* Push Alert Switch */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-slate-50 dark:bg-slate-800 text-text-secondary rounded-xl">
                  <Bell className="w-4 h-4" />
                </div>
                <div className="space-y-0.5">
                  <Label className="text-xs font-bold text-text-primary">Push Alerts</Label>
                  <p className="text-[10px] text-text-secondary">Get critical payment reminder alerts</p>
                </div>
              </div>
              <Switch checked={pushEnabled} onCheckedChange={setPushEnabled} />
            </div>
          </div>
        </div>

        {/* Configuration Group: Data Portability & Safety */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Data Portability</h3>
          
          <div className="space-y-3 text-xs">
            <button 
              onClick={handleExportJSON}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-xl">
                  <FileJson className="w-4 h-4" />
                </div>
                <div className="text-left space-y-0.5">
                  <span className="font-bold text-text-primary block">Backup Store Database (JSON)</span>
                  <span className="text-[10px] text-text-secondary block">Export full profile schema & history</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-text-secondary" />
            </button>

            <button 
              onClick={handleExportCSV}
              className="w-full flex items-center justify-between p-3 rounded-2xl hover:bg-slate-50 dark:hover:bg-slate-800/40 border border-slate-100 dark:border-slate-800/80 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className="p-2 bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600 dark:text-emerald-400 rounded-xl">
                  <FileSpreadsheet className="w-4 h-4" />
                </div>
                <div className="text-left space-y-0.5">
                  <span className="font-bold text-text-primary block">Payment Transaction Ledger (CSV)</span>
                  <span className="text-[10px] text-text-secondary block">Download spreadsheet format log</span>
                </div>
              </div>
              <Download className="w-4 h-4 text-text-secondary" />
            </button>
          </div>
        </div>

        {/* Danger Action Controls */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Danger Zone</h3>
          
          <div className="space-y-2">
            <Button 
              variant="outline" 
              onClick={() => setResetDialogOpen(true)}
              className="w-full justify-start text-xs text-error border-error/20 hover:bg-error/10 h-12 rounded-2xl gap-3 font-semibold"
            >
              <Trash2 className="w-4 h-4 text-error" />
              Reset All Application State
            </Button>
            
            <Button 
              variant="outline" 
              onClick={() => setSignOutDialogOpen(true)}
              className="w-full justify-start text-xs border-border hover:bg-slate-100 dark:hover:bg-slate-800/50 h-12 rounded-2xl gap-3 font-semibold text-text-secondary hover:text-text-primary"
            >
              <LogOut className="w-4 h-4 text-text-secondary" />
              Secure Sign Out
            </Button>
          </div>
        </div>

        {/* Footer info branding */}
        <div className="text-center space-y-1">
          <div className="flex items-center justify-center gap-1.5 text-[9px] text-text-secondary uppercase font-mono">
            <Shield className="w-3 h-3" />
            <span>EduTrack Mobile Sandbox v1.0.0</span>
          </div>
          <span className="text-[8px] text-text-secondary block">Powered by Vite, FastAPI & Neon PostgreSQL</span>
        </div>

      </div>

      {/* Sign Out Confirmation Dialog */}
      <Dialog open={signOutDialogOpen} onOpenChange={setSignOutDialogOpen}>
        <DialogContent className="max-w-xs rounded-3xl p-5 bg-card border-border">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-base font-bold">Sign Out?</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Are you sure you want to end your session? You will need to log in again to sync transactions.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setSignOutDialogOpen(false)} className="flex-1 rounded-xl h-10 text-xs">
              Cancel
            </Button>
            <Button onClick={handleSignOut} className="flex-1 bg-primary hover:bg-primary-light text-white rounded-xl h-10 text-xs font-bold">
              Sign Out
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wiping Application Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="max-w-xs rounded-3xl p-5 bg-card border-border">
          <DialogHeader className="text-center space-y-2">
            <DialogTitle className="text-base font-bold text-error">Wipe All App Data?</DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              This action is permanent and will clear all local storage credentials, customized profiles, logged payment ledgers, and reminders.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-row gap-2 mt-4">
            <Button variant="outline" onClick={() => setResetDialogOpen(false)} className="flex-1 rounded-xl h-10 text-xs">
              Cancel
            </Button>
            <Button onClick={handleResetApplication} className="flex-1 bg-error hover:bg-error-light text-white rounded-xl h-10 text-xs font-bold">
              Reset App
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </AppShell>
  );
};
export default Settings;

