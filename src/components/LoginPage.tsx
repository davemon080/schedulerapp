import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Mail,
  Lock,
  GraduationCap,
  Eye,
  EyeOff,
  ArrowRight,
  ArrowLeft,
  ShieldCheck,
  AlertCircle,
  FlaskConical,
  Sparkles,
  User,
  CheckCircle2,
  Building2,
  Calendar,
  Layers,
  Loader2,
  Check,
  School,
  Compass,
} from 'lucide-react';
import { UserSession } from '../types';
import { auth, db } from '../lib/firebase';
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  updatePassword,
  updateProfile,
} from 'firebase/auth';
import {
  fetchStudentByAuthUid,
  fetchStudentByEmailOrMatric,
  fetchStudents,
  fetchCurrentSemester,
  fetchDepartments,
  createStudentUser,
  detectDepartmentFromMatric,
  normalizeSemester,
  registerUserActiveSession,
  recordAppVisit,
  DepartmentRecord,
} from '../lib/dbService';
import { getStudentActiveLevel, getStudentActiveSemester } from '../lib/academicScope';
import { ForgotPasswordPage } from './ForgotPasswordPage';

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
  // Auth Mode: 'login' | 'register'
  const [authMode, setAuthMode] = useState<'login' | 'register'>('login');

  // Sign In Form State
  const [email, setEmail] = useState(initialEmail);
  const [matricNumber, setMatricNumber] = useState(initialMatric);
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isForgotPasswordOpen, setIsForgotPasswordOpen] = useState(false);

  // Onboarding & Registration Form State
  const [onboardingStep, setOnboardingStep] = useState<1 | 2>(1);
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regMatric, setRegMatric] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [showRegPassword, setShowRegPassword] = useState(false);
  const [showRegConfirmPassword, setShowRegConfirmPassword] = useState(false);

  // Step 2: Academic Profile State
  const [departments, setDepartments] = useState<DepartmentRecord[]>([]);
  const [selectedDeptId, setSelectedDeptId] = useState<string>('dept-ich');
  const [selectedLevel, setSelectedLevel] = useState<number>(100);
  const [activeSemester, setActiveSemester] = useState<string>('1st Semester');
  const [activeSession, setActiveSession] = useState<string>('2025/2026');
  const [isFetchingAcademicConfig, setIsFetchingAcademicConfig] = useState(false);

  // Loading State during finish up
  const [isCreatingAccount, setIsCreatingAccount] = useState(false);
  const [creationStatus, setCreationStatus] = useState<string>('Setting up your student account...');

  // Fetch departments and active semester on mount
  useEffect(() => {
    let isCancelled = false;
    const loadAcademicData = async () => {
      setIsFetchingAcademicConfig(true);
      try {
        const [depts, semDoc] = await Promise.all([
          fetchDepartments(),
          fetchCurrentSemester(),
        ]);

        if (!isCancelled) {
          if (depts && depts.length > 0) {
            setDepartments(depts);
          }
          if (semDoc?.semester_code) {
            setActiveSemester(normalizeSemester(semDoc.semester_code));
            const sMatch = semDoc.semester_code.match(/\d{4}\/\d{4}/);
            if (sMatch) setActiveSession(sMatch[0]);
          }
        }
      } catch (err) {
        console.warn('Could not prefetch academic config:', err);
      } finally {
        if (!isCancelled) setIsFetchingAcademicConfig(false);
      }
    };

    loadAcademicData();
    return () => {
      isCancelled = true;
    };
  }, []);

  // When matriculation number changes in registration step 1, auto-detect department suggestion
  useEffect(() => {
    if (regMatric.trim().length >= 3 && departments.length > 0) {
      const detected = detectDepartmentFromMatric(regMatric, departments);
      if (detected && detected.department_id) {
        setSelectedDeptId(detected.department_id);
      }
    }
  }, [regMatric, departments]);

  if (isForgotPasswordOpen) {
    return (
      <ForgotPasswordPage
        initialEmail={email}
        onBackToLogin={(newEmail) => {
          setIsForgotPasswordOpen(false);
          if (newEmail) {
            setEmail(newEmail);
          }
        }}
      />
    );
  }

  // =================== SIGN IN HANDLER ===================
  const handleLoginSubmit = async (e: React.FormEvent) => {
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
      setErrorMessage('Please enter a valid email address (e.g. student@university.edu).');
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

      // 1. Fetch student profile from Firestore by email or matric number first
      let studentProfile = await fetchStudentByEmailOrMatric(trimmedEmail) || await fetchStudentByEmailOrMatric(trimmedMatric);

      // Fallback: Scan all students if not returned by direct index
      if (!studentProfile) {
        try {
          const allStudents = await fetchStudents();
          const cleanEmailMatch = trimmedEmail.toLowerCase();
          const cleanMatricMatch = trimmedMatric.replace(/[\s\/-]/g, '').toUpperCase();
          const found = allStudents.find((s) => {
            const sEmail = (s.email || '').toLowerCase().trim();
            const sMatric = (s.matric_number || s.matricNumber || '').replace(/[\s\/-]/g, '').toUpperCase();
            return (sEmail && sEmail === cleanEmailMatch) || (cleanMatricMatch && sMatric === cleanMatricMatch);
          });
          if (found) {
            studentProfile = found;
          }
        } catch {}
      }

      // If no account exists in the database, guide user to Create Account
      if (!studentProfile) {
        setErrorMessage('No registered student account found matching this email or matric number. Please click "Create Account" above to register.');
        setIsLoading(false);
        return;
      }

      // 2. Strict verification of Matriculation Number
      const dbMatricClean = (studentProfile.matric_number || studentProfile.matricNumber || '').replace(/[\s\/-]/g, '').toUpperCase();
      const enteredMatricClean = trimmedMatric.replace(/[\s\/-]/g, '').toUpperCase();
      if (enteredMatricClean && dbMatricClean && enteredMatricClean !== dbMatricClean) {
        setErrorMessage('Matriculation number does not match the registered student profile for this email.');
        setIsLoading(false);
        return;
      }

      // 3. Strict verification of password & Invalidation of default password
      let localCachedPwd: string | null = null;
      try {
        localCachedPwd =
          localStorage.getItem(`student_pwd_custom_${trimmedEmail}`) ||
          (studentProfile.email ? localStorage.getItem(`student_pwd_custom_${studentProfile.email.toLowerCase()}`) : null) ||
          (dbMatricClean ? localStorage.getItem(`student_pwd_custom_${dbMatricClean}`) : null);
      } catch {}

      const dbPassword = (studentProfile.password || studentProfile.portal_password || '').trim();
      const expectedPassword = localCachedPwd || dbPassword || '123456';

      const hasCustomPassword = Boolean(
        localCachedPwd ||
        (studentProfile.password && studentProfile.password !== '123456') ||
        (studentProfile.portal_password && studentProfile.portal_password !== '123456') ||
        studentProfile.password_changed ||
        studentProfile.has_custom_password ||
        studentProfile.is_default_password === false ||
        expectedPassword !== '123456'
      );

      // MANDATORY CHECK: Password entered by user MUST match the active expected password
      if (trimmedPassword !== expectedPassword) {
        try {
          await signOut(auth);
        } catch {}

        if (trimmedPassword === '123456' && hasCustomPassword) {
          setErrorMessage('The default password (123456) is no longer valid for this account because your password was changed. Please enter your updated password.');
        } else if (hasCustomPassword) {
          setErrorMessage('Incorrect password. Please enter your updated password or use Forgot Password to reset.');
        } else {
          setErrorMessage('Incorrect password. Please verify your portal password.');
        }
        setIsLoading(false);
        return;
      }

      // 4. Authenticate with Firebase Auth if available, syncing password if needed
      let authUserUid: string | null = null;
      try {
        const userCredential = await signInWithEmailAndPassword(auth, trimmedEmail, trimmedPassword);
        authUserUid = userCredential.user.uid;
      } catch (authErr: any) {
        try {
          const oldCred = await signInWithEmailAndPassword(auth, trimmedEmail, '123456');
          if (oldCred.user) {
            await updatePassword(oldCred.user, trimmedPassword);
            authUserUid = oldCred.user.uid;
          }
        } catch {}
      }

      // Derive display info
      const studentUid = authUserUid || studentProfile?.uid || studentProfile?.id || 'usr_' + trimmedEmail.replace(/[@.]/g, '_');
      const studentName = studentProfile?.full_name || studentProfile?.fullName || studentProfile?.name || trimmedEmail.split('@')[0];
      const department = studentProfile?.department || 'Department of Industrial Chemistry';
      const departmentId = studentProfile?.department_id || (department.toLowerCase().includes('industrial') ? 'dept-ich' : 'dept-chm');
      const activeLevel = getStudentActiveLevel(studentProfile);

      // Fetch the live university semester from Firestore to ensure immediate alignment with admin dashboard
      let currentSem = '1st Semester';
      let currentSess = '2025/2026';
      try {
        const semDoc = await fetchCurrentSemester();
        if (semDoc?.semester_code) {
          currentSem = normalizeSemester(semDoc.semester_code);
          const sMatch = semDoc.semester_code.match(/\d{4}\/\d{4}/);
          if (sMatch) currentSess = sMatch[0];
        }
      } catch (sErr) {
        console.warn('Could not fetch active semester on login:', sErr);
        currentSem = getStudentActiveSemester(studentProfile, '1st Semester');
      }

      const yearLevel = `${activeLevel} Level`;
      const verifiedMatric = studentProfile?.matric_number || studentProfile?.matricNumber || trimmedMatric;
      const profilePic = studentProfile?.profile_pic_url || studentProfile?.profileImage || studentProfile?.photoURL || '';

      const isAdminAccount = Boolean(studentProfile?.isadmin || studentProfile?.isAdmin);
      const isCourseRepAccount = Boolean(studentProfile?.iscourserep || studentProfile?.isCourseRep);
      const isUserPaid = Boolean(
        isAdminAccount ||
        isCourseRepAccount ||
        studentProfile?.is_paid ||
        studentProfile?.is_payed
      );

      const userWalletBal = typeof studentProfile?.wallet_balance === 'number' 
        ? studentProfile.wallet_balance 
        : (typeof studentProfile?.walletBalance === 'number' ? studentProfile.walletBalance : 0);

      // Single-Device Session Token Generation
      const deviceToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const detectedDevice = typeof navigator !== 'undefined'
        ? (/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iOS Mobile' : /Android/i.test(navigator.userAgent) ? 'Android Mobile' : /Macintosh|Mac OS X/i.test(navigator.userAgent) ? 'macOS Desktop' : 'Windows/Web Client')
        : 'Web Client';

      try {
        await registerUserActiveSession(studentUid, deviceToken, detectedDevice);
      } catch (sessErr) {
        console.warn('Active session registration warning:', sessErr);
      }

      try {
        await recordAppVisit({
          userId: studentUid,
          studentName: studentName,
          matricNumber: verifiedMatric,
          department: department,
          level: activeLevel,
          device: detectedDevice,
        });
      } catch (visitErr) {
        console.warn('App visit recording warning:', visitErr);
      }

      onLogin({
        id: studentUid,
        uid: studentUid,
        email: trimmedEmail,
        matricNumber: verifiedMatric,
        fullName: studentName,
        department: department,
        department_id: departmentId,
        faculty: (studentProfile as any)?.faculty || 'Physical Sciences',
        level: activeLevel,
        yearLevel: yearLevel,
        year_level: yearLevel,
        semester: currentSem,
        current_semester: currentSem,
        session: currentSess,
        academic_session: currentSess,
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

  // =================== ONBOARDING STEP 1: VALIDATE & PROCEED ===================
  const handleProceedToAcademicOnboarding = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const trimmedEmail = regEmail.trim().toLowerCase();
    const trimmedMatric = regMatric.trim().toUpperCase();
    const trimmedPass = regPassword.trim();
    const trimmedConfirmPass = regConfirmPassword.trim();

    if (!trimmedEmail) {
      setErrorMessage('Please enter your student email address.');
      return;
    }

    if (!trimmedEmail.includes('@') || !trimmedEmail.includes('.')) {
      setErrorMessage('Please enter a valid student email address (e.g. name@university.edu).');
      return;
    }

    if (!trimmedMatric) {
      setErrorMessage('Please enter your Matriculation Number.');
      return;
    }

    if (trimmedMatric.length < 4) {
      setErrorMessage('Please enter a valid Matric Number (e.g. 2025/PS/ICH/042).');
      return;
    }

    if (!trimmedPass) {
      setErrorMessage('Please enter a secure password.');
      return;
    }

    if (trimmedPass.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (!trimmedConfirmPass) {
      setErrorMessage('Please confirm your password by typing it again.');
      return;
    }

    // Explicit confirmation check
    if (trimmedPass !== trimmedConfirmPass) {
      setErrorMessage('Passwords do not match. Please ensure both password fields are identical.');
      return;
    }

    // Auto-detect department from matric number if possible
    if (departments.length > 0) {
      const detected = detectDepartmentFromMatric(trimmedMatric, departments);
      if (detected && detected.department_id) {
        setSelectedDeptId(detected.department_id);
      }
    }

    // Proceed to Step 2: Department and Level
    setOnboardingStep(2);
  };

  // =================== FINISH UP REGISTRATION HANDLER ===================
  const handleFinishUpRegistration = async () => {
    setErrorMessage(null);
    setIsCreatingAccount(true);
    setCreationStatus('Verifying account credentials...');

    const cleanEmail = regEmail.trim().toLowerCase();
    const cleanMatric = regMatric.trim().toUpperCase();
    const trimmedPassword = regPassword.trim();
    const studentName = regFullName.trim() || cleanEmail.split('@')[0].replace(/[._]/g, ' ') || 'Student User';

    try {
      // 1. Fetch fresh active semester configured by admin in Firestore
      setCreationStatus('Synchronizing with university active semester...');
      let semCode = '1st Semester';
      let sessCode = '2025/2026';
      try {
        const liveSemDoc = await fetchCurrentSemester();
        if (liveSemDoc?.semester_code) {
          semCode = normalizeSemester(liveSemDoc.semester_code);
          const sMatch = liveSemDoc.semester_code.match(/\d{4}\/\d{4}/);
          if (sMatch) sessCode = sMatch[0];
          setActiveSemester(semCode);
          setActiveSession(sessCode);
        }
      } catch (semErr) {
        console.warn('Semester sync error during registration:', semErr);
      }

      // 2. Check if user already exists in Firestore users
      setCreationStatus('Verifying student identity in directory...');
      const existingUser = await fetchStudentByEmailOrMatric(cleanEmail) || await fetchStudentByEmailOrMatric(cleanMatric);
      if (existingUser && (existingUser.password && existingUser.password !== '123456')) {
        setErrorMessage('An account with this email or matriculation number already exists. Please Sign In instead.');
        setIsCreatingAccount(false);
        setOnboardingStep(1);
        setAuthMode('login');
        setEmail(cleanEmail);
        setMatricNumber(cleanMatric);
        return;
      }

      // 3. Register user in Firebase Authentication
      setCreationStatus('Creating secure credentials in Firebase Auth...');
      let authUid: string | null = null;
      try {
        const userCred = await createUserWithEmailAndPassword(auth, cleanEmail, trimmedPassword);
        authUid = userCred.user.uid;
        if (userCred.user) {
          try {
            await updateProfile(userCred.user, { displayName: studentName });
          } catch {}
        }
      } catch (authErr: any) {
        // If email already in Firebase Auth, attempt sign-in or update password
        if (authErr?.code === 'auth/email-already-in-use') {
          try {
            const loginCred = await signInWithEmailAndPassword(auth, cleanEmail, trimmedPassword);
            authUid = loginCred.user.uid;
          } catch (signInErr: any) {
            console.warn('Email in Firebase Auth, proceeding with document creation:', signInErr);
          }
        } else {
          console.warn('Firebase Auth notice (continuing with database provision):', authErr);
        }
      }

      // Generate robust user ID
      const finalUid = authUid || existingUser?.id || existingUser?.uid || `usr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;

      // Resolve selected department record
      const selectedDept = departments.find((d) => d.id === selectedDeptId) || {
        id: selectedDeptId,
        name: selectedDeptId === 'dept-ich' ? 'Department of Industrial Chemistry' : selectedDeptId === 'dept-chm' ? 'Department of Chemistry' : 'Department of Computer Science',
        code: selectedDeptId === 'dept-ich' ? 'ICH' : selectedDeptId === 'dept-chm' ? 'CHM' : 'CSC',
        faculty: 'Faculty of Physical Sciences',
      };

      // 4. Save new student record in Firestore
      setCreationStatus('Configuring your department & level timetable...');
      const newStudentPayload = {
        id: finalUid,
        uid: finalUid,
        email: cleanEmail,
        matric_number: cleanMatric,
        matricNumber: cleanMatric,
        full_name: studentName,
        fullName: studentName,
        name: studentName,
        department: selectedDept.name,
        department_id: selectedDept.id,
        faculty: selectedDept.faculty || 'Faculty of Physical Sciences',
        level: selectedLevel,
        year_level: `${selectedLevel} Level`,
        yearLevel: `${selectedLevel} Level`,
        semester: semCode,
        current_semester: semCode,
        session: sessCode,
        academic_session: sessCode,
        password: trimmedPassword,
        portal_password: trimmedPassword,
        password_changed: true,
        has_custom_password: true,
        is_default_password: false,
        is_paid: false,
        is_payed: false,
        hasFreeAccess: false,
        wallet_balance: 0,
        walletBalance: 0,
        isAdmin: false,
        isadmin: false,
        isCourseRep: false,
        iscourserep: false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };

      await createStudentUser(newStudentPayload as any);

      // Cache custom password locally for instant synchronous check
      try {
        localStorage.setItem(`student_pwd_custom_${cleanEmail}`, trimmedPassword);
        localStorage.setItem(`student_pwd_custom_${cleanMatric}`, trimmedPassword);
      } catch {}

      // 5. Generate active single-device token
      setCreationStatus('Finalizing single-device authorization...');
      const deviceToken = `sess_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      const detectedDevice = typeof navigator !== 'undefined'
        ? (/iPhone|iPad|iPod/i.test(navigator.userAgent) ? 'iOS Mobile' : /Android/i.test(navigator.userAgent) ? 'Android Mobile' : /Macintosh|Mac OS X/i.test(navigator.userAgent) ? 'macOS Desktop' : 'Windows/Web Client')
        : 'Web Client';

      try {
        await registerUserActiveSession(finalUid, deviceToken, detectedDevice);
      } catch {}

      // Record telemetry app visit
      try {
        await recordAppVisit({
          userId: finalUid,
          studentName: studentName,
          matricNumber: cleanMatric,
          department: selectedDept.name,
          level: selectedLevel,
          device: detectedDevice,
        });
      } catch {}

      // 6. Build UserSession and send student directly to their department & level dashboard!
      const userSessionData: UserSession = {
        id: finalUid,
        uid: finalUid,
        email: cleanEmail,
        matricNumber: cleanMatric,
        fullName: studentName,
        department: selectedDept.name,
        department_id: selectedDept.id,
        faculty: selectedDept.faculty || 'Faculty of Physical Sciences',
        level: selectedLevel,
        yearLevel: `${selectedLevel} Level`,
        year_level: `${selectedLevel} Level`,
        semester: semCode,
        current_semester: semCode,
        session: sessCode,
        academic_session: sessCode,
        profileImage: '',
        profile_pic_url: '',
        isAdmin: false,
        isCourseRep: false,
        is_paid: false,
        is_payed: false,
        hasFreeAccess: false,
        wallet_balance: 0,
        walletBalance: 0,
        isLoggedIn: true,
      };

      // Store in localStorage
      try {
        localStorage.setItem('university_schedule_user', JSON.stringify(userSessionData));
        localStorage.setItem('university_active_session_token', deviceToken);
      } catch {}

      setCreationStatus('Account successfully created! Loading your dashboard...');

      setTimeout(() => {
        setIsCreatingAccount(false);
        onLogin(userSessionData);
      }, 700);

    } catch (err: any) {
      console.error('Account creation error:', err);
      setIsCreatingAccount(false);
      setErrorMessage(err?.message || 'Failed to create student account. Please try again.');
    }
  };

  // Helper level options
  const LEVEL_OPTIONS = [
    { level: 100, label: '100 Level', desc: 'First Year / Freshmen' },
    { level: 200, label: '200 Level', desc: 'Second Year / Sophomore' },
    { level: 300, label: '300 Level', desc: 'Third Year / Junior' },
    { level: 400, label: '400 Level', desc: 'Fourth Year / Senior' },
    { level: 500, label: '500 Level', desc: 'Fifth Year / Finalist' },
  ];

  return (
    <div id="auth-screen" className="w-full max-w-lg min-h-screen flex flex-col justify-center px-4 sm:px-6 py-8 relative select-none">
      {/* Ambient background soft light orbs matching the main app */}
      <div className="fixed top-[-100px] left-[-80px] w-[340px] h-[340px] rounded-full bg-gradient-to-tr from-blue-300/35 to-sky-200/40 blur-[90px] pointer-events-none -z-10" />
      <div className="fixed top-[280px] right-[-100px] w-[360px] h-[360px] rounded-full bg-gradient-to-br from-indigo-200/30 to-purple-200/25 blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-60px] left-[15%] w-[380px] h-[380px] rounded-full bg-gradient-to-tr from-sky-200/35 to-emerald-100/30 blur-[110px] pointer-events-none -z-10" />

      {/* DEDICATED FULL SCREEN / OVERLAY LOADING STATE FOR ACCOUNT CREATION */}
      {isCreatingAccount ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-md mx-auto bg-white/90 backdrop-blur-2xl rounded-[32px] p-8 sm:p-10 border border-white/80 shadow-[0_20px_60px_rgba(0,122,255,0.15)] flex flex-col items-center text-center"
        >
          <div className="relative mb-7">
            <div className="w-24 h-24 rounded-full border-4 border-blue-100 border-t-[#007AFF] animate-spin flex items-center justify-center shadow-lg shadow-blue-500/10" />
            <div className="absolute inset-0 flex items-center justify-center">
              <GraduationCap className="w-10 h-10 text-[#007AFF] animate-pulse" />
            </div>
          </div>

          <h2 className="text-[24px] sm:text-[26px] font-extrabold text-[#1C1C1E] tracking-tight mb-2">
            Creating account...
          </h2>
          <p className="text-[14px] text-[#8E8E93] max-w-xs font-medium leading-relaxed mb-6">
            {creationStatus}
          </p>

          <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden relative">
            <motion.div
              initial={{ width: '10%' }}
              animate={{ width: ['20%', '65%', '92%', '100%'] }}
              transition={{ duration: 2.5, ease: 'easeInOut' }}
              className="h-full bg-gradient-to-r from-[#007AFF] to-blue-400 rounded-full"
            />
          </div>

          <div className="mt-6 flex items-center gap-2 text-[12px] font-semibold text-slate-400">
            <Sparkles className="w-3.5 h-3.5 text-blue-500" />
            <span>Configuring your department & level dashboard</span>
          </div>
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: 15 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
          className="w-full max-w-md mx-auto"
        >
          {/* Header Brand Section */}
          <div className="flex flex-col items-center text-center mb-6">
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.35, ease: 'easeOut' }}
              className="relative mb-3.5"
            >
              <div className="w-20 h-20 sm:w-22 sm:h-22 rounded-[24px] bg-white p-1 shadow-xl shadow-blue-500/15 border border-slate-200/80 flex items-center justify-center overflow-hidden transition-transform duration-300 hover:scale-105">
                <img
                  src="/app-icon.png"
                  alt="Scheduler App Icon"
                  className="w-full h-full object-cover rounded-[20px]"
                  onError={(e) => {
                    const target = e.target as HTMLImageElement;
                    if (!target.src.endsWith('/user-icon.jpg')) {
                      target.src = '/user-icon.jpg';
                    } else if (!target.src.endsWith('/logo.svg')) {
                      target.src = '/logo.svg';
                    }
                  }}
                />
              </div>
              <div className="absolute -bottom-1 -right-1 bg-[#007AFF] text-white rounded-full p-1 border-2 border-white shadow-xs">
                <GraduationCap className="w-3.5 h-3.5" />
              </div>
            </motion.div>

            <h1 className="text-[26px] sm:text-[28px] font-extrabold text-[#1C1C1E] tracking-tight leading-tight">
              Student Portal
            </h1>
            <p className="text-[13.5px] text-[#8E8E93] mt-1 font-medium max-w-xs leading-snug">
              {authMode === 'login'
                ? 'Sign in to access your university timetables and announcements.'
                : onboardingStep === 1
                ? 'Create your student account to get synchronized timetables.'
                : 'Select your department and level to configure your dashboard.'}
            </p>
          </div>

          {/* iOS-Style Segmented Control: Sign In vs Create Account */}
          <div className="flex p-1.5 bg-slate-200/70 backdrop-blur-xl rounded-[24px] mb-6 border border-white/60 shadow-inner">
            <button
              id="tab-sign-in"
              type="button"
              onClick={() => {
                setAuthMode('login');
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-[20px] font-bold text-[13.5px] transition-all duration-200 cursor-pointer ${
                authMode === 'login'
                  ? 'bg-white text-[#1C1C1E] shadow-[0_4px_16px_rgba(0,0,0,0.08)] scale-[1.01]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Sign In
            </button>
            <button
              id="tab-create-account"
              type="button"
              onClick={() => {
                setAuthMode('register');
                setOnboardingStep(1);
                setErrorMessage(null);
              }}
              className={`flex-1 py-2.5 rounded-[20px] font-bold text-[13.5px] transition-all duration-200 cursor-pointer flex items-center justify-center gap-1.5 ${
                authMode === 'register'
                  ? 'bg-white text-[#007AFF] shadow-[0_4px_16px_rgba(0,122,255,0.12)] scale-[1.01]'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Create Account</span>
            </button>
          </div>

          {/* Error Alert Display */}
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

          {/* ===================== VIEW 1: SIGN IN ===================== */}
          {authMode === 'login' ? (
            <form id="student-login-form" onSubmit={handleLoginSubmit} className="space-y-4">
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
                    placeholder="student@university.edu"
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
                <div className="flex items-center justify-between mb-1.5 px-1">
                  <label htmlFor="login-password-input" className="block text-[12.5px] font-bold text-[#1C1C1E]">
                    Password
                  </label>
                  <button
                    id="btn-forgot-password-link"
                    type="button"
                    onClick={() => setIsForgotPasswordOpen(true)}
                    className="text-[12px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                  >
                    Forgot Password?
                  </button>
                </div>
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

              {/* Switch to Create Account Link */}
              <div className="text-center pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setAuthMode('register');
                    setOnboardingStep(1);
                    setErrorMessage(null);
                  }}
                  className="text-[13px] font-semibold text-[#007AFF] hover:underline cursor-pointer"
                >
                  Don't have an account? <span className="font-bold underline">Create Account</span>
                </button>
              </div>
            </form>
          ) : (
            /* ===================== VIEW 2: CREATE ACCOUNT & ONBOARDING ===================== */
            <div className="space-y-5">
              {/* Progress Indicator */}
              <div className="bg-white/80 backdrop-blur-md rounded-[20px] p-3 border border-slate-200/80 shadow-2xs">
                <div className="flex items-center justify-between text-[12px] font-bold text-[#1C1C1E] mb-2 px-1">
                  <span className="flex items-center gap-1.5 text-[#007AFF]">
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>{onboardingStep === 1 ? 'Step 1 of 2 • Credentials' : 'Step 2 of 2 • Academic Profile'}</span>
                  </span>
                  <span className="text-slate-400 font-semibold">{onboardingStep === 1 ? '50%' : '100%'}</span>
                </div>
                <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#007AFF] transition-all duration-300 rounded-full"
                    style={{ width: onboardingStep === 1 ? '50%' : '100%' }}
                  />
                </div>
              </div>

              {/* ONBOARDING STEP 1: Email, Matric, Password & Confirm Password */}
              {onboardingStep === 1 ? (
                <form id="onboarding-step1-form" onSubmit={handleProceedToAcademicOnboarding} className="space-y-4">
                  {/* Full Name */}
                  <div>
                    <label htmlFor="reg-name-input" className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                      Full Name
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <User className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-name-input"
                        type="text"
                        value={regFullName}
                        onChange={(e) => setRegFullName(e.target.value)}
                        placeholder="e.g. David Adebayo"
                        className="w-full pl-11 pr-4 py-3.5 rounded-[22px] bg-white border border-slate-200/90 text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Student Email */}
                  <div>
                    <label htmlFor="reg-email-input" className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                      Student Email Address <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <Mail className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-email-input"
                        type="email"
                        value={regEmail}
                        onChange={(e) => setRegEmail(e.target.value)}
                        placeholder="student@university.edu"
                        required
                        className="w-full pl-11 pr-4 py-3.5 rounded-[22px] bg-white border border-slate-200/90 text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-medium"
                      />
                    </div>
                  </div>

                  {/* Matriculation Number */}
                  <div>
                    <label htmlFor="reg-matric-input" className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                      Matriculation Number (Matric) <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <GraduationCap className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-matric-input"
                        type="text"
                        value={regMatric}
                        onChange={(e) => setRegMatric(e.target.value.toUpperCase())}
                        placeholder="e.g. 2025/PS/ICH/042"
                        required
                        autoCapitalize="characters"
                        className="w-full pl-11 pr-4 py-3.5 rounded-[22px] bg-white border border-slate-200/90 text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-semibold uppercase tracking-wider"
                      />
                    </div>
                  </div>

                  {/* Password Field */}
                  <div>
                    <label htmlFor="reg-password-input" className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                      Create Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-password-input"
                        type={showRegPassword ? 'text' : 'password'}
                        value={regPassword}
                        onChange={(e) => setRegPassword(e.target.value)}
                        placeholder="Minimum 6 characters"
                        required
                        minLength={6}
                        className="w-full pl-11 pr-12 py-3.5 rounded-[22px] bg-white border border-slate-200/90 text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#007AFF]/30 focus:border-[#007AFF] transition-all shadow-2xs font-medium"
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegPassword(!showRegPassword)}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full transition-colors cursor-pointer"
                        title={showRegPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Confirm Password Field */}
                  <div>
                    <label htmlFor="reg-confirm-password-input" className="block text-[12.5px] font-bold text-[#1C1C1E] mb-1.5 px-1">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <div className="relative flex items-center">
                      <div className="absolute left-4 text-slate-400 pointer-events-none">
                        <Lock className="w-4 h-4" />
                      </div>
                      <input
                        id="reg-confirm-password-input"
                        type={showRegConfirmPassword ? 'text' : 'password'}
                        value={regConfirmPassword}
                        onChange={(e) => setRegConfirmPassword(e.target.value)}
                        placeholder="Re-enter your password to confirm"
                        required
                        minLength={6}
                        className={`w-full pl-11 pr-12 py-3.5 rounded-[22px] bg-white border text-[14px] text-[#1C1C1E] placeholder:text-slate-400 focus:outline-none focus:ring-2 transition-all shadow-2xs font-medium ${
                          regConfirmPassword && regPassword && regConfirmPassword !== regPassword
                            ? 'border-red-300 focus:ring-red-300 focus:border-red-500'
                            : regConfirmPassword && regPassword && regConfirmPassword === regPassword
                            ? 'border-emerald-300 focus:ring-emerald-300 focus:border-emerald-500'
                            : 'border-slate-200/90 focus:ring-[#007AFF]/30 focus:border-[#007AFF]'
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => setShowRegConfirmPassword(!showRegConfirmPassword)}
                        className="absolute right-3.5 text-slate-400 hover:text-slate-600 p-1.5 rounded-full transition-colors cursor-pointer"
                        title={showRegConfirmPassword ? 'Hide password' : 'Show password'}
                      >
                        {showRegConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                    {regConfirmPassword && regPassword && (
                      <div className="mt-1 px-1 text-[11.5px]">
                        {regConfirmPassword === regPassword ? (
                          <span className="text-emerald-600 font-semibold flex items-center gap-1">
                            <Check className="w-3.5 h-3.5" /> Passwords match
                          </span>
                        ) : (
                          <span className="text-red-500 font-semibold flex items-center gap-1">
                            <AlertCircle className="w-3.5 h-3.5" /> Passwords do not match
                          </span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Continue Button */}
                  <motion.button
                    id="btn-onboarding-continue"
                    type="submit"
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.01 }}
                    className="w-full py-3.5 px-5 rounded-[22px] bg-[#007AFF] hover:bg-[#0062cc] text-white font-bold text-[15px] shadow-[0_8px_24px_rgba(0,122,255,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer mt-5"
                  >
                    <span>Continue to Academic Profile</span>
                    <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                  </motion.button>

                  {/* Switch to login */}
                  <div className="text-center pt-2">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setErrorMessage(null);
                      }}
                      className="text-[13px] font-semibold text-slate-500 hover:text-[#007AFF] cursor-pointer"
                    >
                      Already have an account? <span className="text-[#007AFF] font-bold underline">Sign In</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* ONBOARDING STEP 2: Department, Level & Current Active Semester */
                <div className="space-y-4">
                  {/* Back button */}
                  <button
                    type="button"
                    onClick={() => {
                      setOnboardingStep(1);
                      setErrorMessage(null);
                    }}
                    className="inline-flex items-center gap-1.5 text-[12.5px] font-bold text-[#007AFF] hover:underline cursor-pointer mb-1"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to credentials</span>
                  </button>

                  {/* Admin Active Semester Highlight Card */}
                  <div className="bg-gradient-to-br from-blue-50/90 to-indigo-50/90 rounded-[24px] p-4 border border-blue-200/80 shadow-sm relative overflow-hidden">
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-2xl bg-[#007AFF] text-white flex items-center justify-center shrink-0 shadow-md shadow-blue-500/20">
                        <Calendar className="w-5 h-5" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5 mb-0.5">
                          <span className="text-[10.5px] font-extrabold uppercase tracking-wider text-[#007AFF] bg-blue-100/90 px-2 py-0.5 rounded-full">
                            Admin Active Semester
                          </span>
                        </div>
                        <h4 className="text-[16px] font-extrabold text-[#1C1C1E] leading-tight">
                          {activeSemester} <span className="text-[13px] font-medium text-slate-500">({activeSession})</span>
                        </h4>
                        <p className="text-[12px] text-slate-600 mt-1 leading-snug">
                          Your academic schedule, lecture times, and modules will automatically link to the current active semester set by the administration.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Department Selector */}
                  <div>
                    <label className="block text-[12.5px] font-bold text-[#1C1C1E] mb-2 px-1 flex items-center justify-between">
                      <span>Select Department</span>
                      <span className="text-[11.5px] text-[#007AFF] font-semibold">
                        {departments.find((d) => d.id === selectedDeptId)?.code || 'ICH'}
                      </span>
                    </label>

                    <div className="space-y-2 max-h-[190px] overflow-y-auto pr-1 no-scrollbar">
                      {departments.map((dept) => {
                        const isSelected = dept.id === selectedDeptId;
                        return (
                          <button
                            key={dept.id}
                            type="button"
                            onClick={() => setSelectedDeptId(dept.id)}
                            className={`w-full text-left p-3 rounded-[20px] border transition-all duration-200 flex items-center justify-between cursor-pointer ${
                              isSelected
                                ? 'bg-white border-[#007AFF] shadow-[0_6px_20px_rgba(0,122,255,0.14)] ring-2 ring-[#007AFF]/20'
                                : 'bg-white/70 hover:bg-white border-slate-200/80 text-slate-700'
                            }`}
                          >
                            <div className="flex items-center gap-3 min-w-0">
                              <div
                                className={`w-8 h-8 rounded-xl flex items-center justify-center font-bold text-[12px] shrink-0 ${
                                  isSelected
                                    ? 'bg-[#007AFF] text-white shadow-sm'
                                    : 'bg-slate-100 text-slate-600'
                                }`}
                              >
                                {dept.code?.slice(0, 3) || 'DEP'}
                              </div>
                              <div className="min-w-0">
                                <p className={`text-[13.5px] font-bold truncate leading-tight ${isSelected ? 'text-[#1C1C1E]' : 'text-slate-800'}`}>
                                  {dept.name}
                                </p>
                                <p className="text-[11px] text-[#8E8E93] truncate leading-tight mt-0.5">
                                  {dept.faculty || 'Faculty of Physical Sciences'}
                                </p>
                              </div>
                            </div>
                            {isSelected && (
                              <div className="w-5 h-5 rounded-full bg-[#007AFF] text-white flex items-center justify-center shrink-0 ml-2">
                                <Check className="w-3 h-3 stroke-[3]" />
                              </div>
                            )}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Level Selector */}
                  <div>
                    <label className="block text-[12.5px] font-bold text-[#1C1C1E] mb-2 px-1 flex items-center justify-between">
                      <span>Select Level / Year</span>
                      <span className="text-[11.5px] text-[#007AFF] font-semibold">{selectedLevel} Level</span>
                    </label>

                    <div className="grid grid-cols-5 gap-1.5">
                      {LEVEL_OPTIONS.map((item) => {
                        const isSelected = selectedLevel === item.level;
                        return (
                          <button
                            key={item.level}
                            type="button"
                            onClick={() => setSelectedLevel(item.level)}
                            className={`py-3 px-1 rounded-[18px] border text-center transition-all cursor-pointer flex flex-col items-center justify-center ${
                              isSelected
                                ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-md shadow-blue-500/25 scale-[1.02]'
                                : 'bg-white hover:bg-slate-50 border-slate-200/80 text-slate-700'
                            }`}
                          >
                            <span className="text-[13px] font-black tracking-tight">{item.level}L</span>
                            <span className={`text-[9px] font-medium leading-none mt-1 ${isSelected ? 'text-blue-100' : 'text-slate-400'}`}>
                              Yr {Math.floor(item.level / 100)}
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Finish Up Button */}
                  <motion.button
                    id="btn-finish-up-registration"
                    type="button"
                    onClick={handleFinishUpRegistration}
                    whileTap={{ scale: 0.98 }}
                    whileHover={{ scale: 1.01 }}
                    className="w-full py-4 px-5 rounded-[24px] bg-[#007AFF] hover:bg-[#0062cc] text-white font-extrabold text-[15.5px] shadow-[0_10px_28px_rgba(0,122,255,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer mt-4"
                  >
                    <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                    <span>Finish Up</span>
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {/* Security / Portal footer */}
          <div className="text-center mt-7 text-[12px] text-[#8E8E93] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>University Academic Portal & Schedule System</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};
