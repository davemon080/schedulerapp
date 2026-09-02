import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { ArrowLeft, Lock, Eye, EyeOff, Check, AlertCircle, ShieldCheck, ShieldAlert, KeyRound } from 'lucide-react';
import { UserSession } from '../types';
import { updateStudentUser, fetchStudentByEmailOrMatric } from '../lib/dbService';
import { auth } from '../lib/firebase';
import { updatePassword } from 'firebase/auth';

interface PasswordSettingsPageProps {
  onBack: () => void;
  userSession?: UserSession | null;
  onSessionUpdated?: (updates: Partial<UserSession>) => void;
  onShowToast?: (msg: string) => void;
}

export const PasswordSettingsPage: React.FC<PasswordSettingsPageProps> = ({
  onBack,
  userSession,
  onSessionUpdated,
  onShowToast,
}) => {
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingStatus, setIsCheckingStatus] = useState(true);
  const [hasCustomPassword, setHasCustomPassword] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Check initial password status from database
  useEffect(() => {
    let isMounted = true;
    const checkPasswordStatus = async () => {
      try {
        const identifier = userSession?.email || userSession?.matricNumber || userSession?.uid || userSession?.id;
        if (identifier) {
          const profile = await fetchStudentByEmailOrMatric(identifier);
          if (isMounted && profile) {
            const isCustom = Boolean(
              (profile.password && profile.password !== '123456') ||
              (profile.portal_password && profile.portal_password !== '123456') ||
              profile.password_changed ||
              profile.has_custom_password ||
              profile.is_default_password === false
            );
            setHasCustomPassword(isCustom);
          }
        }
      } catch (err) {
        console.warn('Error verifying password status:', err);
      } finally {
        if (isMounted) setIsCheckingStatus(false);
      }
    };

    checkPasswordStatus();
    return () => {
      isMounted = false;
    };
  }, [userSession?.email, userSession?.matricNumber, userSession?.uid, userSession?.id]);

  const calculateStrength = (pwd: string) => {
    if (!pwd) return { score: 0, label: 'None', color: 'bg-slate-200' };
    let score = 0;
    if (pwd.length >= 6) score += 1;
    if (pwd.length >= 8) score += 1;
    if (/[A-Z]/.test(pwd)) score += 1;
    if (/[0-9]/.test(pwd)) score += 1;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 1;

    if (score <= 1) return { score: 1, label: 'Weak', color: 'bg-red-500' };
    if (score <= 3) return { score: 2, label: 'Medium', color: 'bg-amber-500' };
    return { score: 3, label: 'Strong', color: 'bg-emerald-500' };
  };

  const strength = calculateStrength(newPassword);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedCurrent = currentPassword.trim();
    const trimmedNew = newPassword.trim();
    const trimmedConfirm = confirmPassword.trim();

    if (!trimmedCurrent) {
      setErrorMessage('Please enter your current password.');
      return;
    }

    if (!trimmedNew) {
      setErrorMessage('Please enter a new password.');
      return;
    }

    if (trimmedNew.length < 6) {
      setErrorMessage('New password must be at least 6 characters long.');
      return;
    }

    if (trimmedNew === '123456') {
      setErrorMessage('New password cannot be the default password (123456). Please choose a private custom password.');
      return;
    }

    if (trimmedNew === trimmedCurrent) {
      setErrorMessage('New password cannot be the same as your current password.');
      return;
    }

    if (trimmedNew !== trimmedConfirm) {
      setErrorMessage('New passwords do not match. Please verify.');
      return;
    }

    setIsLoading(true);

    try {
      const studentIdentifier = userSession?.uid || userSession?.id || userSession?.email || userSession?.matricNumber;
      if (!studentIdentifier) {
        setErrorMessage('User session not found. Please log in again.');
        setIsLoading(false);
        return;
      }

      // Verify current password against fresh database record
      const studentProfile = await fetchStudentByEmailOrMatric(userSession.email || userSession.matricNumber);
      
      const isProfileCustom = Boolean(
        (studentProfile?.password && studentProfile.password !== '123456') ||
        (studentProfile?.portal_password && studentProfile.portal_password !== '123456') ||
        studentProfile?.password_changed ||
        studentProfile?.has_custom_password ||
        studentProfile?.is_default_password === false
      );

      const expectedPassword = studentProfile?.password || studentProfile?.portal_password || '123456';

      // Strict default password invalidation check
      if (isProfileCustom) {
        if (trimmedCurrent === '123456' && expectedPassword !== '123456') {
          setErrorMessage('The default password (123456) is no longer valid because your password was previously changed. Please enter your current custom password.');
          setIsLoading(false);
          return;
        }
        if (trimmedCurrent !== expectedPassword) {
          setErrorMessage('Current password is incorrect. Please verify your custom password.');
          setIsLoading(false);
          return;
        }
      } else {
        // Account still on default password
        if (trimmedCurrent !== '123456' && trimmedCurrent !== expectedPassword) {
          setErrorMessage('Current password is incorrect. Your initial default password is 123456.');
          setIsLoading(false);
          return;
        }
      }

      // Update password in Firestore with strict custom flag
      const nowIso = new Date().toISOString();
      const updateData = {
        password: trimmedNew,
        portal_password: trimmedNew,
        password_changed: true,
        has_custom_password: true,
        is_default_password: false,
        password_updated_at: nowIso,
      };

      const success = await updateStudentUser(studentIdentifier, updateData);

      if (!success) {
        throw new Error('Failed to update password in database. Please try again.');
      }

      // Also ensure update applies to profile document ID if different
      if (studentProfile?.id && studentProfile.id !== studentIdentifier) {
        await updateStudentUser(studentProfile.id, updateData);
      }

      // Update Firebase Auth password if an active auth user session exists
      try {
        if (auth.currentUser) {
          await updatePassword(auth.currentUser, trimmedNew);
        }
      } catch (authErr) {
        console.warn('Firebase Auth password update notice:', authErr);
      }

      // Explicitly store custom password key in localStorage for instantaneous recognition
      try {
        if (userSession?.email) {
          localStorage.setItem(`student_pwd_custom_${userSession.email.toLowerCase().trim()}`, trimmedNew);
        }
        if (userSession?.matricNumber) {
          localStorage.setItem(`student_pwd_custom_${userSession.matricNumber.replace(/[\s\/-]/g, '').toUpperCase()}`, trimmedNew);
        }
        if (studentProfile?.email) {
          localStorage.setItem(`student_pwd_custom_${studentProfile.email.toLowerCase().trim()}`, trimmedNew);
        }
        const sMatricClean = (studentProfile?.matric_number || studentProfile?.matricNumber || '').replace(/[\s\/-]/g, '').toUpperCase();
        if (sMatricClean) {
          localStorage.setItem(`student_pwd_custom_${sMatricClean}`, trimmedNew);
        }
      } catch {}

      // Update local storage user session
      try {
        const saved = localStorage.getItem('university_schedule_user');
        if (saved) {
          const parsed = JSON.parse(saved);
          parsed.password = trimmedNew;
          parsed.portal_password = trimmedNew;
          parsed.password_changed = true;
          parsed.has_custom_password = true;
          parsed.is_default_password = false;
          parsed.password_updated_at = nowIso;
          localStorage.setItem('university_schedule_user', JSON.stringify(parsed));
        }
      } catch (err) {
        console.warn('Local session password update notice:', err);
      }

      if (onSessionUpdated) {
        onSessionUpdated({
          ...userSession,
          password: trimmedNew,
          password_changed: true,
          has_custom_password: true,
          is_default_password: false,
          password_updated_at: nowIso,
        });
      }

      setHasCustomPassword(true);
      setSuccessMessage('Password changed successfully! The default password (123456) has been permanently deactivated.');
      if (onShowToast) {
        onShowToast('Password updated. Default password deactivated.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      console.error('Password change error:', err);
      setErrorMessage(err?.message || 'Failed to update password. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      transition={{ duration: 0.2 }}
      className="space-y-4 pb-24"
    >
      {/* Top Header */}
      <div className="flex items-center justify-between">
        <button
          id="btn-password-back"
          onClick={onBack}
          className="flex items-center gap-1.5 py-1.5 px-3 rounded-full bg-white/90 border border-slate-200/80 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold text-[12px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Back</span>
        </button>

        <h2 className="text-[15px] font-bold text-[#1C1C1E]">Change Password</h2>
      </div>

      {/* Security Status Info Card */}
      {!isCheckingStatus && (
        <div
          id="password-status-banner"
          className={`p-3.5 rounded-2xl border transition-all ${
            hasCustomPassword
              ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-900'
              : 'bg-amber-50/80 border-amber-200/90 text-amber-900'
          }`}
        >
          <div className="flex items-start gap-2.5">
            {hasCustomPassword ? (
              <ShieldCheck className="w-4.5 h-4.5 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <ShieldAlert className="w-4.5 h-4.5 text-amber-600 shrink-0 mt-0.5" />
            )}
            <div className="space-y-0.5">
              <p className="text-[12.5px] font-bold">
                {hasCustomPassword ? 'Custom Password Active' : 'Default Password Active'}
              </p>
              <p className="text-[11.5px] leading-relaxed opacity-90">
                {hasCustomPassword
                  ? 'Your account is secured with a custom password. The default password (123456) is disabled.'
                  : 'Your account is currently using the default password (123456). Update your password now to secure your portal; the default password will no longer be applicable once changed.'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Direct Alert Messages */}
      <AnimatePresence>
        {errorMessage && (
          <motion.div
            id="password-error-alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 p-3 rounded-2xl bg-red-50 border border-red-200 text-red-700 text-[12.5px] font-medium"
          >
            <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
            <span>{errorMessage}</span>
          </motion.div>
        )}

        {successMessage && (
          <motion.div
            id="password-success-alert"
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -6 }}
            className="flex items-center gap-2 p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-[12.5px] font-medium"
          >
            <Check className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{successMessage}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Password Form directly on screen */}
      <form onSubmit={handleSubmit} className="space-y-3.5">
        {/* Current Password */}
        <div>
          <label className="block text-[12.5px] font-bold text-slate-800 mb-1">
            Current Password
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <KeyRound className="w-4 h-4" />
            </div>
            <input
              id="input-current-password"
              type={showCurrentPassword ? 'text' : 'password'}
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder={hasCustomPassword ? 'Enter current custom password' : 'Enter current password (default: 123456)'}
              required
              className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white border border-slate-200/90 text-[13.5px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:border-[#007AFF] transition-all shadow-2xs font-medium"
            />
            <button
              type="button"
              onClick={() => setShowCurrentPassword(!showCurrentPassword)}
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              {showCurrentPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* New Password */}
        <div>
          <label className="block text-[12.5px] font-bold text-slate-800 mb-1">
            New Password
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="input-new-password"
              type={showNewPassword ? 'text' : 'password'}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="Enter at least 6 characters"
              required
              className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white border border-slate-200/90 text-[13.5px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:border-[#007AFF] transition-all shadow-2xs font-medium"
            />
            <button
              type="button"
              onClick={() => setShowNewPassword(!showNewPassword)}
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              {showNewPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>

          {/* Password Strength Indicator */}
          {newPassword.length > 0 && (
            <div className="mt-2 space-y-1">
              <div className="flex justify-between items-center text-[11px] text-slate-500 font-medium">
                <span>Strength</span>
                <span className="font-bold text-slate-700">{strength.label}</span>
              </div>
              <div className="h-1.5 w-full bg-slate-100 rounded-full overflow-hidden flex gap-1">
                <div
                  className={`h-full transition-all duration-300 ${
                    strength.score >= 1 ? strength.color : 'bg-slate-200'
                  }`}
                  style={{ width: '33.33%' }}
                />
                <div
                  className={`h-full transition-all duration-300 ${
                    strength.score >= 2 ? strength.color : 'bg-slate-200'
                  }`}
                  style={{ width: '33.33%' }}
                />
                <div
                  className={`h-full transition-all duration-300 ${
                    strength.score >= 3 ? strength.color : 'bg-slate-200'
                  }`}
                  style={{ width: '33.33%' }}
                />
              </div>
            </div>
          )}
        </div>

        {/* Confirm New Password */}
        <div>
          <label className="block text-[12.5px] font-bold text-slate-800 mb-1">
            Confirm New Password
          </label>
          <div className="relative flex items-center">
            <div className="absolute left-3.5 text-slate-400 pointer-events-none">
              <Lock className="w-4 h-4" />
            </div>
            <input
              id="input-confirm-password"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              placeholder="Re-enter new password"
              required
              className="w-full pl-10 pr-11 py-3 rounded-2xl bg-white border border-slate-200/90 text-[13.5px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:border-[#007AFF] transition-all shadow-2xs font-medium"
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-3 p-1.5 text-slate-400 hover:text-slate-600 rounded-full cursor-pointer"
            >
              {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>

        {/* Submit Button */}
        <button
          id="btn-update-password-submit"
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-5 rounded-2xl bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[14px] shadow-md shadow-blue-500/25 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60 active:scale-[0.98] mt-2"
        >
          {isLoading ? (
            <div className="flex items-center gap-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              <span>Updating Password...</span>
            </div>
          ) : (
            <>
              <ShieldCheck className="w-4 h-4" />
              <span>Update Password</span>
            </>
          )}
        </button>
      </form>
    </motion.div>
  );
};
