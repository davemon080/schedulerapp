import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  HelpCircle,
  ChevronLeft,
  Search,
  MessageSquare,
  Phone,
  Mail,
  MapPin,
  Clock,
  Send,
  CheckCircle2,
  AlertCircle,
  FileQuestion,
  Headphones,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  LifeBuoy,
  CornerDownRight,
  ShieldCheck,
} from 'lucide-react';
import { UserSession, SupportTicket, LevelAdvisorInfo } from '../types';
import { submitSupportTicket, fetchStudentSupportTickets, fetchLevelAdvisor } from '../lib/dbService';

interface SupportPageProps {
  onBack: () => void;
  userSession: UserSession | null;
  onOpenAdvisorModal?: () => void;
}

interface FaqItem {
  id: string;
  category: 'academic' | 'wallet' | 'materials' | 'session' | 'general';
  question: string;
  answer: string;
}

const FAQS: FaqItem[] = [
  {
    id: 'faq-1',
    category: 'academic',
    question: 'How do I unlock and activate my current semester timetable?',
    answer:
      'Semester access can be unlocked directly from your Wallet page using your wallet balance (₦1,500 per semester). Course Representatives and Administrators receive automatic free access. Once unlocked, all timetable schedules, lecture updates, and assignment submission channels are instantly accessible.',
  },
  {
    id: 'faq-2',
    category: 'wallet',
    question: 'How do I top up my campus wallet balance?',
    answer:
      'Navigate to your Profile -> Wallet -> Fund Wallet. Enter your desired top-up amount and proceed with our instant Paystack payment gateway (supporting Nigerian Debit Cards, Bank Transfer, USSD, and Apple Pay). Your wallet balance updates in real time upon successful authorization.',
  },
  {
    id: 'faq-3',
    category: 'materials',
    question: 'How do I download lecture notes and course PDF syllabi?',
    answer:
      'Go to the Modules tab on your navigation bar, select any registered chemistry course (e.g. CHM 101, ICH 292), and tap on "Download / View PDF" under the Course Materials section. All official departmental course modules and past questions can be viewed in our embedded reader or downloaded directly to your device.',
  },
  {
    id: 'faq-4',
    category: 'session',
    question: 'Why does the app log me out when logging in on another phone or computer?',
    answer:
      'For academic integrity and account security, simultaneous multi-device logins are restricted. When you log into your student account on a new phone or laptop, your previous active session is automatically terminated and secured.',
  },
  {
    id: 'faq-5',
    category: 'academic',
    question: 'Who is my Departmental Level Advisor and when are consultation hours?',
    answer:
      'Your assigned Level Advisor provides academic counseling, course registration endorsement, and grade reviews. You can view their office location, direct contact extension, and weekly walk-in consultation hours right on your Profile page or through the Level Advisor card.',
  },
  {
    id: 'faq-6',
    category: 'wallet',
    question: 'Can I transfer funds from my wallet to a fellow coursemate?',
    answer:
      'Yes! Use the "Send to Coursemate" feature inside your Wallet. Simply enter your classmate’s registered email or matriculation number and the amount. Funds are credited immediately with zero transaction fees and an instant digital receipt is generated.',
  },
];

