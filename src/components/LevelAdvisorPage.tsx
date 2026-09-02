import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  ArrowLeft, 
  UserCheck, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Copy, 
  Check, 
  Edit3, 
  GraduationCap, 
  Building2,
  X,
  ExternalLink,
  ShieldCheck,
  Calendar
} from 'lucide-react';
import { UserSession } from '../types';
import { resolveStudentDepartmentId } from '../lib/academicScope';

interface LevelAdvisorPageProps {
  onBack: () => void;
  userSession?: UserSession | null;
  activeLevel?: number;
  activeSemester?: string;
  isCourseRep?: boolean;
}

export const LevelAdvisorPage: React.FC<LevelAdvisorPageProps> = ({
  onBack,
  userSession,
  activeLevel = 100,
  activeSemester = '2nd Semester',
  isCourseRep = false,
}) => {
  // Level Advisor State with localStorage caching
  const [advisorName, setAdvisorName] = useState(() => localStorage.getItem('student_level_advisor_name') || 'Prof. A. Adeleke');
  const [advisorTitle, setAdvisorTitle] = useState(() => localStorage.getItem('student_level_advisor_title') || 'Department Level Advisor');
  const [advisorOffice, setAdvisorOffice] = useState(() => localStorage.getItem('student_level_advisor_office') || 'Faculty of Science Complex, Block B, Room 304');
  const [advisorPhone, setAdvisorPhone] = useState(() => localStorage.getItem('student_level_advisor_phone') || '+234 803 456 7890');
  const [advisorEmail, setAdvisorEmail] = useState(() => localStorage.getItem('student_level_advisor_email') || 'advisor.adeleke@university.edu');
  const [advisorHours, setAdvisorHours] = useState('Mondays & Wednesdays: 10:00 AM – 2:00 PM');

  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Edit form states
  const [tempName, setTempName] = useState(advisorName);
  const [tempTitle, setTempTitle] = useState(advisorTitle);
  const [tempOffice, setTempOffice] = useState(advisorOffice);
  const [tempPhone, setTempPhone] = useState(advisorPhone);
  const [tempEmail, setTempEmail] = useState(advisorEmail);
  const [tempHours, setTempHours] = useState(advisorHours);

  const deptInfo = resolveStudentDepartmentId(userSession);
  const effectiveCourseRep = isCourseRep || Boolean(userSession?.isCourseRep || (userSession as any)?.iscourserep || userSession?.isAdmin);

  const handleCopy = (text: string, key: string) => {
    navigator.clipboard?.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const handleSaveAdvisor = (e: React.FormEvent) => {
    e.preventDefault();
    setAdvisorName(tempName.trim());
    setAdvisorTitle(tempTitle.trim());
    setAdvisorOffice(tempOffice.trim());
    setAdvisorPhone(tempPhone.trim());
    setAdvisorEmail(tempEmail.trim());
    setAdvisorHours(tempHours.trim());

    localStorage.setItem('student_level_advisor_name', tempName.trim());
    localStorage.setItem('student_level_advisor_title', tempTitle.trim());
    localStorage.setItem('student_level_advisor_office', tempOffice.trim());
    localStorage.setItem('student_level_advisor_phone', tempPhone.trim());
    localStorage.setItem('student_level_advisor_email', tempEmail.trim());

    setIsEditModalOpen(false);
  };

  const advisorInitials = advisorName
    .replace(/^(Prof\.|Dr\.|Mr\.|Mrs\.|Ms\.)\s+/i, '')
    .split(' ')
    .filter(Boolean)
    .map(p => p[0])
    .join('')
    .substring(0, 2)
    .toUpperCase() || 'LA';

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="min-h-screen pb-28 text-[#1C1C1E]"
    >
      {/* Top iOS Navigation Header */}
      <div className="flex items-center justify-between pt-2 pb-4 mb-2">
        <button
          type="button"
          onClick={onBack}
          className="flex items-center gap-1.5 text-[#007AFF] hover:opacity-80 transition-opacity font-semibold text-[15px] cursor-pointer -ml-1"
        >
          <ArrowLeft className="w-5 h-5" />
          <span>Back</span>
        </button>

        <h1 className="text-[17px] font-bold text-[#1C1C1E] tracking-tight">Level Advisor</h1>

        {effectiveCourseRep ? (
          <button
            type="button"
            onClick={() => {
              setTempName(advisorName);
              setTempTitle(advisorTitle);
              setTempOffice(advisorOffice);
              setTempPhone(advisorPhone);
              setTempEmail(advisorEmail);
              setTempHours(advisorHours);
              setIsEditModalOpen(true);
            }}
            className="flex items-center gap-1 text-[#007AFF] hover:opacity-80 transition-opacity font-bold text-[14px] cursor-pointer"
          >
            <Edit3 className="w-4 h-4" />
            <span>Edit</span>
          </button>
        ) : (
          <div className="w-10" />
        )}
      </div>

      {/* Hero Avatar & Advisor Name directly on page canvas (no box container) */}
      <div className="flex flex-col items-center text-center pt-2 pb-6 space-y-3">
        <div className="relative">
          <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-blue-600 via-blue-500 to-indigo-600 text-white flex items-center justify-center text-2xl font-black shadow-xl shadow-blue-500/25 border-4 border-white">
            {advisorInitials}
          </div>
          <div className="absolute bottom-0 right-0 w-7 h-7 rounded-full bg-emerald-500 text-white flex items-center justify-center border-2 border-white shadow-sm" title="Active Academic Staff">
            <ShieldCheck className="w-4 h-4 stroke-[2.5]" />
          </div>
        </div>

        <div className="space-y-1">
          <h2 className="text-[22px] font-black text-[#1C1C1E] tracking-tight leading-tight">
            {advisorName}
          </h2>
          <p className="text-[13.5px] font-semibold text-slate-500">
            {deptInfo.name} • {activeLevel}L {activeSemester}
          </p>
          {advisorTitle && (
            <p className="text-[12px] text-blue-600 font-medium">{advisorTitle}</p>
          )}
        </div>

        {/* Quick Contact Action Pills directly on the page */}
        <div className="flex items-center justify-center gap-3 pt-2">
          {advisorPhone && (
            <a
              href={`tel:${advisorPhone.replace(/\s+/g, '')}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-[#007AFF] text-white text-[13px] font-bold shadow-md shadow-blue-500/25 hover:bg-blue-600 active:scale-95 transition-all"
            >
              <Phone className="w-4 h-4" />
              <span>Call Advisor</span>
            </a>
          )}

          {advisorEmail && (
            <a
              href={`mailto:${advisorEmail}`}
              className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/5 hover:bg-black/10 text-slate-800 text-[13px] font-bold active:scale-95 transition-all"
            >
              <Mail className="w-4 h-4 text-blue-600" />
              <span>Send Email</span>
            </a>
          )}
        </div>
      </div>

      {/* Direct Information Rows on the Page (no enclosed card box container) */}
      <div className="space-y-6 pt-2">
        {/* Section: Academic Assignment */}
        <div className="space-y-2">
          <h3 className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Faculty Assignment
          </h3>

          <div className="divide-y divide-black/5">
            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Building2 className="w-5 h-5 text-blue-600 shrink-0" />
                <div>
                  <span className="text-[12px] text-slate-400 block font-medium">Department</span>
                  <span className="text-[14.5px] font-bold text-[#1C1C1E]">{deptInfo.name}</span>
                </div>
              </div>
            </div>

            <div className="py-3 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <GraduationCap className="w-5 h-5 text-indigo-600 shrink-0" />
                <div>
                  <span className="text-[12px] text-slate-400 block font-medium">Class Level &amp; Term</span>
                  <span className="text-[14.5px] font-bold text-[#1C1C1E]">{activeLevel} Level • {activeSemester}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section: Contact & Office */}
        <div className="space-y-2">
          <h3 className="text-[11.5px] font-bold text-slate-400 uppercase tracking-wider px-1">
            Office &amp; Contact Details
          </h3>

          <div className="divide-y divide-black/5">
            {/* Office Location */}
            <div className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <MapPin className="w-5 h-5 text-rose-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[12px] text-slate-400 block font-medium">Office Location</span>
                  <span className="text-[14px] font-semibold text-[#1C1C1E] leading-snug break-words">
                    {advisorOffice}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(advisorOffice, 'office')}
                className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                title="Copy Office Location"
              >
                {copiedKey === 'office' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* Direct Phone */}
            <div className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Phone className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[12px] text-slate-400 block font-medium">Direct Telephone</span>
                  <span className="text-[14.5px] font-bold text-[#1C1C1E] font-mono">
                    {advisorPhone}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => handleCopy(advisorPhone, 'phone')}
                className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                title="Copy Phone Number"
              >
                {copiedKey === 'phone' ? (
                  <Check className="w-4 h-4 text-emerald-600" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>

            {/* University Email */}
            {advisorEmail && (
              <div className="py-3.5 flex items-center justify-between gap-3">
                <div className="flex items-start gap-3 min-w-0">
                  <Mail className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                  <div className="min-w-0">
                    <span className="text-[12px] text-slate-400 block font-medium">University Email</span>
                    <span className="text-[14px] font-semibold text-[#1C1C1E] break-all">
                      {advisorEmail}
                    </span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => handleCopy(advisorEmail, 'email')}
                  className="p-2 rounded-xl text-slate-400 hover:text-blue-600 hover:bg-black/5 transition-colors cursor-pointer shrink-0"
                  title="Copy Email"
                >
                  {copiedKey === 'email' ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </button>
              </div>
            )}

            {/* Consultation Hours */}
            <div className="py-3.5 flex items-center justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <Clock className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <span className="text-[12px] text-slate-400 block font-medium">Walk-in Consultation Hours</span>
                  <span className="text-[14px] font-semibold text-[#1C1C1E] leading-snug">
                    {advisorHours}
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Guidance Note directly on canvas */}
        <div className="pt-2 text-center text-[12px] text-slate-400 space-y-1">
          <p>For urgent course registration sign-offs, result complaints, or add/drop forms, visit during office hours.</p>
        </div>
      </div>

      {/* Edit Level Advisor Modal for Course Rep - Transparent iOS Frosted Theme */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/35 backdrop-blur-md">
            <motion.div
              initial={{ opacity: 0, scale: 0.94, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.94, y: 15 }}
              transition={{ type: 'spring', damping: 26, stiffness: 320 }}
              className="glass-container-solid rounded-[32px] p-6 max-w-md w-full shadow-[0_24px_70px_rgba(0,0,0,0.22)] border border-white space-y-4"
            >
              <div className="flex items-center justify-between pb-3 border-b border-black/5">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-2xl bg-blue-500/15 text-[#007AFF] flex items-center justify-center font-bold">
                    <UserCheck className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-[17px] font-bold text-[#1C1C1E]">Edit Level Advisor</h4>
                    <p className="text-[11.5px] text-slate-500">{activeLevel}L • {deptInfo.name}</p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-black/5 hover:bg-black/10 flex items-center justify-center text-slate-500 transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveAdvisor} className="space-y-3.5 text-xs">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Advisor Full Name</label>
                  <input
                    type="text"
                    required
                    value={tempName}
                    onChange={(e) => setTempName(e.target.value)}
                    placeholder="e.g. Prof. A. Adeleke"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-black/10 bg-white/60 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Title / Academic Rank</label>
                  <input
                    type="text"
                    required
                    value={tempTitle}
                    onChange={(e) => setTempTitle(e.target.value)}
                    placeholder="e.g. Department Level Advisor & Associate Prof."
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-black/10 bg-white/60 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Office Location</label>
                  <input
                    type="text"
                    value={tempOffice}
                    onChange={(e) => setTempOffice(e.target.value)}
                    placeholder="e.g. Faculty of Science Complex, Block B, Room 304"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-black/10 bg-white/60 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Contact Phone</label>
                  <input
                    type="text"
                    value={tempPhone}
                    onChange={(e) => setTempPhone(e.target.value)}
                    placeholder="e.g. +234 803 456 7890"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-black/10 bg-white/60 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">University Email</label>
                  <input
                    type="email"
                    value={tempEmail}
                    onChange={(e) => setTempEmail(e.target.value)}
                    placeholder="e.g. advisor.adeleke@university.edu"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-black/10 bg-white/60 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                  />
                </div>

                <div>
                  <label className="block font-bold text-slate-700 mb-1">Consultation Hours</label>
                  <input
                    type="text"
                    value={tempHours}
                    onChange={(e) => setTempHours(e.target.value)}
                    placeholder="e.g. Mondays & Wednesdays: 10:00 AM – 2:00 PM"
                    className="w-full px-3.5 py-2.5 rounded-2xl border border-black/10 bg-white/60 focus:bg-white text-slate-900 font-medium focus:ring-2 focus:ring-blue-500/30 outline-none transition-all"
                  />
                </div>

                <div className="flex gap-2.5 pt-2 border-t border-black/5">
                  <button
                    type="button"
                    onClick={() => setIsEditModalOpen(false)}
                    className="flex-1 py-3 rounded-2xl bg-black/5 hover:bg-black/10 text-slate-700 text-[13px] font-bold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-3 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white text-[13px] font-bold transition-all cursor-pointer shadow-md shadow-blue-500/25 active:scale-98"
                  >
                    Save Changes
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};
