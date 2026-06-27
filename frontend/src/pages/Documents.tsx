import React, { useState, useMemo, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Switch } from '@/components/ui/switch';
import { Progress } from '@/components/ui/progress';
import { EmptyState } from '../components/shared/EmptyState';
import { toast } from 'sonner';
import { FileText, Plus, Search, MoreVertical, Trash2, Eye, Share2, Upload, Calendar } from 'lucide-react';


export const Documents: React.FC = () => {
  const navigate = useNavigate();
  const loans = useLoansStore((state) => state.loans);
  const documents = useLoansStore((state) => state.documents);
  const addDocument = useLoansStore((state) => state.addDocument);
  const removeDocument = useLoansStore((state) => state.removeDocument);

  // Filter states
  const [selectedLoanFilter, setSelectedLoanFilter] = useState<string>('all');
  const [selectedCatFilter, setSelectedCatFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Upload bottom sheet states
  const [sheetOpen, setSheetOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);

  // Form states
  const [uploadLoanId, setUploadLoanId] = useState('');
  const [docCategory, setDocCategory] = useState<'sanction_letter' | 'disbursement' | 'noc' | 'itr' | 'other'>('sanction_letter');
  const [docName, setDocName] = useState('');
  const [hasExpiry, setHasExpiry] = useState(false);
  const [expiryDate, setExpiryDate] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Initialize form options
  const handleOpenUploadSheet = () => {
    if (loans.length > 0) {
      setUploadLoanId(loans[0].id);
    }
    setDocCategory('sanction_letter');
    setDocName('');
    setHasExpiry(false);
    setExpiryDate('');
    setSelectedFile(null);
    setUploadProgress(0);
    setUploading(false);
    setSheetOpen(true);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const file = e.target.files[0];
      setSelectedFile(file);
      // Auto populate document name if empty
      if (!docName) {
        setDocName(file.name);
      }
    }
  };

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!uploadLoanId) {
      toast.error('Please select a loan profile');
      return;
    }
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(15);
    
    const progressInterval = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 85) return prev;
        return prev + 5;
      });
    }, 100);

    try {
      const formData = new FormData();
      formData.append('loan_id', uploadLoanId);
      formData.append('name', docName || selectedFile.name);
      formData.append('category', docCategory);
      if (hasExpiry && expiryDate) {
        formData.append('expiry_date', expiryDate);
      }
      formData.append('file', selectedFile);

      await addDocument(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);
      toast.success('Document uploaded successfully!');
      setSheetOpen(false);
    } catch (err: any) {
      clearInterval(progressInterval);
      toast.error('Failed to upload document', {
        description: err.message || 'Could not save file to disk or vault.'
      });
    } finally {
      setUploading(false);
    }
  };

  // Categories list
  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'sanction_letter', label: 'Sanction Letters' },
    { value: 'disbursement', label: 'Disbursements' },
    { value: 'noc', label: 'NOC Certificates' },
    { value: 'itr', label: 'ITR / Income' },
    { value: 'other', label: 'Others' },
  ];

  // Filtering documents
  const filteredDocs = useMemo(() => {
    return documents.filter((doc) => {
      const matchLoan = selectedLoanFilter === 'all' || doc.loanId === selectedLoanFilter;
      const matchCat = selectedCatFilter === 'all' || doc.category === selectedCatFilter;
      const matchSearch = doc.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchLoan && matchCat && matchSearch;
    });
  }, [documents, selectedLoanFilter, selectedCatFilter, searchQuery]);

  const handleDelete = async (id: string) => {
    try {
      await removeDocument(id);
      toast.success('Document deleted from vault');
    } catch (err: any) {
      toast.error('Failed to delete document', {
        description: err.message || 'An error occurred.'
      });
    }
  };

  const handleShare = (docName: string) => {
    toast.info('Share File', {
      description: `Copied shareable link for ${docName} to clipboard.`,
    });
  };

  // Formatting helpers
  const formatSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric',
    });
  };

  return (
    <AppShell title="Document Vault">
      <div className="space-y-6">
        
        {/* Search & Upload Header */}
        <div className="flex gap-2 items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 w-4 h-4 text-text-secondary pointer-events-none" />
            <Input
              placeholder="Search documents..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="rounded-xl pl-9 py-5 bg-card"
            />
          </div>
          <Button
            size="icon"
            onClick={handleOpenUploadSheet}
            className="w-11 h-11 bg-primary hover:bg-primary-light text-white rounded-xl shadow-sm"
            aria-label="Upload document"
          >
            <Plus className="w-5 h-5" />
          </Button>
        </div>

        {/* Horizontal filters */}
        <div className="space-y-3">
          {/* Loan Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            <button
              onClick={() => setSelectedLoanFilter('all')}
              className={`px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all duration-200 ${
                selectedLoanFilter === 'all'
                  ? 'bg-primary border-primary text-white shadow-sm'
                  : 'bg-card border-border text-text-secondary hover:text-text-primary'
              }`}
            >
              All Loans
            </button>
            {loans.map((loan) => (
              <button
                key={loan.id}
                onClick={() => setSelectedLoanFilter(loan.id)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all duration-200 ${
                  selectedLoanFilter === loan.id
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-card border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {loan.nickname}
              </button>
            ))}
          </div>

          {/* Category Filter Chips */}
          <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
            {categories.map((cat) => (
              <button
                key={cat.value}
                onClick={() => setSelectedCatFilter(cat.value)}
                className={`px-4 py-2 rounded-full text-xs font-semibold border whitespace-nowrap transition-all duration-200 ${
                  selectedCatFilter === cat.value
                    ? 'bg-primary border-primary text-white shadow-sm'
                    : 'bg-card border-border text-text-secondary hover:text-text-primary'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>
        </div>

        {/* Vault Files List */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <h3 className="text-xs font-bold text-text-secondary uppercase tracking-wider">Vault Files</h3>

          {filteredDocs.length === 0 ? (
            <EmptyState
              illustration={<FileText className="w-12 h-12 text-slate-300" />}
              title="Vault is Empty"
              description="No documents match the filter criteria. Upload sanction letters or invoices to keep files organized."
            />
          ) : (
            <div className="space-y-3">
              {filteredDocs.map((doc) => {
                const targetLoan = loans.find((l) => l.id === doc.loanId);
                const isExpiring = doc.expiryDate && (new Date(doc.expiryDate).getTime() - new Date().getTime()) < 30 * 24 * 60 * 60 * 1000;

                return (
                  <div
                    key={doc.id}
                    className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50/50 dark:bg-slate-800/20 border border-slate-100 dark:border-slate-800/80 hover:shadow-sm transition-all duration-200"
                  >
                    <div
                      className="flex items-center gap-3 cursor-pointer min-w-0 flex-1"
                      onClick={() => navigate(`/documents/${doc.id}/preview`)}
                    >
                      <div className="p-3 bg-red-50 dark:bg-red-950/20 text-red-600 dark:text-red-400 rounded-2xl flex-shrink-0">
                        <FileText className="w-5 h-5" />
                      </div>
                      <div className="space-y-0.5 min-w-0">
                        <span className="text-xs font-bold text-text-primary truncate block pr-2">
                          {doc.name}
                        </span>
                        <div className="flex flex-wrap items-center gap-1.5 text-[9px] text-text-secondary uppercase">
                          <span className="font-semibold text-[8px] bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">
                            {doc.category.replace('_', ' ')}
                          </span>
                          <span>{formatSize(doc.fileSize)}</span>
                          {targetLoan && <span className="truncate max-w-[80px]">• {targetLoan.nickname}</span>}
                        </div>
                        {doc.expiryDate && (
                          <div className={`flex items-center gap-1 text-[9px] ${
                            isExpiring ? 'text-error font-bold' : 'text-text-secondary'
                          }`}>
                            <Calendar className="w-3 h-3" />
                            Expires: {formatDate(doc.expiryDate)}
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Actions Menu */}
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="p-1.5 rounded-lg text-text-secondary hover:bg-slate-100 dark:hover:bg-slate-800/80 transition-colors">
                          <MoreVertical className="w-4 h-4" />
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="rounded-xl min-w-[120px]">
                        <DropdownMenuItem onClick={() => navigate(`/documents/${doc.id}/preview`)} className="text-xs flex items-center gap-2">
                          <Eye className="w-3.5 h-3.5" /> View Preview
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleShare(doc.name)} className="text-xs flex items-center gap-2">
                          <Share2 className="w-3.5 h-3.5" /> Share
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDelete(doc.id)} className="text-xs text-error focus:text-error flex items-center gap-2">
                          <Trash2 className="w-3.5 h-3.5" /> Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Upload Bottom Sheet */}
      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="bottom" className="rounded-t-3xl max-w-md mx-auto p-6 focus-visible:outline-none">
          <SheetHeader className="mb-4">
            <SheetTitle className="text-lg font-bold">Upload Loan Document</SheetTitle>
            <SheetDescription className="text-xs text-text-secondary">
              Upload bank letters, sanction summaries, or ITR records.
            </SheetDescription>
          </SheetHeader>

          <form onSubmit={handleUploadSubmit} className="space-y-4">
            {/* File Picker Container */}
            <div className="space-y-1">
              <Label>Select File</Label>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".pdf,.jpg,.jpeg,.png"
                className="hidden"
              />
              <div
                onClick={() => fileInputRef.current?.click()}
                className="border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:bg-slate-50 dark:hover:bg-slate-900/40 transition-colors flex flex-col items-center justify-center gap-2"
              >
                <div className="p-3 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-full">
                  <Upload className="w-5 h-5" />
                </div>
                {selectedFile ? (
                  <div className="space-y-0.5">
                    <span className="text-xs font-bold text-text-primary block truncate max-w-[240px]">
                      {selectedFile.name}
                    </span>
                    <span className="text-[10px] text-text-secondary block">
                      {formatSize(selectedFile.size)}
                    </span>
                  </div>
                ) : (
                  <div>
                    <span className="text-xs font-bold text-text-primary block">Click to select a file</span>
                    <span className="text-[9px] text-text-secondary block mt-0.5">PDF, PNG, JPG up to 10MB</span>
                  </div>
                )}
              </div>
            </div>

            {/* Document Name */}
            <div className="space-y-1">
              <Label htmlFor="docName">Document Name</Label>
              <Input
                id="docName"
                placeholder="e.g. Sanction_Letter_SBI"
                value={docName}
                onChange={(e) => setDocName(e.target.value)}
                className="rounded-xl h-11"
                required
              />
            </div>

            {/* Loan Selector */}
            <div className="space-y-1">
              <Label>Link to Loan Profile</Label>
              <Select value={uploadLoanId} onValueChange={setUploadLoanId}>
                <SelectTrigger className="rounded-xl h-11 bg-card">
                  <SelectValue />
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

            {/* Category */}
            <div className="space-y-1">
              <Label>Category</Label>
              <Select
                value={docCategory}
                onValueChange={(val: any) => setDocCategory(val)}
              >
                <SelectTrigger className="rounded-xl h-11 bg-card">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-xl">
                  <SelectItem value="sanction_letter">Sanction Letter</SelectItem>
                  <SelectItem value="disbursement">Disbursement Note</SelectItem>
                  <SelectItem value="noc">NOC Certificate</SelectItem>
                  <SelectItem value="itr">ITR / Income Proof</SelectItem>
                  <SelectItem value="other">Other / Miscellaneous</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Expiry Switch */}
            <div className="flex items-center justify-between border-t border-slate-100 dark:border-slate-800/80 pt-4 mt-2">
              <div className="space-y-0.5">
                <Label className="text-xs font-bold text-text-primary">Has Expiry Date?</Label>
                <p className="text-[10px] text-text-secondary">Warn me before this document expires.</p>
              </div>
              <Switch checked={hasExpiry} onCheckedChange={setHasExpiry} />
            </div>

            {/* Expiry Date */}
            {hasExpiry && (
              <div className="space-y-1 pt-1">
                <Label htmlFor="expiryDate">Expiry Date</Label>
                <Input
                  id="expiryDate"
                  type="date"
                  value={expiryDate}
                  onChange={(e) => setExpiryDate(e.target.value)}
                  className="rounded-xl h-11 font-mono"
                  required
                />
              </div>
            )}

            {/* Uploading progress bar */}
            {uploading && (
              <div className="space-y-1.5 pt-2">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-text-secondary">Uploading to vault...</span>
                  <span className="font-semibold text-primary font-mono">{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} className="h-2 rounded-full" />
              </div>
            )}

            {/* Submit */}
            <Button
              type="submit"
              disabled={uploading}
              className="w-full py-5 bg-primary hover:bg-primary-light text-white rounded-2xl font-bold transition-all duration-300 flex items-center justify-center mt-4"
            >
              {uploading ? 'Processing File...' : 'Upload to Vault'}
            </Button>
          </form>
        </SheetContent>
      </Sheet>
    </AppShell>
  );
};
export default Documents;