export const SupportPage: React.FC<SupportPageProps> = ({
  onBack,
  userSession,
  onOpenAdvisorModal,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedFaqId, setExpandedFaqId] = useState<string | null>('faq-1');
  const [activeTab, setActiveTab] = useState<'faqs' | 'ticket' | 'my_tickets'>('faqs');

  // Level Advisor State
  const [advisor, setAdvisor] = useState<LevelAdvisorInfo | null>(null);

  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState<'academic' | 'timetable' | 'wallet' | 'materials' | 'session' | 'other'>('academic');
  const [ticketPriority, setTicketPriority] = useState<'low' | 'medium' | 'high' | 'urgent'>('medium');
  const [ticketSubject, setTicketSubject] = useState('');
  const [ticketMessage, setTicketMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState<SupportTicket | null>(null);

  // My Tickets List
  const [myTickets, setMyTickets] = useState<SupportTicket[]>([]);
  const [isLoadingTickets, setIsLoadingTickets] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

  useEffect(() => {
    fetchLevelAdvisor(userSession?.department_id || 'dept-ich', userSession?.level || 100).then(setAdvisor);
  }, [userSession]);

  useEffect(() => {
    if (userSession?.email && activeTab === 'my_tickets') {
      setIsLoadingTickets(true);
      fetchStudentSupportTickets(userSession.email)
        .then(setMyTickets)
        .finally(() => setIsLoadingTickets(false));
    }
  }, [userSession, activeTab]);

  const handleCopy = (text: string, label: string) => {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  const handleTicketSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketMessage.trim()) return;

    setIsSubmitting(true);
    try {
      const studentId = userSession?.uid || userSession?.id || 'usr_student';
      const studentName = userSession?.fullName || 'Student';
      const studentEmail = userSession?.email || 'student@university.edu';
      const matricNumber = userSession?.matricNumber || '2025/PS/ICH/0001';

      const result = await submitSupportTicket({
        studentId,
        studentName,
        studentEmail,
        matricNumber,
        category: ticketCategory,
        subject: ticketSubject.trim(),
        message: ticketMessage.trim(),
        priority: ticketPriority,
      });

      setTicketSuccess(result);
      setTicketSubject('');
      setTicketMessage('');
      setMyTickets((prev) => [result, ...prev]);
    } catch (err) {
      console.error('Failed to submit ticket:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredFaqs = FAQS.filter((faq) => {
    const matchesCategory = selectedCategory === 'all' || faq.category === selectedCategory;
    const matchesSearch =
      !searchQuery.trim() ||
      faq.question.toLowerCase().includes(searchQuery.toLowerCase()) ||
      faq.answer.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  return (
    <div className="min-h-screen text-slate-900 pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-[#F2F2F7]/95 backdrop-blur-md px-4 sm:px-6 py-3.5 flex items-center justify-between border-b border-black/5">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white/80 hover:bg-white text-slate-700 shadow-2xs border border-black/5 flex items-center justify-center active:scale-95 transition-all cursor-pointer"
            aria-label="Back to Profile"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Support</h1>
            <p className="text-[11.5px] text-[#8E8E93]">Helpdesk &amp; Inquiries</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-full bg-blue-500/10 text-[#007AFF] flex items-center justify-center border border-blue-400/20">
            <Headphones className="w-4 h-4" />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Navigation Tabs - Direct on App */}
        <div className="flex border-b border-black/10 pb-0.5 gap-6">
          <button
            type="button"
            onClick={() => {
              setActiveTab('faqs');
              setTicketSuccess(null);
            }}
            className={`pb-2.5 text-[14px] font-bold transition-all cursor-pointer relative ${
              activeTab === 'faqs'
                ? 'text-[#007AFF]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Knowledge Base</span>
            {activeTab === 'faqs' && (
              <motion.div
                layoutId="supportTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#007AFF] rounded-full"
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ticket');
              setTicketSuccess(null);
            }}
            className={`pb-2.5 text-[14px] font-bold transition-all cursor-pointer relative ${
              activeTab === 'ticket'
                ? 'text-[#007AFF]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>Submit Ticket</span>
            {activeTab === 'ticket' && (
              <motion.div
                layoutId="supportTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#007AFF] rounded-full"
              />
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('my_tickets');
              setTicketSuccess(null);
            }}
            className={`pb-2.5 text-[14px] font-bold transition-all cursor-pointer relative ${
              activeTab === 'my_tickets'
                ? 'text-[#007AFF]'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <span>My Tickets {myTickets.length > 0 && `(${myTickets.length})`}</span>
            {activeTab === 'my_tickets' && (
              <motion.div
                layoutId="supportTabIndicator"
                className="absolute bottom-0 left-0 right-0 h-[2.5px] bg-[#007AFF] rounded-full"
              />
            )}
          </button>
        </div>

        {/* TAB 1: FAQS & KNOWLEDGE BASE */}
        {activeTab === 'faqs' && (
          <div className="space-y-6">
            {/* Quick Contact Rows - Direct without containers */}
            <div className="space-y-3 pb-2 border-b border-black/10">
              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0">
                    <UserCheck className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-[#007AFF] uppercase tracking-wider block">
                      Level Advisor
                    </span>
                    <h4 className="text-[14px] font-bold text-[#1C1C1E] truncate">
                      {advisor?.name || 'Prof. A. Adeleke'}
                    </h4>
                  </div>
                </div>
                {onOpenAdvisorModal && (
                  <button
                    type="button"
                    onClick={onOpenAdvisorModal}
                    className="px-3 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#007AFF] text-[12px] font-bold transition-colors cursor-pointer"
                  >
                    View Details
                  </button>
                )}
              </div>

              <div className="flex items-center justify-between py-1">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-9 h-9 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Mail className="w-4.5 h-4.5" />
                  </div>
                  <div className="min-w-0">
                    <span className="text-[11px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Email Desk
                    </span>
                    <h4 className="text-[14px] font-bold text-[#1C1C1E] truncate">
                      support.chem@university.edu
                    </h4>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('support.chem@university.edu', 'email')}
                  className="px-3 py-1.5 rounded-full bg-black/5 hover:bg-black/10 text-slate-700 text-[12px] font-bold transition-colors flex items-center gap-1.5 cursor-pointer"
                >
                  {copiedText === 'email' ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                      <span className="text-emerald-700">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5" />
                      <span>Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Search Bar - Direct on App */}
            <div className="relative">
              <Search className="w-4.5 h-4.5 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs, timetables, wallet issues..."
                className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white/70 focus:bg-white border border-black/10 text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/30 transition-all font-medium"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 rounded-full bg-slate-200 text-slate-600 flex items-center justify-center text-[10px] font-bold cursor-pointer"
                >
                  ✕
                </button>
              )}
            </div>

            {/* Filter Categories - Direct Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: 'All FAQs' },
                { id: 'academic', label: 'Timetable & Clashes' },
                { id: 'wallet', label: 'Wallet & Access' },
                { id: 'materials', label: 'Course PDFs' },
                { id: 'session', label: 'Security & Logins' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-[#007AFF] text-white shadow-xs'
                      : 'bg-white/60 text-slate-600 border border-black/5 hover:bg-white'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* FAQ Accordion List - Direct on Page with Dividers */}
            <div className="divide-y divide-black/10">
              {filteredFaqs.length === 0 ? (
                <div className="py-12 text-center space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-[14px] font-bold text-slate-700">No matching questions found</p>
                  <p className="text-[12px] text-slate-400">
                    Try searching with another keyword or submit a direct ticket to our helpdesk.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ticket')}
                    className="mt-2 px-4 py-2 rounded-2xl bg-blue-50 text-[#007AFF] text-[12.5px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Submit a Ticket
                  </button>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <div key={faq.id} className="py-3.5">
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full text-left flex items-start justify-between gap-3 cursor-pointer select-none group"
                      >
                        <span className="text-[14px] font-bold text-slate-900 group-hover:text-[#007AFF] transition-colors leading-snug">
                          {faq.question}
                        </span>
                        <div className="w-6 h-6 rounded-full bg-black/5 group-hover:bg-blue-50 text-slate-500 group-hover:text-[#007AFF] flex items-center justify-center shrink-0 mt-0.5 transition-colors">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{ duration: 0.2 }}
                            className="pt-2 text-[13px] text-slate-600 font-normal leading-relaxed overflow-hidden"
                          >
                            <p>{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUBMIT A TICKET - DIRECT ON APP */}
        {activeTab === 'ticket' && (
          <div className="space-y-5">
            {ticketSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="py-8 text-center space-y-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto border border-emerald-200">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase">
                    Ref: #{ticketSuccess.id}
                  </span>
                  <h3 className="text-[18px] font-extrabold text-[#1C1C1E] mt-2.5">
                    Ticket Submitted Successfully
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto leading-relaxed">
                    Your inquiry regarding <strong className="text-slate-800 font-semibold">"{ticketSuccess.subject}"</strong> has been logged in the departmental queue.
                  </p>
                </div>

                <div className="pt-3 flex flex-col sm:flex-row gap-2.5 justify-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('my_tickets')}
                    className="px-6 py-3 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white text-[13px] font-bold transition-all cursor-pointer shadow-md shadow-blue-500/25 active:scale-98"
                  >
                    View My Tickets
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketSuccess(null)}
                    className="px-6 py-3 rounded-2xl bg-black/5 hover:bg-black/10 text-slate-700 text-[13px] font-bold transition-colors cursor-pointer"
                  >
                    Submit Another
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="space-y-4">
                <div className="border-b border-black/10 pb-3">
                  <h3 className="text-[16px] font-bold text-[#1C1C1E]">Submit Support Ticket</h3>
                  <p className="text-[12px] text-slate-500">
                    Report schedule clashes, payment inquiries, or academic requests directly.
                  </p>
                </div>

                <div className="space-y-4 text-xs">
                  {/* Category Selector */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-[12.5px]">
                      Issue Category
                    </label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value as any)}
                      className="w-full px-3.5 py-3 rounded-2xl border border-black/10 bg-white/70 text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none cursor-pointer text-[13px]"
                    >
                      <option value="academic">Academic &amp; Course Registration</option>
                      <option value="timetable">Timetable &amp; Lecture Clashes</option>
                      <option value="wallet">Wallet, Payments &amp; Access Key</option>
                      <option value="materials">Course Materials &amp; PDF Downloads</option>
                      <option value="session">Account Access &amp; Device Session</option>
                      <option value="other">General Department Inquiry</option>
                    </select>
                  </div>

                  {/* Priority Selector */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-[12.5px]">
                      Urgency / Priority
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'low', label: 'Normal' },
                        { id: 'medium', label: 'High Priority' },
                        { id: 'urgent', label: 'Critical / Urgent' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setTicketPriority(p.id as any)}
                          className={`py-2.5 rounded-2xl text-center font-bold text-[12px] border transition-all cursor-pointer ${
                            ticketPriority === p.id
                              ? 'bg-blue-50/90 border-blue-500 text-blue-700 shadow-xs'
                              : 'bg-white/60 text-slate-600 border-black/10 hover:bg-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject Input */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-[12.5px]">
                      Subject
                    </label>
                    <input
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. Schedule clash between CHM 101 and PHY 107"
                      className="w-full px-3.5 py-3 rounded-2xl border border-black/10 bg-white/70 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none text-[13px]"
                    />
                  </div>

                  {/* Message Description */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1.5 text-[12.5px]">
                      Detailed Description
                    </label>
                    <textarea
                      required
                      rows={4}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Describe the issue in detail (include dates, course codes, or transaction references)..."
                      className="w-full px-3.5 py-3 rounded-2xl border border-black/10 bg-white/70 text-slate-900 font-normal focus:bg-white focus:ring-2 focus:ring-blue-500/30 outline-none resize-none leading-relaxed text-[13px]"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3.5 rounded-2xl bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white text-[14px] font-bold transition-all cursor-pointer shadow-md shadow-blue-500/25 flex items-center justify-center gap-2 active:scale-98"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting Ticket...' : 'Send Support Ticket'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: MY TICKETS - DIRECT ON APP */}
        {activeTab === 'my_tickets' && (
          <div className="space-y-4">
            {isLoadingTickets ? (
              <div className="py-12 text-center text-slate-400">
                <Clock className="w-6 h-6 animate-spin mx-auto text-[#007AFF] mb-2" />
                <p className="text-xs font-semibold">Loading ticket history...</p>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="py-12 text-center space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-[14px] font-bold text-slate-800">No Tickets Logged Yet</h4>
                <p className="text-[12px] text-slate-400 max-w-xs mx-auto">
                  When you submit inquiries or issue reports, their live resolution status will appear here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('ticket')}
                  className="mt-2 px-5 py-2.5 rounded-2xl bg-[#007AFF] text-white text-[12.5px] font-bold hover:bg-blue-600 transition-colors cursor-pointer shadow-xs"
                >
                  Create First Ticket
                </button>
              </div>
            ) : (
              <div className="divide-y divide-black/10">
                {myTickets.map((t) => (
                  <div key={t.id} className="py-4 space-y-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-black/5 text-slate-600">
                            #{t.id}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full uppercase ${
                              t.status === 'resolved'
                                ? 'bg-emerald-100 text-emerald-700'
                                : t.status === 'in_progress'
                                ? 'bg-amber-100 text-amber-700'
                                : 'bg-blue-100 text-blue-700'
                            }`}
                          >
                            {t.status === 'resolved' ? 'Resolved' : t.status === 'in_progress' ? 'In Review' : 'Open Ticket'}
                          </span>
                        </div>
                        <h4 className="text-[14.5px] font-bold text-[#1C1C1E] mt-1.5">{t.subject}</h4>
                      </div>
                      <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{t.createdAt}</span>
                    </div>

                    <p className="text-[13px] text-slate-600 leading-relaxed font-normal">
                      {t.message}
                    </p>

                    {t.response && (
                      <div className="pl-3.5 border-l-2 border-[#007AFF] py-1 space-y-1">
                        <div className="flex items-center justify-between text-[11px] font-bold text-[#007AFF]">
                          <span className="flex items-center gap-1">
                            <CornerDownRight className="w-3.5 h-3.5" />
                            <span>Staff Response ({t.respondedBy || 'Admin'})</span>
                          </span>
                          <span className="text-slate-400 font-normal">{t.respondedAt}</span>
                        </div>
                        <p className="text-[12.5px] text-slate-800 leading-relaxed font-medium">
                          {t.response}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};
