import React, { useState, useRef, useEffect } from 'react';
import { AppShell } from '../components/layout/AppShell';
import { useLoansStore } from '../store/useLoansStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Send, Bot, User, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { apiRequest } from '../lib/api';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

export const Assistant: React.FC = () => {
  const loans = useLoansStore((state) => state.loans);

  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'init-msg',
      sender: 'assistant',
      text: "Hello! I'm your EduTrack AI Assistant. I have analyzed your loan profile and am ready to help you optimize your repayment schedule.\n\nYou can ask me questions about prepayments, interest calculations during the moratorium, or seek advice on which loan to pay off first.",
      timestamp: new Date()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Suggestions based on active user loans
  const suggestions = [
    "How is moratorium interest calculated?",
    "Should I pay off SBI or HDFC first?",
    "Calculate interest savings for ₹10,000 monthly prepayments",
    "Explain simple vs compound interest"
  ];

  // Auto-scroll to bottom of chat
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  const handleSendMessage = async (text: string) => {
    if (!text.trim()) return;

    const userMsg: Message = {
      id: `msg-${Math.random().toString(36).substr(2, 9)}`,
      sender: 'user',
      text: text,
      timestamp: new Date()
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputValue('');
    setIsTyping(true);

    try {
      // Map historical dialog messages to Pydantic ChatMessage schema
      const chatHistory = [...messages, userMsg].map((msg) => ({
        role: msg.sender === 'user' ? 'user' : 'assistant',
        content: msg.text,
      }));

      const response = await apiRequest<{ role: string; content: string }>('/api/ai/chat', {
        method: 'POST',
        body: JSON.stringify({ messages: chatHistory }),
      });

      const assistantMsg: Message = {
        id: `msg-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'assistant',
        text: response.content,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMsg]);
    } catch (err: any) {
      const errorMsg: Message = {
        id: `msg-err-${Math.random().toString(36).substr(2, 9)}`,
        sender: 'assistant',
        text: err.message || 'Sorry, I encountered an issue connecting to the AI service. Please make sure your server is online.',
        timestamp: new Date(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <AppShell title="AI Loan Assistant" showBack={true} hideBottomNav={true}>
      <div className="flex flex-col h-[calc(100vh-68px)] max-w-md mx-auto relative">
        
        {/* Context Header */}
        <div className="bg-card border-b border-border px-4 py-3 flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/40 text-primary rounded-xl">
              <Bot className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs font-bold text-text-primary block">EduTrack Financial Coach</span>
              <div className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                <span className="text-[10px] text-text-secondary">Analyzing {loans.length} active loans</span>
              </div>
            </div>
          </div>
          <Badge variant="outline" className="text-[9px] font-mono border-indigo-100 dark:border-indigo-950 text-primary">
            GPT-4o Secure
          </Badge>
        </div>

        {/* Chat Messages Feed */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 scrollbar-none">
          <div className="text-center py-2">
            <span className="text-[9px] text-text-secondary font-mono bg-slate-50 dark:bg-slate-900 px-2.5 py-1 rounded-full border border-border">
              Secure AI Counseling Session
            </span>
          </div>

          <AnimatePresence initial={false}>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                className={`flex gap-2.5 max-w-[85%] ${
                  msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
                }`}
              >
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-white ${
                  msg.sender === 'user' 
                    ? 'bg-emerald-600' 
                    : 'bg-primary'
                }`}>
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                </div>

                {/* Bubble */}
                <div className={`p-3.5 rounded-2xl text-xs leading-relaxed ${
                  msg.sender === 'user'
                    ? 'bg-primary text-white rounded-tr-none'
                    : 'bg-card border border-border text-text-primary rounded-tl-none shadow-sm whitespace-pre-line'
                }`}>
                  {msg.text}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>

          {/* Typing Indicator */}
          {isTyping && (
            <div className="flex gap-2.5 max-w-[85%]">
              <div className="w-8 h-8 rounded-xl bg-primary text-white flex items-center justify-center flex-shrink-0">
                <Bot className="w-4 h-4" />
              </div>
              <div className="p-3.5 bg-card border border-border rounded-2xl rounded-tl-none flex items-center gap-1.5">
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                <span className="w-2 h-2 bg-slate-400 dark:bg-slate-500 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Suggestion Chips */}
        {messages.length === 1 && (
          <div className="px-4 py-2 space-y-2 border-t border-border bg-slate-50/50 dark:bg-slate-900/10">
            <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider block">Suggested Questions</span>
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
              {suggestions.map((sug, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSendMessage(sug)}
                  className="px-3 py-2 bg-card hover:bg-slate-50 dark:hover:bg-slate-900 border border-border rounded-xl text-[10px] font-semibold text-text-primary whitespace-nowrap flex items-center gap-1 transition-all duration-200"
                >
                  {sug}
                  <ArrowRight className="w-3 h-3 text-text-secondary" />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Input Dock */}
        <div className="p-4 border-t border-border bg-card">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSendMessage(inputValue);
            }}
            className="flex gap-2 items-center"
          >
            <Input
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              placeholder="Ask about prepayment schedules..."
              className="rounded-xl bg-slate-50 dark:bg-slate-900 border-border h-11 text-xs"
              disabled={isTyping}
            />
            <Button
              type="submit"
              disabled={!inputValue.trim() || isTyping}
              size="icon"
              className="w-11 h-11 bg-primary hover:bg-primary-light text-white rounded-xl flex-shrink-0"
            >
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>

      </div>
    </AppShell>
  );
};
export default Assistant;

