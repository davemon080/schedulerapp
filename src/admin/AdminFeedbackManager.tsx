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
  Clock
} from 'lucide-react';
import { FeedbackRecord } from './types';
import { fetchFeedbackList, deleteFeedbackItem } from '../lib/dbService';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

export const AdminFeedbackManager: React.FC = () => {
  const [feedbacks, setFeedbacks] = useState<FeedbackRecord[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [typeFilter, setTypeFilter] = useState<string>('all');
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [deletingFeedback, setDeletingFeedback] = useState<FeedbackRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const loadData = async () => {
    setIsLoading(true);
    const data = await fetchFeedbackList();
    setFeedbacks(data);
    setIsLoading(false);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleConfirmDelete = async () => {
    if (!deletingFeedback) return;
    setIsDeleting(true);
    const ok = await deleteFeedbackItem(deletingFeedback.id);
    if (ok) {
      showToast('Feedback item removed');
      await loadData();
      setDeletingFeedback(null);
    } else {
      showToast('Error removing feedback');
    }
    setIsDeleting(false);
  };

  const filteredFeedbacks = feedbacks.filter((fb) => {
    const matchesSearch = 
      (fb.message && fb.message.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (fb.userEmail && fb.userEmail.toLowerCase().includes(searchQuery.toLowerCase())) ||
      (fb.type && fb.type.toLowerCase().includes(searchQuery.toLowerCase()));
    
    const matchesType = typeFilter === 'all' || fb.type === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <MessageSquare className="w-5 h-5 text-blue-600" />
            <h3 className="text-lg font-bold text-slate-900">Student Feedback Inbox</h3>
            <span className="text-xs px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 font-semibold border border-blue-200">
              {feedbacks.length} messages
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time issues, bug reports, and timetable suggestions submitted by students (table: <code className="font-mono text-blue-600">feedback</code>).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={loadData}
            disabled={isLoading}
            className="p-2.5 rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 transition-colors cursor-pointer"
            title="Refresh list"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Filter & Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search email, message content..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9.5 pr-4 py-2 text-xs bg-white border border-slate-200 rounded-xl text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="text-xs bg-white border border-slate-200 rounded-xl px-3 py-2 text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-500/20"
          >
            <option value="all">All Feedback Types</option>
            <option value="issue">Issue / Bug</option>
            <option value="suggestion">Suggestion</option>
            <option value="clash">Timetable Clash</option>
            <option value="general">General</option>
          </select>
        </div>
      </div>

      {/* List / Cards */}
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
            <h4 className="text-sm font-semibold text-slate-800">Inbox is all clear</h4>
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
                  className="p-1.5 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                  title="Delete message"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Confirm Delete Feedback Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingFeedback)}
        onClose={() => setDeletingFeedback(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Student Feedback"
        itemType="feedback submission"
        itemName={deletingFeedback ? `${deletingFeedback.userEmail || 'Anonymous'} - "${deletingFeedback.message?.substring(0, 35)}..."` : undefined}
        description="Are you sure you want to delete this student feedback submission? This item will be permanently removed from the inbox."
        confirmLabel="Yes, Delete Message"
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
