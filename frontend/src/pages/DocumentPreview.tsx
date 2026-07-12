import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { 
  FileText, ZoomIn, ZoomOut, Download, Bot, Sparkles, CheckCircle, RefreshCw 
} from 'lucide-react';
import { motion } from 'framer-motion';
import { toast } from 'sonner';
import { apiRequest, API_BASE_URL } from '../lib/api';

export const DocumentPreview: React.FC = () => {
  const { docId } = useParams<{ docId: string }>();
  const navigate = useNavigate();
  const documents = useLoansStore((state) => state.documents);
  const loans = useLoansStore((state) => state.loans);

  // Find document
  const doc = documents.find((d) => d.id === docId);
  const linkedLoan = loans.find((l) => l.id === doc?.loanId);

  // View States
  const [zoom, setZoom] = useState(100);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisStep, setAnalysisStep] = useState(0);
  const [analysisResult, setAnalysisResult] = useState<any | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);

  if (!doc) {
    return (
      <AppShell title="Document Not Found" showBack={true} hideBottomNav={true}>
        <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4 p-6 text-center">
          <div className="p-4 bg-slate-100 dark:bg-slate-800 rounded-full text-slate-400">
            <AlertCircleIcon className="w-12 h-12" />
          </div>
          <h2 className="text-xl font-bold text-text-primary">Document Not Found</h2>
          <p className="text-sm text-text-secondary max-w-sm">
            The document you are looking for might have been deleted or moved.
          </p>
          <Button onClick={() => navigate('/documents')} className="bg-primary text-white rounded-xl">
            Back to Document Vault
          </Button>
        </div>
      </AppShell>
    );
  }

  // Format File Size
  const formatSize = (bytes: number) => {
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const handleZoomIn = () => setZoom((prev) => Math.min(prev + 25, 200));
  const handleZoomOut = () => setZoom((prev) => Math.max(prev - 25, 50));

  const token = localStorage.getItem('token');
  const fileUrl = `${API_BASE_URL}/api/documents/${doc.id}/file${token ? `?token=${token}` : ''}`;
  const isImage = !!doc.name.toLowerCase().match(/\.(jpg|jpeg|png|gif|webp)$/);
  const isPdf = doc.name.toLowerCase().endsWith('.pdf');

  const handleDownload = () => {
    window.open(fileUrl, '_blank');
    toast.success('Download Started', {
      description: `Downloading ${doc.name} to your local device.`,
    });
  };

  // Run AI Summarize API trigger
  const runAISummarize = async () => {
    setIsAnalyzing(true);
    setAnalysisStep(0);
    setIsModalOpen(true);

    const steps = [
      'Scanning PDF page boundaries...',
      'Extracting document text using OCR OCR...',
      'Isolating key parameters with GPT-4o...',
      'Verifying banking compliance hashes...',
      'Synthesizing loan configuration terms...'
    ];

    for (let i = 0; i < steps.length; i++) {
      setAnalysisStep(i);
      await new Promise((resolve) => setTimeout(resolve, 800));
    }

    try {
      const data = await apiRequest<any>('/api/ai/summarize-document', {
        method: 'POST',
        body: JSON.stringify({ document_id: doc.id })
      });
      setAnalysisResult(data);
      toast.success('Document analysis completed by AI!');
    } catch (err: any) {
      toast.error('AI Scanner failed', {
        description: err.message || 'Could not connect to backend analysis endpoint.'
      });
      setIsModalOpen(false);
    } finally {
      setIsAnalyzing(false);
    }
  };

  return (
    <AppShell title="Document Preview" showBack={true} hideBottomNav={true}>
      <div className="space-y-6 pb-20">
        
        {/* Document Header Metadata */}
        <div className="bg-card border border-border rounded-3xl p-5 shadow-sm space-y-4">
          <div className="flex items-start gap-4">
            <div className="p-3.5 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-2xl">
              <FileText className="w-8 h-8" />
            </div>
            <div className="space-y-1 min-w-0 flex-1">
              <h2 className="text-base font-bold text-text-primary truncate">{doc.name}</h2>
              <div className="flex flex-wrap gap-1.5 items-center">
                <Badge variant="secondary" className="text-[10px] font-bold px-2.5 py-0.5 rounded-full capitalize">
                  {doc.category.replace('_', ' ')}
                </Badge>
                <span className="text-[10px] text-text-secondary font-mono">• {formatSize(doc.fileSize)}</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 pt-3 border-t border-slate-100 dark:border-slate-800/80 text-xs">
            <div className="space-y-0.5">
              <span className="text-text-secondary">Linked Loan Profile</span>
              <span className="font-bold block text-text-primary truncate">{linkedLoan?.nickname || 'Unassigned'}</span>
            </div>
            <div className="space-y-0.5">
              <span className="text-text-secondary">Uploaded Date</span>
              <span className="font-bold block text-text-primary">
                {new Date(doc.createdAt).toLocaleDateString('en-IN', {
                  day: 'numeric',
                  month: 'short',
                  year: 'numeric'
                })}
              </span>
            </div>
          </div>
        </div>

        {/* Interaction Controls */}
        <div className="flex justify-between items-center bg-card border border-border px-4 py-3 rounded-2xl shadow-sm">
          <div className="flex items-center gap-2">
            <Button size="icon" variant="outline" onClick={handleZoomOut} className="rounded-xl w-9 h-9">
              <ZoomOut className="w-4 h-4" />
            </Button>
            <span className="text-xs font-mono font-bold text-text-secondary w-10 text-center">{zoom}%</span>
            <Button size="icon" variant="outline" onClick={handleZoomIn} className="rounded-xl w-9 h-9">
              <ZoomIn className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-2">
            <Button
              onClick={runAISummarize}
              className="bg-indigo-50 dark:bg-indigo-950/40 text-primary hover:bg-indigo-100 dark:hover:bg-indigo-950/60 font-bold text-xs gap-1.5 px-3 py-2 h-9 rounded-xl border border-indigo-100 dark:border-indigo-900/40"
            >
              <Sparkles className="w-3.5 h-3.5" />
              AI Analyze
            </Button>
            
            <Button size="icon" variant="outline" onClick={handleDownload} className="rounded-xl w-9 h-9">
              <Download className="w-4 h-4" />
            </Button>
          </div>
        </div>

        {/* Interactive Real Document Viewer Canvas */}
        <div className="overflow-auto border border-border bg-slate-100 dark:bg-slate-900 rounded-3xl p-4 flex justify-center items-center shadow-inner min-h-[500px]">
          {isImage ? (
            <div 
              style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'center center' }}
              className="transition-transform duration-200"
            >
              <img 
                src={fileUrl} 
                alt={doc.name} 
                className="max-w-full max-h-[70vh] rounded-2xl shadow-lg border border-border" 
                onError={(e) => {
                  (e.target as HTMLImageElement).src = 'https://images.unsplash.com/photo-1586075010923-2dd4570fb338?w=500';
                }}
              />
            </div>
          ) : isPdf ? (
            <iframe 
              src={fileUrl} 
              className="w-full min-h-[600px] border-0 rounded-2xl shadow-lg" 
              title={doc.name}
            />
          ) : (
            <div className="text-center py-12 space-y-4">
              <FileText className="w-16 h-16 mx-auto text-text-secondary opacity-50" />
              <p className="text-sm font-semibold text-text-primary">Preview not supported for this file type</p>
              <Button onClick={handleDownload} className="bg-primary text-white rounded-xl">
                <Download className="w-4 h-4 mr-2" /> Download File
              </Button>
            </div>
          )}
        </div>

      </div>

      {/* AI Extraction Analyzer Modal */}
      <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
        <DialogContent className="max-w-md rounded-3xl p-6 bg-card border-border">
          <DialogHeader className="text-left">
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Bot className="w-5 h-5 text-primary" />
              AI DocuScan Summary
            </DialogTitle>
            <DialogDescription className="text-xs text-text-secondary">
              Parameters extracted from the file structure using OCR + GPT-4o.
            </DialogDescription>
          </DialogHeader>

          {isAnalyzing ? (
            <div className="py-10 space-y-6 flex flex-col items-center justify-center">
              <motion.div 
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                className="text-primary p-3 bg-indigo-50 dark:bg-indigo-950/50 rounded-full"
              >
                <RefreshCw className="w-8 h-8" />
              </motion.div>
              
              <div className="space-y-2 text-center w-full max-w-[280px]">
                <p className="text-xs font-bold text-text-primary h-5">
                  {['Scanning PDF structure...', 'Executing text extraction...', 'Analyzing with GPT-4o...', 'Summarizing details...'][analysisStep % 4]}
                </p>
                <Progress value={(analysisStep + 1) * 20} className="h-1.5 rounded-full" />
              </div>
            </div>
          ) : (
            <div className="space-y-4 pt-2">
              {analysisResult && (
                <>
                  {/* Extracted Fields Table */}
                  <div className="rounded-2xl border border-slate-100 dark:border-slate-800/80 bg-slate-50/50 dark:bg-slate-900/30 overflow-hidden divide-y divide-slate-100 dark:divide-slate-800/80">
                    <div className="p-3 grid grid-cols-2 text-xs">
                      <span className="text-text-secondary">Lender Organization</span>
                      <span className="font-bold text-text-primary text-right">{analysisResult.lender}</span>
                    </div>
                    {analysisResult.loanAmount && (
                      <div className="p-3 grid grid-cols-2 text-xs">
                        <span className="text-text-secondary">Principal Amount</span>
                        <span className="font-bold text-text-primary text-right">₹{analysisResult.loanAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {analysisResult.disbursedAmount && (
                      <div className="p-3 grid grid-cols-2 text-xs">
                        <span className="text-text-secondary">Disbursed Amount</span>
                        <span className="font-bold text-text-primary text-right">₹{analysisResult.disbursedAmount.toLocaleString('en-IN')}</span>
                      </div>
                    )}
                    {analysisResult.interestRate && (
                      <div className="p-3 grid grid-cols-2 text-xs">
                        <span className="text-text-secondary">Interest Rate</span>
                        <span className="font-bold text-text-primary text-right">{analysisResult.interestRate}% p.a.</span>
                      </div>
                    )}
                    {analysisResult.tenure && (
                      <div className="p-3 grid grid-cols-2 text-xs">
                        <span className="text-text-secondary">Loan Tenure</span>
                        <span className="font-bold text-text-primary text-right">{analysisResult.tenure} Months</span>
                      </div>
                    )}
                    {analysisResult.moratoriumPeriod && (
                      <div className="p-3 grid grid-cols-2 text-xs">
                        <span className="text-text-secondary">Moratorium Period</span>
                        <span className="font-bold text-text-primary text-right">{analysisResult.moratoriumPeriod}</span>
                      </div>
                    )}
                  </div>

                  {/* Bullet Bullet Extractions */}
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Key Clauses Found</span>
                    <div className="space-y-2 max-h-[140px] overflow-y-auto pr-1">
                      {analysisResult.extractions.map((ext: string, idx: number) => (
                        <div key={idx} className="flex gap-2 items-start text-xs text-text-secondary bg-slate-50 dark:bg-slate-900/30 p-2.5 rounded-xl border border-slate-100/50 dark:border-slate-900/50">
                          <CheckCircle className="w-4 h-4 text-emerald-500 flex-shrink-0 mt-0.5" />
                          <span>{ext}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Accept or close */}
                  <div className="flex gap-2 pt-2">
                    <Button 
                      onClick={() => setIsModalOpen(false)}
                      className="flex-1 bg-primary hover:bg-primary-light text-white rounded-xl py-4 text-xs font-bold"
                    >
                      Done / Close
                    </Button>
                  </div>
                </>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </AppShell>
  );
};

// Simple Fallback Icons for fallback logic
const AlertCircleIcon = (props: any) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" {...props}>
    <circle cx="12" cy="12" r="10" />
    <line x1="12" y1="8" x2="12" y2="12" />
    <line x1="12" y1="16" x2="12.01" y2="16" />
  </svg>
);

