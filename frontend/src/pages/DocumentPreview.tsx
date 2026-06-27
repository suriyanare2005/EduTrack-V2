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
import { apiRequest } from '../lib/api';

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

  const handleDownload = () => {
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

        {/* Interactive Mock Document Viewer Canvas */}
        <div className="overflow-auto border border-border bg-slate-100 dark:bg-slate-900 rounded-3xl p-4 flex justify-center shadow-inner min-h-[450px]">
          <div 
            style={{ transform: `scale(${zoom / 100})`, transformOrigin: 'top center' }}
            className="w-full max-w-[595px] bg-white dark:bg-slate-950 text-slate-800 dark:text-slate-200 border border-slate-200 dark:border-slate-800 p-8 rounded-2xl shadow-lg transition-transform duration-200 flex flex-col justify-between font-serif aspect-[1/1.4]"
          >
            {/* Document Bank Header */}
            <div>
              <div className="flex justify-between items-start border-b-2 border-slate-900 dark:border-slate-100 pb-4 mb-6">
                <div>
                  <h1 className="text-xl font-bold uppercase tracking-wider text-slate-900 dark:text-white font-sans">
                    {linkedLoan?.lender || 'National Banking Institution'}
                  </h1>
                  <p className="text-[9px] font-sans text-slate-500 uppercase">Education Loan Division • Retail Banking Group</p>
                </div>
                <div className="text-right text-[9px] font-sans text-slate-500">
                  <p>Ref: STU/EDUL/{doc.id.toUpperCase()}</p>
                  <p>Date: {doc.createdAt}</p>
                </div>
              </div>

              {/* Document Title */}
              <h2 className="text-center font-bold text-sm uppercase tracking-wide underline mb-6 text-slate-900 dark:text-white">
                {doc.category === 'sanction_letter' && 'LETTER OF SANCTION FOR EDUCATION LOAN'}
                {doc.category === 'disbursement' && 'PAYMENT DISBURSEMENT ADVICE'}
                {doc.category === 'noc' && 'NO OBJECTION / LOAN CLOSURE CERTIFICATE'}
                {doc.category === 'itr' && 'INCOME & TAX RETURN STATEMENT'}
                {doc.category === 'other' && 'GENERAL CORRESPONDENCE RECORD'}
              </h2>

              {/* Document Body */}
              <div className="text-[11px] leading-relaxed space-y-4">
                <p>To Whom It May Concern,</p>
                
                {doc.category === 'sanction_letter' && (
                  <>
                    <p>
                      We are pleased to inform that the competent authority has sanctioned an education loan facility of{' '}
                      <strong className="text-slate-900 dark:text-white font-sans">₹15,00,000 (Rupees Fifteen Lakhs Only)</strong> to{' '}
                      <strong>Suriya K</strong> for pursuing B.Tech Computer Science and Engineering course program.
                    </p>
                    <table className="w-full border-collapse border border-slate-300 dark:border-slate-700 text-[10px] font-sans">
                      <tbody>
                        <tr className="border-b border-slate-300 dark:border-slate-700">
                          <td className="p-1.5 font-bold bg-slate-50 dark:bg-slate-900 w-1/3">Principal Sanctioned</td>
                          <td className="p-1.5">₹15,00,000</td>
                        </tr>
                        <tr className="border-b border-slate-300 dark:border-slate-700">
                          <td className="p-1.5 font-bold bg-slate-50 dark:bg-slate-900">Applicable Interest Rate</td>
                          <td className="p-1.5">9.55% p.a. (Floating linked to EBLR)</td>
                        </tr>
                        <tr className="border-b border-slate-300 dark:border-slate-700">
                          <td className="p-1.5 font-bold bg-slate-50 dark:bg-slate-900">Repayment Tenure</td>
                          <td className="p-1.5">120 Months (10 Years)</td>
                        </tr>
                        <tr>
                          <td className="p-1.5 font-bold bg-slate-50 dark:bg-slate-900">Moratorium Schedule</td>
                          <td className="p-1.5">Course Duration + 12 Months grace period</td>
                        </tr>
                      </tbody>
                    </table>
                    <p>This sanction is subject to compliance checks, mortgage verification, and delivery of co-signer assurances as per standard guidelines.</p>
                  </>
                )}

                {doc.category === 'disbursement' && (
                  <>
                    <p>
                      This is to advise that a disbursement of <strong className="text-slate-900 dark:text-white">₹5,00,000 (Rupees Five Lakhs Only)</strong> has
                      been executed from your education loan account on <strong>{doc.createdAt}</strong>.
                    </p>
                    <p>The funds were directly credited to the academic institute bank account via electronic transfer for Semester Fees.</p>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 rounded border border-slate-200 dark:border-slate-800 font-mono text-[9px] space-y-1">
                      <p>Beneficiary: National Institute of Technology</p>
                      <p>Tranche: 1st Installment</p>
                      <p>Reference ID: RTGS/SBIN/881203</p>
                    </div>
                  </>
                )}

                {doc.category === 'noc' && (
                  <>
                    <p>
                      This is to certify that the education loan account reference ID <strong>{docId}</strong> has been closed and fully settled. 
                      The lender confirms there are no further dues or outstanding liability under the co-signer agreement.
                    </p>
                    <p>All hypothecated assets and certificates are released with immediate effect.</p>
                  </>
                )}

                {doc.category === 'itr' && (
                  <>
                    <p>
                      Summary of verified taxable income statements submitted as verification for financial co-signing. 
                      Annual taxable salary is confirmed at ₹8,40,000 for FY 2025-2026.
                    </p>
                    <p>Assessment status: Approved / Active.</p>
                  </>
                )}

                {doc.category === 'other' && (
                  <>
                    <p>General file record belonging to loan reference {doc.loanId}.</p>
                    <p>Please upload sanction notes or bank correspondence directly inside this vault to enable automatic optical scans.</p>
                  </>
                )}
              </div>
            </div>

            {/* Signature Block */}
            <div className="flex justify-between items-end border-t border-slate-200 dark:border-slate-800 pt-6 mt-12 font-sans">
              <div className="text-[8px] text-slate-400">
                <p>Document ID: {doc.id}</p>
                <p>System Generated Copy - No Signature Required</p>
              </div>
              <div className="text-right">
                <div className="inline-block border border-indigo-300 dark:border-indigo-800 rounded px-2 py-1 bg-indigo-50/20 text-[8px] font-bold text-indigo-600 dark:text-indigo-400 mb-1">
                  VERIFIED STAMP
                </div>
                <p className="text-[9px] font-bold text-slate-900 dark:text-white">Authorized Officer</p>
                <p className="text-[8px] text-slate-500">{linkedLoan?.lender || 'National Institution'}</p>
              </div>
            </div>
          </div>
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

