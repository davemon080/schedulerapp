import React, { useState, useEffect } from 'react';
import { 
  MessageSquare, 
  Search, 
  Trash2, 
  Check, 
  RefreshCw, 
  Filter, 
  AlertCircle, 
  Mail, 
  Calendar,
  Sparkles,
  CheckCircle2,
  Clock,
  Send,
  LifeBuoy,
  User,
  CheckCheck,
  AlertTriangle
} from 'lucide-react';
import { FeedbackRecord } from './types';
import { 
  fetchFeedbackList, 
  deleteFeedbackItem, 
  fetchAllSupportTickets, 
  updateSupportTicketStatus,
  deleteSupportTicket 
} from '../lib/dbService';
import { SupportTicket } from '../types';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const AdminFeedbackManager: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'tickets' | 'feedback'>('tickets');
  
  // Feedback state
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [feedbackTypeFilter, setFeedbackTypeFilter] = useState<string>('all');
  const [deletingFeedback, setDeletingFeedback] = useState<FeedbackRecord | null>(null);

  // Tickets state
  const [tickets, setTickets] = useState<SupportTicket[]>([]);
  const [ticketStatusFilter, setTicketStatusFilter] = useState<'all' | 'open' | 'resolved'>('all');
  const [selectedTicket, setSelectedTicket] = useState<SupportTicket | null>(null);
  const [ticketResponse, setTicketResponse] = useState('');
  const [isResponding, setIsResponding] = useState(false);
  const [deletingTicket, setDeletingTicket] = useState<SupportTicket | null>(null);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    try {
      const [feedbackData, ticketsData] = await Promise.all([
        fetchFeedbackList(),
        fetchAllSupportTickets(),
      ]);
      setFeedbacks(feedbackData);
      setTickets(ticketsData);
    } catch (e) {
      console.error('Error loading feedback & tickets:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmDeleteFeedback = async () => {
    if (!deletingFeedback) return;
    setIsDeleting(true);
    const ok = await deleteFeedbackItem(deletingFeedback.id);
    if (ok) {
      showToast('Feedback message removed');
      await loadData();
      setDeletingFeedback(null);
    } else {
      showToast('Error removing feedback');
    }
    setIsDeleting(false);
  };

  const handleConfirmDeleteTicket = async () => {
    if (!deletingTicket) return;
    setIsDeleting(true);
    const ok = await deleteSupportTicket(deletingTicket.id);
    if (ok) {
      showToast('Support ticket deleted');
      await loadData();
      setDeletingTicket(null);
    } else {
      showToast('Error deleting support ticket');
    }
    setIsDeleting(false);
  };

  const handleSendTicketResponse = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedTicket || !ticketResponse.trim()) return;
    setIsResponding(true);
    try {
      const ok = await updateSupportTicketStatus(
        selectedTicket.id,
        'resolved',
        ticketResponse.trim(),
        'Department Head / Academic Admin'
      );
      if (ok) {
        showToast(`Ticket #${selectedTicket.id} resolved with official response!`);
        setTickets((prev) =>
          prev.map((t) =>
            t.id === selectedTicket.id
              ? {
                  ...t,
                  status: 'resolved',
                  response: ticketResponse.trim(),
                  respondedBy: 'Department Head / Academic Admin',
                  respondedAt: 'Just now',
                }
              : t
          )
        );
        setSelectedTicket(null);
        setTicketResponse('');
      } else {
        showToast('Error sending resolution response');
      }
    } finally {
      setIsResponding(false);
    }
  };

  const openTicketsCount = tickets.filter((t) => t.status === 'open').length;

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch = 
      !q ||
      (fb.message && fb.message.toLowerCase().includes(q)) ||
      (fb.userEmail && fb.userEmail.toLowerCase().includes(q)) ||
      (fb.type && fb.type.toLowerCase().includes(q));
    
    const matchesType = feedbackTypeFilter === 'all' || fb.type === feedbackTypeFilter;
    return matchesSearch && matchesType;
  });

  const filteredTickets = tickets.filter((t) => {
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      (t.subject && t.subject.toLowerCase().includes(q)) ||
      (t.message && t.message.toLowerCase().includes(q)) ||
      (t.studentName && t.studentName.toLowerCase().includes(q)) ||
      (t.matricNumber && t.matricNumber.toLowerCase().includes(q)) ||
      (t.studentEmail && t.studentEmail.toLowerCase().includes(q)) ||
      (t.id && t.id.toLowerCase().includes(q));

    const matchesStatus = ticketStatusFilter === 'all' || t.status === ticketStatusFilter;
    return matchesSearch && matchesStatus;
  });

  return (
    <div className="p-6 sm:p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20">
              <MessageSquare className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  Feedback &amp; Support Desk
                </h2>
                {openTicketsCount > 0 && (
                  <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-rose-100 text-rose-800 font-bold border border-rose-200 animate-pulse">
                    {openTicketsCount} Open Ticket{openTicketsCount > 1 ? 's' : ''}
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-500">
                Direct student inquiries, timetable conflict tickets, helpdesk requests and app reviews
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Main Segment Switcher */}
          <div className="flex p-1 bg-slate-100 rounded-xl gap-1 text-xs font-bold">
            <button
              type="button"
              onClick={() => setActiveTab('tickets')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'tickets' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LifeBuoy className="w-3.5 h-3.5 text-blue-600" />
              <span>Support Desk</span>
              {openTicketsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full bg-rose-500 text-white text-[10px]">
                  {openTicketsCount}
                </span>
              )}
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('feedback')}
              className={`px-3.5 py-2 rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                activeTab === 'feedback' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <MessageSquare className="w-3.5 h-3.5 text-indigo-600" />
              <span>General Feedback</span>
              <span className="px-1.5 py-0.2 rounded-full bg-slate-200 text-slate-700 text-[10px]">
                {feedbacks.length}
              </span>
            </button>
          </div>

          <button
            type="button"
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            title="Refresh Inquiries"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin text-blue-600' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder={activeTab === 'tickets' ? 'Search tickets, student, subject...' : 'Search email, feedback message...'}
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2.5 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 shadow-2xs"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          {activeTab === 'tickets' ? (
            <select
              value={ticketStatusFilter}
              onChange={(e) => setTicketStatusFilter(e.target.value as any)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
            >
              <option value="all">All Ticket Statuses ({tickets.length})</option>
              <option value="open">Open / Needs Action ({openTicketsCount})</option>
              <option value="resolved">Resolved ({tickets.filter((t) => t.status === 'resolved').length})</option>
            </select>
          ) : (
            <select
              value={feedbackTypeFilter}
              onChange={(e) => setFeedbackTypeFilter(e.target.value)}
              className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-2xs"
            >
              <option value="all">All Feedback Types ({feedbacks.length})</option>
              <option value="issue">Issue / Bug</option>
              <option value="suggestion">Suggestion</option>
              <option value="clash">Timetable Clash</option>
              <option value="general">General</option>
            </select>
          )}
        </div>
      </div>

      {/* TAB 1: SUPPORT DESK TICKETS */}
      {activeTab === 'tickets' && (
        <div className="space-y-4">
          {isLoading ? (
            Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-3">
                <div className="h-4 bg-slate-200 rounded w-1/3" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-3 bg-slate-100 rounded w-2/3" />
              </div>
            ))
          ) : filteredTickets.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3 shadow-xs">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-bold text-slate-800">Support Desk is Clear</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No active student tickets matching your filter criteria. Inquiries submitted by students from the mobile support page will appear here instantly.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredTickets.map((t) => (
                <div
                  key={t.id}
                  className={`p-5 rounded-2xl border shadow-xs transition-all flex flex-col justify-between space-y-4 bg-white ${
                    t.status === 'open' ? 'border-amber-200 hover:border-amber-300' : 'border-slate-200 hover:border-slate-300'
                  }`}
                >
                  <div className="space-y-2.5">
                    {/* Header line */}
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="text-[10.5px] font-bold font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-700">
                          #{t.id}
                        </span>
                        <span className="text-[11px] font-semibold text-slate-500">
                          {t.category ? `${t.category.toUpperCase()} • ` : ''}{t.createdAt}
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`text-[10.5px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                            t.status === 'resolved'
                              ? 'bg-emerald-100 text-emerald-800'
                              : 'bg-rose-100 text-rose-800'
                          }`}
                        >
                          {t.status}
                        </span>
                        <button
                          type="button"
                          onClick={() => setDeletingTicket(t)}
                          className="p-1 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                          title="Delete ticket"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Subject */}
                    <h3 className="text-[15px] font-bold text-slate-900 leading-snug">
                      {t.subject}
                    </h3>

                    {/* Message Box */}
                    <p className="text-xs text-slate-700 leading-relaxed bg-slate-50 p-3 rounded-xl border border-slate-100">
                      {t.message}
                    </p>

                    {/* Student Identity Footer */}
                    <div className="text-[11.5px] text-slate-500 flex items-center justify-between pt-1">
                      <span className="flex items-center gap-1">
                        <User className="w-3.5 h-3.5 text-slate-400" />
                        <strong className="text-slate-800 font-semibold">{t.studentName}</strong> ({t.matricNumber})
                      </span>
                      {t.studentEmail && (
                        <span className="text-slate-400">{t.studentEmail}</span>
                      )}
                    </div>
                  </div>

                  {/* Resolution / Action Footer */}
                  {t.response ? (
                    <div className="bg-emerald-50/80 p-3 rounded-xl border border-emerald-200 text-xs text-emerald-950 space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-[11px] text-emerald-900 flex items-center gap-1">
                          <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                          Official Admin Response
                        </span>
                        <span className="text-[10.5px] text-emerald-700">{t.respondedAt || 'Resolved'}</span>
                      </div>
                      <p className="leading-relaxed">{t.response}</p>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedTicket(t);
                        setTicketResponse('');
                      }}
                      className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer active:scale-[0.99]"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Respond &amp; Resolve Ticket</span>
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: GENERAL FEEDBACK INBOX */}
      {activeTab === 'feedback' && (
        <div className="space-y-3">
          {isLoading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="bg-white p-5 rounded-2xl border border-slate-200 animate-pulse space-y-2">
                <div className="h-4 bg-slate-200 rounded w-1/4" />
                <div className="h-3 bg-slate-100 rounded w-3/4" />
              </div>
            ))
          ) : filteredFeedbacks.length === 0 ? (
            <div className="bg-white p-12 rounded-2xl border border-slate-200 text-center space-y-3">
              <CheckCircle2 className="w-10 h-10 text-emerald-400 mx-auto" />
              <h4 className="text-sm font-semibold text-slate-800">Feedback Inbox is All Clear</h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                No outstanding student feedback or clash reports at this time.
              </p>
            </div>
          ) : (
            filteredFeedbacks.map((fb) => (
              <div
                key={fb.id}
                className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs hover:border-slate-300 transition-all flex flex-col md:flex-row md:items-start justify-between gap-4 group"
              >
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2.5 flex-wrap">
                    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
                      fb.type === 'issue' || fb.type === 'clash'
                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                        : fb.type === 'suggestion'
                        ? 'bg-amber-50 text-amber-700 border border-amber-200'
                        : 'bg-blue-50 text-blue-700 border border-blue-200'
                    }`}>
                      {fb.type || 'General'}
                    </span>

                    <span className="flex items-center gap-1 text-xs text-slate-600 font-medium">
                      <Mail className="w-3.5 h-3.5 text-slate-400" />
                      {fb.userEmail || 'Anonymous Student'}
                    </span>

                    <span className="text-slate-300">•</span>

                    <span className="flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      {fb.createdat ? new Date(fb.createdat).toLocaleString([], {
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      }) : 'Recent'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-800 leading-relaxed font-normal bg-slate-50/60 p-3.5 rounded-xl border border-slate-100">
                    {fb.message}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0 self-end md:self-start">
                  <a
                    href={`mailto:${fb.userEmail}?subject=Regarding your feedback on University Portal`}
                    className="px-3 py-1.5 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                  >
                    <Mail className="w-3.5 h-3.5" />
                    <span>Reply</span>
                  </a>
                  <button
                    onClick={() => setDeletingFeedback(fb)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
                    title="Delete message"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}

      {/* Ticket Response Modal */}
      {selectedTicket && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
                <LifeBuoy className="w-4 h-4 text-blue-600" />
                Respond &amp; Resolve Ticket #{selectedTicket.id}
              </h3>
              <button
                type="button"
                onClick={() => setSelectedTicket(null)}
                className="w-7 h-7 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center text-xs font-bold hover:bg-slate-200 cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between text-xs text-slate-500 font-semibold">
                <span>From: {selectedTicket.studentName} ({selectedTicket.matricNumber})</span>
                <span>{selectedTicket.createdAt}</span>
              </div>
              <h4 className="text-xs font-bold text-slate-800">{selectedTicket.subject}</h4>
              <p className="text-xs text-slate-800 bg-slate-50 p-3 rounded-xl border border-slate-200">
                "{selectedTicket.message}"
              </p>
            </div>

            <form onSubmit={handleSendTicketResponse} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Official Administrative Resolution
                </label>
                <textarea
                  required
                  rows={4}
                  value={ticketResponse}
                  onChange={(e) => setTicketResponse(e.target.value)}
                  placeholder="Enter resolution instructions, reschedule notice, or advice for the student..."
                  className="w-full p-3 rounded-xl border border-slate-200 text-xs text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none resize-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedTicket(null)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-100 text-slate-700 text-xs font-bold hover:bg-slate-200 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isResponding}
                  className="flex-1 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all shadow-xs flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-60"
                >
                  {isResponding ? 'Resolving...' : 'Send Resolution & Close'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Confirm Delete Feedback Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingFeedback)}
        onClose={() => setDeletingFeedback(null)}
        onConfirm={handleConfirmDeleteFeedback}
        title="Delete Student Feedback"
        itemType="feedback submission"
        itemName={deletingFeedback ? `${deletingFeedback.userEmail || 'Anonymous'} - "${deletingFeedback.message?.substring(0, 35)}..."` : undefined}
        description="Are you sure you want to delete this student feedback submission? This item will be permanently removed from the inbox."
        confirmLabel="Yes, Delete Message"
        isDeleting={isDeleting}
      />

      {/* Confirm Delete Ticket Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingTicket)}
        onClose={() => setDeletingTicket(null)}
        onConfirm={handleConfirmDeleteTicket}
        title="Delete Support Ticket"
        itemType="support inquiry"
        itemName={deletingTicket ? `#${deletingTicket.id} (${deletingTicket.subject})` : undefined}
        description="Are you sure you want to delete this support ticket from the database?"
        confirmLabel="Yes, Delete Ticket"
        isDeleting={isDeleting}
      />

      {/* Toast */}
      {toastMessage && (
        <div className="fixed bottom-6 right-6 z-50 bg-slate-900 text-white px-4 py-2.5 rounded-xl shadow-lg text-xs font-semibold flex items-center gap-2 border border-slate-800">
          <Check className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
};
