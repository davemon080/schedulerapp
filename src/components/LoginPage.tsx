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
  AlertCircle,
  FlaskConical,
  Sparkles,
} from 'lucide-react';
import { UserSession } from '../types';
import { auth } from '../lib/firebase';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { fetchStudentByAuthUid, fetchStudentByEmailOrMatric, fetchCurrentSemester, normalizeSemester } from '../lib/dbService';
import { getStudentActiveLevel, getStudentActiveSemester } from '../lib/academicScope';

interface LoginPageProps {
  onLogin: (session: UserSession) => void;
  initialEmail?: string;
  initialMatric?: string;
}

export const LoginPage: React.FC<LoginPageProps> = ({
  onLogin,
  initialEmail = '',
  initialMatric = '',
}) => {
  const [email, setEmail] = useState(initialEmail);
  const [matricNumber, setMatricNumber] = useState(initialMatric);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleFillICH = () => {
    setEmail('simonodavido@gmail.com');
    setMatricNumber('2025/PS/ICH/0001');
    setPassword('123456');
    setErrorMessage(null);
  };

  const handleFillCHM = () => {
    setEmail('chemistry.student@university.edu');
    setMatricNumber('2025/PS/CHM/0001');
    setPassword('123456');
    setErrorMessage(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = email.trim().toLowerCase();
    const trimmedMatric = matricNumber.trim().toUpperCase();
    const trimmedPassword = password.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your student email address.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid email address (e.g. simonodavido@gmail.com).');
      return;
    }

    if (!trimmedMatric) {
      setErrorMessage('Please enter your Matriculation Number.');
      return;
    }

    if (trimmedMatric.length < 4) {
      setErrorMessage('Please enter a valid Matric Number (e.g. 2025/PS/ICH/000).');
      return;
    }

    if (!trimmedPassword) {
      setErrorMessage('Please enter your portal password.');
      return;
    }

    setIsLoading(true);

    try {
      // 0. Super Admin account separation check
      if (trimmedEmail.toLowerCase() === 'davemon080@gmail.com') {
        setErrorMessage('This is a Super Administrator account. Please click "Administrator Access" in the top bar to log into the Admin Dashboard.');
        setIsLoading(false);
        return;
      }

      // 1. Fetch student profile from Firestore by email or matric number first to verify database registration
      let studentProfile = await fetchStudentByEmailOrMatric(trimmedEmail) || await fetchStudentByEmailOrMatric(trimmedMatric);

      // 2. Authenticate with Firebase Auth if available
      let authUserUid: string | null = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        authUserUid = userCredential.user.uid;
      } catch (authErr: any) {
        // Handled via database password check below
      }

      if (authUserUid && !studentProfile) {
        studentProfile = await fetchStudentByAuthUid(authUserUid);
      }

      // If no account exists in the database, reject login
      if (!studentProfile && !authUserUid) {
        setErrorMessage('No registered student account found matching this email or matric number. Please contact your department administrator.');
        setIsLoading(false);
        return;
      }

      // 3. Strict verification of database credentials
      if (studentProfile) {
        // Verify matric number matches the database record if provided
        const dbMatricClean = (studentProfile.matric_number || studentProfile.matricNumber || '').replace(/[\s\/-]/g, '').toUpperCase();
        const enteredMatricClean = trimmedMatric.replace(/[\s\/-]/g, '').toUpperCase();
        if (enteredMatricClean && dbMatricClean && enteredMatricClean !== dbMatricClean) {
          setErrorMessage('Matriculation number does not match the registered student profile for this email.');
          setIsLoading(false);
          return;
        }

        // Verify password matches database password (or default 123456 if unset)
        const expectedPassword = studentProfile.password || studentProfile.portal_password || '123456';
        if (!authUserUid && trimmedPassword !== expectedPassword) {
          setErrorMessage('Incorrect password. Please verify your portal password (default: 123456).');
          setIsLoading(false);
          return;
        }
      }

      // Derive display info
      const studentUid = authUserUid || studentProfile?.uid || studentProfile?.id || 'usr_' + trimmedEmail.replace(/[@.]/g, '_');
      const studentName = studentProfile?.full_name || studentProfile?.fullName || studentProfile?.name || trimmedEmail.split('@')[0];
      const department = studentProfile?.department || 'Department of Industrial Chemistry';
      const departmentId = studentProfile?.department_id || (department.toLowerCase().includes('industrial') ? 'dept-ich' : 'dept-chm');
      const activeLevel = getStudentActiveLevel(studentProfile);
      
      // Fetch the live university semester from Firestore to ensure immediate alignment with admin dashboard
      let activeSemester = '1st Semester';
      let activeSession = '2025/2026';
      try {
        const semDoc = await fetchCurrentSemester();
        if (semDoc?.semester_code) {
          activeSemester = normalizeSemester(semDoc.semester_code);
          const sMatch = semDoc.semester_code.match(/\d{4}\/\d{4}/);
          if (sMatch) activeSession = sMatch[0];
        }
      } catch (sErr) {
        console.warn('Could not fetch active semester on login:', sErr);
        activeSemester = getStudentActiveSemester(studentProfile, '1st Semester');
      }

      const yearLevel = `${activeLevel} Level`;
      const verifiedMatric = studentProfile?.matric_number || studentProfile?.matricNumber || trimmedMatric;

      const profilePic = studentProfile?.profile_pic_url || studentProfile?.profileImage || studentProfile?.photoURL || '';

      const isAdminAccount = Boolean(studentProfile?.isadmin || studentProfile?.isAdmin);
      const isCourseRepAccount = Boolean(studentProfile?.iscourserep || studentProfile?.isCourseRep);
      // Only Course Reps and Admins get free semester access. Standard students must pay.
      const isUserPaid = Boolean(
        isAdminAccount ||
        isCourseRepAccount ||
        studentProfile?.is_paid ||
        studentProfile?.is_payed
      );

      const userWalletBal = typeof studentProfile?.wallet_balance === 'number' 
        ? studentProfile.wallet_balance 
        : (typeof studentProfile?.walletBalance === 'number' ? studentProfile.walletBalance : 0);

      onLogin({
        id: studentUid,
        uid: studentUid,
        email: trimmedEmail,
        matricNumber: verifiedMatric,
        fullName: studentName,
        department: department,
        department_id: departmentId,
        faculty: 'Physical Sciences',
        level: activeLevel,
        yearLevel: yearLevel,
        year_level: yearLevel,
        semester: activeSemester,
        current_semester: activeSemester,
        session: activeSession,
        academic_session: activeSession,
        profileImage: profilePic,
        profile_pic_url: profilePic,
        isAdmin: isAdminAccount,
        isCourseRep: isCourseRepAccount,
        is_payed: isUserPaid,
        is_paid: isUserPaid,
        hasFreeAccess: isCourseRepAccount || isAdminAccount,
        wallet_balance: userWalletBal,
        walletBalance: userWalletBal,
        paid_semester: studentProfile?.paid_semester,
        paid_at: studentProfile?.paid_at,
        isLoggedIn: true,
      });
    } catch (err: any) {
      console.error('Login error:', err);
      setErrorMessage(err?.message || 'Authentication error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div id="login-screen" className="w-full max-w-lg min-h-screen flex flex-col justify-center px-4 sm:px-6 py-8 relative select-none">
      {/* Ambient background soft light orbs matching the main app */}
      <div className="fixed top-[-100px] left-[-80px] w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-blue-300/35 to-sky-200/40 blur-[90px] pointer-events-none -z-10" />
      <div className="fixed top-[280px] right-[-100px] w-[360px] h-[360px] rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/25 blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-60px] left-[15%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-sky-200/35 to-emerald-100/30 blur-[110px] pointer-events-none -z-10" />

      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
        className="w-full max-w-md mx-auto"
      >
        {/* Header Brand Section directly on screen */}
        <div className="flex flex-col items-center text-center mb-8">
          <div className="relative mb-3.5">
            <div className="w-16 h-16 rounded-[22px] bg-gradient-to-tr from-[#007AFF] via-[#0A84FF] to-sky-400 p-[2px] shadow-lg shadow-blue-500/25 flex items-center justify-center">
              <div className="w-full h-full bg-white rounded-[20px] backdrop-blur-md flex items-center justify-center text-[#007AFF]">
                <FlaskConical className="w-8 h-8 stroke-[2.2]" />
              </div>
            </div>
            <div className="absolute -bottom-1 -right-1 bg-[#007AFF] text-white rounded-full p-1 border-2 border-white shadow-xs">
              <GraduationCap className="w-3.5 h-3.5" />
            </div>
          </div>

          <h1 className="text-[26px] sm:text-[28px] font-extrabold text-[#1C1C1E] tracking-tight leading-tight">
            Student Portal
          </h1>
          <p className="text-[13.5px] text-[#8E8E93] mt-1.5 font-medium max-w-xs leading-snug">
            Sign in with your email, matric number, and password to access your timetable.
          </p>
        </div>

        {/* Error Alert */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -8 }}
              animate={{ opacity: 1, height: 'auto', y: 0 }}
              exit={{ opacity: 0, height: 0, y: -8 }}
              className="mb-4 overflow-hidden"
            >
              <div className="flex items-center gap-2.5 p-3.5 rounded-[20px] bg-red-50/95 border border-red-200/80 text-red-700 text-[13px] font-medium shadow-2xs">
                <AlertCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="flex-1 leading-snug">{errorMessage}</span>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Login Form directly rendered without surrounding card box */}
        <form id="student-login-form" onSubmit={handleSubmit} className="space-y-4">
          {/* Email Field */}
          <div>
            <label htmlFor="login-email-input" className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
              Student Email
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 pointer-events-none">
                <Mail className="w-4 h-4" />
              </div>
              <input
                id="login-email-input"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="e.g. r.ogwu@student.university.edu"
                required
                autoComplete="email"
                className="w-full pl-11 pr-4 py-3.5 rounded-[22px] bg-white border border-slate-200/90 text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-medium"
              />
            </div>
          </div>

          {/* Matriculation Number Field */}
          <div>
            <label htmlFor="login-matric-input" className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
              Matriculation Number (Matric)
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 pointer-events-none">
                <GraduationCap className="w-4 h-4" />
              </div>
              <input
                id="login-matric-input"
                type="text"
                value={matricNumber}
                onChange={(e) => setMatricNumber(e.target.value.toUpperCase())}
                placeholder="e.g. 2025/PS/ICH/000"
                required
                autoCapitalize="characters"
                className="w-full pl-11 pr-4 py-3.5 rounded-[22px] bg-white border border-slate-200/90 text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-semibold uppercase tracking-wider"
              />
            </div>
          </div>

          {/* Password Field */}
          <div>
            <label htmlFor="login-password-input" className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
              Password
            </label>
            <div className="relative flex items-center">
              <div className="absolute left-4 text-slate-400 pointer-events-none">
                <Lock className="w-4 h-4" />
              </div>
              <input
                id="login-password-input"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full pl-11 pr-12 py-3.5 rounded-[22px] bg-white border border-slate-200/90 text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-medium"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full transition-colors cursor-pointer"
                title={showPassword ? 'Hide password' : 'Show password'}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? (
                  <EyeOff className="w-4 h-4" />
                ) : (
                  <Eye className="w-4 h-4" />
                )}
              </button>
            </div>
          </div>

          {/* Remember Me Option */}
          <div className="flex items-center justify-between px-1 pt-1">
            <label className="flex items-center gap-2 cursor-pointer text-[13px] font-medium text-[#1C1C1E]">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="w-4 h-4 rounded text-[#007AFF] focus:ring-[#007AFF]/30 border-slate-300 accent-[#007AFF] cursor-pointer"
              />
              <span>Remember me</span>
            </label>
            <span className="text-[12px] font-semibold text-slate-400 flex items-center gap-1">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              <span>Portal Secure</span>
            </span>
          </div>

          {/* Sign In Button */}
          <motion.button
            id="login-submit-btn"
            type="submit"
            disabled={isLoading}
            whileTap={{ scale: 0.98 }}
            whileHover={{ scale: 1.01 }}
            className="w-full py-3.5 px-5 rounded-[22px] bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[15px] shadow-[0_8px_24px_rgba(0,122,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-70 mt-4"
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

        {/* Quick Demo Pre-fill Pills */}
        <div className="mt-6 flex flex-col items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Quick Fill Demo Student</span>
          <div className="flex flex-wrap items-center justify-center gap-2">
            <button
              id="fill-demo-ich-btn"
              type="button"
              onClick={handleFillICH}
              className="px-3.5 py-1.5 rounded-full bg-blue-50 hover:bg-blue-100 text-[#007AFF] text-[12px] font-bold border border-blue-200 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Industrial Chem (ICH)</span>
            </button>
            <button
              id="fill-demo-chm-btn"
              type="button"
              onClick={handleFillCHM}
              className="px-3.5 py-1.5 rounded-full bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[12px] font-bold border border-emerald-200 transition-all flex items-center gap-1.5 shadow-2xs active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Chemistry (CHM)</span>
            </button>
          </div>
        </div>

        {/* Security / Portal footer */}
        <div className="text-center mt-8 text-[12px] text-[#8E8E93] flex items-center justify-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
          <span>Student Schedule & Academic Portal</span>
        </div>
      </motion.div>
    </div>
  );
};

