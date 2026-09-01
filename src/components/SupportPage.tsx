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
  Sparkles,
  ExternalLink,
  ShieldCheck,
  Headphones,
  UserCheck,
  ChevronDown,
  ChevronUp,
  Tag,
  Copy,
  Check,
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
    <div className="min-h-screen bg-[#F2F2F7] text-slate-900 pb-28">
      {/* Top Sticky Header */}
      <header className="sticky top-0 z-30 bg-[#F2F2F7]/90 backdrop-blur-md border-b border-black/5 px-4 sm:px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onBack}
            className="w-9 h-9 rounded-full bg-white text-slate-700 shadow-2xs border border-black/5 flex items-center justify-center hover:bg-slate-50 active:scale-95 transition-all cursor-pointer"
            aria-label="Back to Profile"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight flex items-center gap-1.5">
              <span>Help &amp; Support</span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 font-mono">
                24/7 Desk
              </span>
            </h1>
            <p className="text-[11px] text-slate-500 font-medium">Departmental Helpdesk &amp; FAQs</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          <div className="w-8 h-8 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center">
            <Headphones className="w-4 h-4" />
          </div>
        </div>
      </header>

      <main className="max-w-xl mx-auto px-4 sm:px-6 pt-4 space-y-4">
        {/* Navigation Tabs */}
        <div className="flex p-1 bg-black/5 rounded-2xl gap-1">
          <button
            type="button"
            onClick={() => {
              setActiveTab('faqs');
              setTicketSuccess(null);
            }}
            className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'faqs'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <FileQuestion className="w-3.5 h-3.5" />
            <span>Knowledge Base</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('ticket');
              setTicketSuccess(null);
            }}
            className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'ticket'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <Send className="w-3.5 h-3.5" />
            <span>Submit Ticket</span>
          </button>
          <button
            type="button"
            onClick={() => {
              setActiveTab('my_tickets');
              setTicketSuccess(null);
            }}
            className={`flex-1 py-2 rounded-xl text-[12.5px] font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
              activeTab === 'my_tickets'
                ? 'bg-white text-slate-900 shadow-xs'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <MessageSquare className="w-3.5 h-3.5" />
            <span>My Tickets</span>
          </button>
        </div>

        {/* TAB 1: FAQS & KNOWLEDGE BASE */}
        {activeTab === 'faqs' && (
          <div className="space-y-4">
            {/* Quick Contact Cards Carousel / Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Level Advisor Quick Card */}
              <div
                onClick={onOpenAdvisorModal}
                className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs hover:border-blue-300 hover:shadow-xs transition-all cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#007AFF] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10.5px] font-bold text-[#007AFF] uppercase tracking-wider block">
                      Level Advisor
                    </span>
                    <h4 className="text-[13.5px] font-bold text-slate-900 truncate">
                      {advisor?.name || 'Prof. A. Adeleke'}
                    </h4>
                    <p className="text-[11px] text-slate-500 truncate">
                      {advisor?.officeLocation || 'Science Block B, Rm 304'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Department Helpdesk Email Card */}
              <div className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs flex items-center justify-between">
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                    <Mail className="w-5 h-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <span className="text-[10.5px] font-bold text-emerald-600 uppercase tracking-wider block">
                      Email Desk
                    </span>
                    <h4 className="text-[13.5px] font-bold text-slate-900 truncate">
                      support.chem@edu
                    </h4>
                    <p className="text-[11px] text-slate-500">Official Queries</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy('support.chem@university.edu', 'email')}
                  className="p-2 rounded-xl bg-slate-50 text-slate-600 hover:bg-slate-100 transition-colors text-xs font-semibold cursor-pointer shrink-0"
                  title="Copy email"
                >
                  {copiedText === 'email' ? <Check className="w-3.5 h-3.5 text-emerald-600" /> : <Copy className="w-3.5 h-3.5" />}
                </button>
              </div>
            </div>

            {/* Search Bar */}
            <div className="relative">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search FAQs, timetables, wallet issues..."
                className="w-full pl-10 pr-4 py-3 rounded-2xl bg-white border border-black/5 shadow-2xs text-[13.5px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all font-medium"
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

            {/* Filter Categories */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {[
                { id: 'all', label: 'All FAQs' },
                { id: 'academic', label: 'Semester & Timetable' },
                { id: 'wallet', label: 'Wallet & Fees' },
                { id: 'materials', label: 'Course PDFs' },
                { id: 'session', label: 'Security & Devices' },
              ].map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setSelectedCategory(cat.id)}
                  className={`px-3 py-1.5 rounded-full text-[12px] font-bold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat.id
                      ? 'bg-blue-600 text-white shadow-xs'
                      : 'bg-white text-slate-600 border border-black/5 hover:bg-slate-50'
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* FAQ Accordion List */}
            <div className="space-y-2.5">
              {filteredFaqs.length === 0 ? (
                <div className="bg-white rounded-2xl p-8 text-center border border-black/5 space-y-2">
                  <HelpCircle className="w-8 h-8 text-slate-300 mx-auto" />
                  <p className="text-[14px] font-bold text-slate-700">No matching questions found</p>
                  <p className="text-[12px] text-slate-400">
                    Try searching with another keyword or submit a direct ticket to our helpdesk.
                  </p>
                  <button
                    type="button"
                    onClick={() => setActiveTab('ticket')}
                    className="mt-2 px-4 py-2 rounded-xl bg-blue-50 text-[#007AFF] text-[12.5px] font-bold hover:bg-blue-100 transition-colors cursor-pointer"
                  >
                    Submit a Ticket
                  </button>
                </div>
              ) : (
                filteredFaqs.map((faq) => {
                  const isExpanded = expandedFaqId === faq.id;
                  return (
                    <motion.div
                      key={faq.id}
                      layout
                      className="bg-white rounded-2xl border border-black/5 shadow-2xs overflow-hidden transition-colors"
                    >
                      <button
                        type="button"
                        onClick={() => setExpandedFaqId(isExpanded ? null : faq.id)}
                        className="w-full p-4 text-left flex items-center justify-between gap-3 cursor-pointer select-none"
                      >
                        <div className="flex items-start gap-2.5">
                          <span className="w-5 h-5 rounded-full bg-blue-50 text-[#007AFF] flex items-center justify-center text-[10.5px] font-black shrink-0 mt-0.5">
                            Q
                          </span>
                          <span className="text-[13.5px] font-bold text-slate-900 leading-snug">
                            {faq.question}
                          </span>
                        </div>
                        <div className="w-6 h-6 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center shrink-0">
                          {isExpanded ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                        </div>
                      </button>

                      <AnimatePresence>
                        {isExpanded && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="px-4 pb-4 pt-1 border-t border-slate-100 text-[13px] text-slate-600 font-normal leading-relaxed"
                          >
                            <p>{faq.answer}</p>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                  );
                })
              )}
            </div>
          </div>
        )}

        {/* TAB 2: SUBMIT A TICKET */}
        {activeTab === 'ticket' && (
          <div className="space-y-4">
            {ticketSuccess ? (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="bg-white rounded-2xl p-6 text-center border border-black/5 shadow-xs space-y-4"
              >
                <div className="w-14 h-14 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mx-auto shadow-inner">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div>
                  <span className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-100 px-3 py-1 rounded-full uppercase">
                    Ticket Ref: #{ticketSuccess.id}
                  </span>
                  <h3 className="text-[18px] font-extrabold text-slate-900 mt-2">
                    Ticket Submitted Successfully!
                  </h3>
                  <p className="text-[13px] text-slate-500 mt-1 max-w-sm mx-auto">
                    Your inquiry regarding <strong className="text-slate-800 font-semibold">"{ticketSuccess.subject}"</strong> has been logged in the departmental queue. You will receive an alert once responded.
                  </p>
                </div>

                <div className="pt-2 flex flex-col sm:flex-row gap-2 justify-center">
                  <button
                    type="button"
                    onClick={() => setActiveTab('my_tickets')}
                    className="px-5 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-[13px] font-bold transition-all cursor-pointer shadow-sm shadow-blue-500/20"
                  >
                    View My Tickets
                  </button>
                  <button
                    type="button"
                    onClick={() => setTicketSuccess(null)}
                    className="px-5 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-bold transition-colors cursor-pointer"
                  >
                    Submit Another
                  </button>
                </div>
              </motion.div>
            ) : (
              <form onSubmit={handleTicketSubmit} className="bg-white rounded-2xl p-5 border border-black/5 shadow-2xs space-y-4">
                <div>
                  <h3 className="text-[16px] font-bold text-slate-900">Submit Support Ticket</h3>
                  <p className="text-[12px] text-slate-500">
                    Report schedule clashes, payment inquiries, or academic request directly to staff.
                  </p>
                </div>

                <div className="space-y-3 text-xs">
                  {/* Category Selector */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Issue Category</label>
                    <select
                      value={ticketCategory}
                      onChange={(e) => setTicketCategory(e.target.value as any)}
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-semibold focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none cursor-pointer"
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
                    <label className="block font-bold text-slate-700 mb-1">Urgency / Priority</label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'low', label: 'Normal', color: 'border-slate-200 text-slate-700' },
                        { id: 'medium', label: 'High Priority', color: 'border-blue-300 text-blue-700 bg-blue-50/50' },
                        { id: 'urgent', label: 'Critical / Urgent', color: 'border-rose-300 text-rose-700 bg-rose-50/50' },
                      ].map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          onClick={() => setTicketPriority(p.id as any)}
                          className={`py-2 rounded-xl text-center font-bold text-[11.5px] border transition-all cursor-pointer ${
                            ticketPriority === p.id
                              ? 'ring-2 ring-blue-600 bg-blue-50 border-blue-600 text-blue-700 font-extrabold'
                              : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
                          }`}
                        >
                          {p.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Subject Input */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Subject</label>
                    <input
                      type="text"
                      required
                      value={ticketSubject}
                      onChange={(e) => setTicketSubject(e.target.value)}
                      placeholder="e.g. Schedule clash between CHM 101 and PHY 107"
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-medium focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none"
                    />
                  </div>

                  {/* Message Description */}
                  <div>
                    <label className="block font-bold text-slate-700 mb-1">Detailed Description</label>
                    <textarea
                      required
                      rows={4}
                      value={ticketMessage}
                      onChange={(e) => setTicketMessage(e.target.value)}
                      placeholder="Describe the issue in detail (include dates, course codes, or transaction references if applicable)..."
                      className="w-full px-3.5 py-2.5 rounded-xl border border-slate-200 bg-slate-50 text-slate-900 font-normal focus:bg-white focus:ring-2 focus:ring-blue-500 outline-none resize-none leading-relaxed"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full py-3 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white text-[13.5px] font-bold transition-all cursor-pointer shadow-md shadow-blue-500/20 flex items-center justify-center gap-2"
                >
                  <Send className="w-4 h-4" />
                  <span>{isSubmitting ? 'Submitting Ticket...' : 'Send Support Ticket'}</span>
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 3: MY TICKETS */}
        {activeTab === 'my_tickets' && (
          <div className="space-y-3">
            {isLoadingTickets ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-black/5 text-slate-400">
                <Clock className="w-6 h-6 animate-spin mx-auto text-blue-500 mb-2" />
                <p className="text-xs font-semibold">Loading ticket history...</p>
              </div>
            ) : myTickets.length === 0 ? (
              <div className="bg-white rounded-2xl p-8 text-center border border-black/5 space-y-2">
                <MessageSquare className="w-8 h-8 text-slate-300 mx-auto" />
                <h4 className="text-[14px] font-bold text-slate-800">No Tickets Logged Yet</h4>
                <p className="text-[12px] text-slate-400 max-w-xs mx-auto">
                  When you submit inquiries or issue reports, their live resolution status will appear here.
                </p>
                <button
                  type="button"
                  onClick={() => setActiveTab('ticket')}
                  className="mt-2 px-4 py-2 rounded-xl bg-blue-600 text-white text-[12.5px] font-bold hover:bg-blue-700 transition-colors cursor-pointer"
                >
                  Create First Ticket
                </button>
              </div>
            ) : (
              myTickets.map((t) => (
                <div
                  key={t.id}
                  className="bg-white rounded-2xl p-4 border border-black/5 shadow-2xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] font-bold font-mono px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
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
                      <h4 className="text-[14px] font-bold text-slate-900 mt-1.5">{t.subject}</h4>
                    </div>
                    <span className="text-[11px] text-slate-400 font-medium whitespace-nowrap">{t.createdAt}</span>
                  </div>

                  <p className="text-[12.5px] text-slate-600 bg-slate-50 p-3 rounded-xl border border-slate-100 leading-relaxed font-normal">
                    {t.message}
                  </p>

                  {t.response && (
                    <div className="bg-blue-50/70 rounded-xl p-3 border border-blue-100 space-y-1">
                      <div className="flex items-center justify-between text-[11px] font-bold text-blue-800">
                        <span className="flex items-center gap-1">
                          <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                          <span>Staff Response ({t.respondedBy || 'Admin'})</span>
                        </span>
                        <span className="text-blue-500 font-normal">{t.respondedAt}</span>
                      </div>
                      <p className="text-[12px] text-blue-950 leading-relaxed font-medium">
                        {t.response}
                      </p>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        )}
      </main>
    </div>
  );
};
