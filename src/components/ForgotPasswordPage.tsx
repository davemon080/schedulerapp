import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ArrowLeft,
  Mail,
  KeyRound,
  CheckCircle2,
  AlertCircle,
  Send,
  RotateCcw,
  CheckCircle,
  ExternalLink,
  ShieldCheck,
  Inbox,
} from 'lucide-react';
import { sendFirebasePasswordResetEmail } from '../lib/dbService';

interface ForgotPasswordPageProps {
  onBackToLogin: (prefilledEmail?: string) => void;
  initialEmail?: string;
}

export const ForgotPasswordPage: React.FC<ForgotPasswordPageProps> = ({
  onBackToLogin,
  initialEmail = '',
}) => {
  const [emailOrMatric, setEmailOrMatric] = useState(initialEmail);
  const [isLoading, setIsLoading] = useState(false);
  const [isResending, setIsResending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [sentEmail, setSentEmail] = useState<string>('');
  const [studentName, setStudentName] = useState<string>('');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Send Firebase Password Reset Link
  const handleSendResetLink = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setErrorMessage(null);
    setToastMessage(null);

    const identifier = (sentEmail || emailOrMatric).trim();
    if (!identifier) {
      setErrorMessage('Please enter your registered student email or matric number.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await sendFirebasePasswordResetEmail(identifier);

      if (!result.success) {
        setErrorMessage(result.message || 'Unable to send password reset link. Please verify your details.');
        setIsLoading(false);
        return;
      }

      setSentEmail(result.email || identifier);
      if (result.studentName) {
        setStudentName(result.studentName);
      }
      setIsSuccess(true);
      setToastMessage(`Success! A password reset link has been dispatched to ${result.email || identifier}.`);

      // Auto-hide toast after 6 seconds
      setTimeout(() => {
        setToastMessage((prev) => (prev?.includes('Success') ? null : prev));
      }, 6000);
    } catch (err: any) {
      console.error('Firebase password reset error:', err);
      setErrorMessage(err?.message || 'An error occurred while sending the reset link. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  // Resend reset link
  const handleResend = async () => {
    if (!sentEmail && !emailOrMatric) return;
    setErrorMessage(null);
    setIsResending(true);

    try {
      const target = sentEmail || emailOrMatric;
      const result = await sendFirebasePasswordResetEmail(target);

      if (result.success) {
        setToastMessage(`A fresh password reset link has been sent to ${result.email || target}.`);
        setTimeout(() => {
          setToastMessage(null);
        }, 5000);
      } else {
        setErrorMessage(result.message || 'Failed to resend reset link.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Could not resend reset link.');
    } finally {
      setIsResending(false);
    }
  };

  return (
    <div id="forgot-password-screen" className="w-full max-w-lg min-h-screen flex flex-col justify-center px-4 sm:px-6 py-8 relative select-none">
      {/* Background soft ambient orbs */}
      <div className="fixed top-[-100px] left-[-80px] w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-blue-300/35 to-sky-200/40 blur-[90px] pointer-events-none -z-10" />
      <div className="fixed top-[280px] right-[-100px] w-[360px] h-[360px] rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/25 blur-[100px] pointer-events-none -z-10" />

      {/* Floating Success / Info Toast */}
      <AnimatePresence>
        {toastMessage && (
          <motion.div
            id="password-reset-toast"
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="fixed top-5 left-1/2 transform -translate-x-1/2 z-50 max-w-md w-[90%] sm:w-auto px-4 py-3 rounded-2xl bg-emerald-900/95 text-white shadow-xl shadow-emerald-900/20 backdrop-blur-md flex items-center gap-3 border border-emerald-700/50"
          >
            <div className="w-7 h-7 rounded-full bg-emerald-500/30 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-4 h-4 text-emerald-300" />
            </div>
            <p className="text-[13px] font-medium leading-snug">{toastMessage}</p>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="w-full max-w-md mx-auto space-y-5"
      >
        {/* Back to sign in button */}
        <button
          id="btn-back-to-login"
          type="button"
          onClick={() => onBackToLogin(sentEmail || emailOrMatric)}
          className="flex items-center gap-1.5 py-1.5 px-3.5 rounded-full bg-white/90 border border-slate-200/80 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold text-[12px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Back to Sign In</span>
        </button>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              id="password-reset-error"
              initial={{ opacity: 0, height: 0, y: -6 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -6 }}
              className="flex items-center gap-2.5 p-3.5 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-[12.5px] font-medium"
            >
              <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
              <span>{errorMessage}</span>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ================= STATE 1: REQUEST RESET LINK FORM ================= */}
        {!isSuccess ? (
          <div id="reset-request-card" className="space-y-5">
            {/* Header */}
            <div className="text-center">
              <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center mx-auto shadow-md shadow-blue-500/25 mb-3">
                <KeyRound className="w-7 h-7" />
              </div>
              <h1 className="text-[24px] font-extrabold text-[#1C1C1E] tracking-tight">
                Reset Password
              </h1>
              <p className="text-[13px] text-[#8E8E93] mt-1 font-medium">
                Enter your registered student email or matric number to receive a secure Firebase password reset link.
              </p>
            </div>

            <form onSubmit={handleSendResetLink} className="space-y-4">
              <div>
                <label className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                  Student Email or Matric Number
                </label>
                <div className="relative flex items-center">
                  <div className="absolute left-4 text-slate-400 pointer-events-none">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    id="reset-identifier-input"
                    type="text"
                    value={emailOrMatric}
                    onChange={(e) => setEmailOrMatric(e.target.value)}
                    placeholder="student@university.edu or Matric No."
                    required
                    autoFocus
                    className="w-full pl-11 pr-4 py-3.5 rounded-2xl bg-white border border-slate-200/90 text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:border-[#007AFF] transition-all shadow-2xs font-medium"
                  />
                </div>
              </div>

              <button
                id="btn-send-reset-link"
                type="submit"
                disabled={isLoading}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[14.5px] shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98] mt-2"
              >
                {isLoading ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Sending Reset Link...</span>
                  </div>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Send Reset Link</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <p className="text-[12px] text-slate-500">
                Remember your password?{' '}
                <button
                  id="btn-link-back-login"
                  type="button"
                  onClick={() => onBackToLogin(emailOrMatric)}
                  className="font-bold text-[#007AFF] hover:underline cursor-pointer"
                >
                  Sign In
                </button>
              </p>
            </div>
          </div>
        ) : (
          /* ================= STATE 2: SUCCESS & EMAIL INSTRUCTIONS ================= */
          <motion.div
            id="reset-success-instructions"
            initial={{ opacity: 0, scale: 0.96 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.3 }}
            className="space-y-5"
          >
            {/* Header Icon */}
            <div className="text-center">
              <div className="w-16 h-16 rounded-3xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/25 mb-3">
                <Inbox className="w-8 h-8" />
              </div>
              <h1 className="text-[23px] font-extrabold text-[#1C1C1E] tracking-tight">
                Check Your Email
              </h1>
              <p className="text-[13px] text-slate-500 mt-1">
                We've sent a secure password reset link to your email address.
              </p>
            </div>

            {/* Target Email Badge */}
            <div className="p-3.5 rounded-2xl bg-blue-50/90 border border-blue-100 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl bg-[#007AFF]/10 text-[#007AFF] flex items-center justify-center shrink-0">
                <Mail className="w-4.5 h-4.5" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  Sent To
                </p>
                <p className="text-[13.5px] font-semibold text-slate-900 truncate font-mono">
                  {sentEmail}
                </p>
              </div>
            </div>

            {/* Step-by-step Instructions Card */}
            <div className="p-4.5 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-600" />
                <h2 className="text-[13px] font-bold text-slate-900">
                  Next Steps to Reset Your Password:
                </h2>
              </div>

              <ul className="space-y-2.5 text-[12.5px] text-slate-600 font-medium">
                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    1
                  </span>
                  <span>
                    Open your email inbox (and check your <strong>spam/junk folder</strong> if you don't see it).
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    2
                  </span>
                  <span>
                    Click on the <strong>password reset link</strong> provided in the email from Firebase.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    3
                  </span>
                  <span>
                    Enter and confirm your new secure password on the reset page.
                  </span>
                </li>

                <li className="flex items-start gap-2.5">
                  <span className="w-5 h-5 rounded-full bg-slate-100 text-slate-700 font-bold text-[11px] flex items-center justify-center shrink-0 mt-0.5">
                    4
                  </span>
                  <span>
                    Return to this portal and sign in with your updated password.
                  </span>
                </li>
              </ul>
            </div>

            {/* Actions */}
            <div className="space-y-2.5 pt-1">
              <button
                id="btn-return-login-success"
                type="button"
                onClick={() => onBackToLogin(sentEmail)}
                className="w-full py-3.5 px-5 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[14.5px] shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-[0.98]"
              >
                <span>Back to Sign In</span>
              </button>

              <button
                id="btn-resend-reset-link"
                type="button"
                onClick={handleResend}
                disabled={isResending}
                className="w-full py-2.5 px-4 rounded-xl text-slate-600 hover:text-slate-800 text-[12.5px] font-semibold flex items-center justify-center gap-1.5 transition-all cursor-pointer disabled:opacity-50 hover:bg-slate-100/60"
              >
                <RotateCcw className={`w-3.5 h-3.5 ${isResending ? 'animate-spin' : ''}`} />
                <span>{isResending ? 'Resending reset link...' : "Didn't receive the email? Resend link"}</span>
              </button>
            </div>
          </motion.div>
        )}
      </motion.div>
    </div>
  );
};


