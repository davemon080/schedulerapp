import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Lock,
  GraduationCap,
  Eye,
  EyeOff,
  ArrowRight,
  ShieldCheck,
  Sparkles,
  AlertCircle,
  FlaskConical,
} from 'lucide-react';
import { UserSession } from '../types';

interface LoginPageProps {
  onLogin: (session: UserSession) => void;
  initialEmail?: string;
  initialMatric?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  initialEmail = 'r.ogwu@student.university.edu',
  initialMatric = '2025/PS/ICH/000',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [matricNumber, setMatricNumber] = useState(initialMatric);
  const [password, setPassword] = useState('••••••••');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFillDemo = (name: string, mail: string, matric: string) => {
    setEmail(mail);
    setMatricNumber(matric);
    setPassword('student123');
    setErrorMessage(null);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim();
    const trimmedMatric = matricNumber.trim().toUpperCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your student email address.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address (e.g. name@student.edu).');
      return;
    }

    if (!trimmedMatric) {
      setErrorMessage('Please enter your student Matriculation Number.');
      return;
    }

    if (trimmedMatric.length < 5) {
      setErrorMessage('Please enter a valid Matric Number format (e.g. 2025/PS/ICH/000).');
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage('Please enter your portal password.');
      return;
    }

    setIsLoading(true);

    // Simulate authenticating against the portal
    setTimeout(() => {
      setIsLoading(false);

      // Derive readable student name or default to Rapheal Ogwu
      let studentName = 'Rapheal Ogwu';
      if (trimmedEmail.toLowerCase().includes('dave') || trimmedEmail.toLowerCase().includes('david')) {
        studentName = 'David Imago-Dei';
      } else if (!trimmedEmail.includes('r.ogwu') && trimmedEmail.split('@')[0]) {
        const localPart = trimmedEmail.split('@')[0].replace(/[._-]/g, ' ');
        studentName = localPart
          .split(' ')
          .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
          .join(' ');
      }

      onLogin({
        email: trimmedEmail,
        matricNumber: trimmedMatric,
        fullName: studentName,
        department: 'Industrial Chemistry',
        faculty: 'Physical Sciences',
        yearLevel: 'Year 1 (Freshman)',
        isLoggedIn: true,
      });
    }, 700);
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-[#F5F5F7] px-4 py-8 relative overflow-hidden select-none">
      {/* Ambient background glow bubbles */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.35, 0.55, 0.35],
        }}
        transition={{ repeat: Infinity, duration: 6, ease: 'easeInOut' }}
        className="absolute top-[-80px] left-[-80px] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-blue-400/35 via-sky-300/40 to-indigo-300/25 blur-[90px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.3, 0.5, 0.3],
        }}
        transition={{ repeat: Infinity, duration: 7, ease: 'easeInOut', delay: 0.5 }}
        className="absolute bottom-[-80px] right-[-80px] w-[400px] h-[400px] rounded-full bg-gradient-to-br from-indigo-400/30 via-blue-300/35 to-teal-200/25 blur-[100px] pointer-events-none"
      />

      <motion.div
        initial={{ opacity: 0, y: 20, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md relative z-10"
      >
        {/* Main Frosted Glass Login Card */}
        <div className="glass-container-solid rounded-[32px] p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.06)] border border-white/90 backdrop-blur-2xl">
          {/* Header Brand Section */}
          <div className="flex flex-col items-center text-center mb-6">
            <div className="relative mb-3">
              <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#007AFF] via-[#0A84FF] to-sky-400 p-[2px] shadow-lg shadow-blue-500/25 flex items-center justify-center">
                <div className="w-full h-full bg-white/90 rounded-[20px] backdrop-blur-md flex items-center justify-center text-[#007AFF]">
                  <FlaskConical className="w-8 h-8 stroke-[2.2]" />
                </div>
              </div>
              <div className="absolute -bottom-1 -right-1 bg-blue-600 text-white rounded-full p-1 border-2 border-white shadow-xs">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
            </div>

            <h1 className="text-[23px] sm:text-[25px] font-extrabold text-[#1C1C1E] tracking-tight leading-tight">
              Student Portal
            </h1>
            <p className="text-[13px] text-[#8E8E93] mt-1 font-medium max-w-xs">
              Sign in with your student credentials to access your live timetable, modules, and assignment deadlines.
            </p>
          </div>

          {/* Error Banner */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0, y: -10 }}
                animate={{ opacity: 1, height: 'auto', y: 0 }}
                exit={{ opacity: 0, height: 0, y: -10 }}
                className="mb-4 overflow-hidden"
              >
                <div className="flex items-center gap-2.5 p-3 rounded-[18px] bg-red-50/90 border border-red-200/80 text-red-700 text-[12.5px] font-medium shadow-2xs">
                  <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                  <span className="flex-1 leading-snug">{errorMessage}</span>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email Field */}
            <div>
              <label className="block text-[12px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                Student Email Address
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Mail className="w-4 h-4" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="e.g. r.ogwu@student.university.edu"
                  required
                  autoComplete="email"
                  className="w-full pl-10 pr-3.5 py-3 rounded-[20px] bg-white/80 border border-slate-200/90 text-[13px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-medium"
                />
              </div>
            </div>

            {/* Matriculation Number Field */}
            <div>
              <label className="block text-[12px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                Matriculation Number (Matric)
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <GraduationCap className="w-4 h-4" />
                </div>
                <input
                  type="text"
                  value={matricNumber}
                  onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                  placeholder="e.g. 2025/PS/ICH/000"
                  required
                  autoCapitalize="characters"
                  className="w-full pl-10 pr-3.5 py-3 rounded-[20px] bg-white/80 border border-slate-200/90 text-[13px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-semibold uppercase tracking-wider"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label className="block text-[12px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                Portal Password
              </label>
              <div className="relative flex items-center">
                <div className="absolute left-3.5 text-slate-400 pointer-events-none">
                  <Lock className="w-4 h-4" />
                </div>
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  autoComplete="current-password"
                  className="w-full pl-10 pr-11 py-3 rounded-[20px] bg-white/80 border border-slate-200/90 text-[13px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 text-slate-400 hover:text-slate-600 p-1.5 rounded-full transition-colors cursor-pointer"
                  title={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me Checkbox */}
            <div className="flex items-center justify-between px-1 pt-0.5">
              <label className="flex items-center gap-2 cursor-pointer text-[12.5px] font-medium text-[#1C1C1E]">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded text-[#007AFF] focus:ring-[#007AFF]/30 border-slate-300 accent-[#007AFF] cursor-pointer"
                />
                <span>Remember on this device</span>
              </label>
              <span className="text-[11.5px] font-semibold text-slate-400 flex items-center gap-1">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
                <span>SSL Encrypted</span>
              </span>
            </div>

            {/* Sign In Submit Button */}
            <motion.button
              type="submit"
              disabled={isLoading}
              whileTap={{ scale: 0.97 }}
              whileHover={{ scale: 1.01 }}
              className="w-full py-3.5 px-5 rounded-[22px] bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[14.5px] shadow-[0_8px_24px_rgba(0,122,255,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-3"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Signing In...</span>
                </div>
              ) : (
                <>
                  <span>Sign In</span>
                  <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                </>
              )}
            </motion.button>
          </form>

          {/* Quick Demo Pre-fill Pill for testing */}
          <div className="mt-5 pt-4 border-t border-black/5 flex flex-col items-center">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-2">
              Quick Sign In Helper
            </span>
            <button
              type="button"
              onClick={() => handleFillDemo('Rapheal Ogwu', 'r.ogwu@student.university.edu', '2025/PS/ICH/000')}
              className="px-3.5 py-1.5 rounded-full bg-blue-50/80 hover:bg-blue-100/90 text-[#007AFF] text-[12px] font-bold border border-blue-200/60 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fill Default Student Credentials</span>
            </button>
          </div>
        </div>

        {/* Bottom Security Assurance Note */}
        <div className="text-center mt-4 text-[11.5px] text-[#8E8E93] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>University Portal Access • Academic Session 2026/2027</span>
        </div>
      </motion.div>
    </div>
  );
};
