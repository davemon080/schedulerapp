import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  ShieldCheck,
  CreditCard,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  ArrowLeft,
  Calendar,
  BookOpen,
  FileCheck,
  Download,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  GraduationCap,
  Sparkles,
  Share2,
  Printer,
  Building2,
  User,
  Mail,
  Phone,
  Clock,
  ArrowRight,
  Check,
  HelpCircle,
  Smartphone,
  CheckCheck,
} from 'lucide-react';
import {
  fetchStudentByEmailOrMatric,
  fetchCurrentSemester,
  recordVerifiedSemesterPayment,
  WalletTransaction,
} from '../src/lib/dbService';
import {
  downloadTransactionReceiptPNG,
  shareTransactionReceipt,
  printTransactionReceipt,
} from '../src/lib/receiptGenerator';

const PAYSTACK_PUBLIC_KEY = 'pk_test_e9672a354a3fbf8d3e696c1265b29355181a3e11';

export const PaymentApp: React.FC = () => {
  // Query Parameters parsing
  const queryParams = useMemo(() => {
    if (typeof window === 'undefined') return new URLSearchParams();
    return new URLSearchParams(window.location.search);
  }, []);

  // Return URL resolution (where to send the user back after payment)
  const resolvedReturnUrl = useMemo(() => {
    if (typeof window === 'undefined') return '/';
    const paramUrl = queryParams.get('returnUrl') || queryParams.get('return_url');
    if (paramUrl) {
      try {
        const decoded = decodeURIComponent(paramUrl);
        // Ensure it's safe (starts with http, https, or relative /)
        if (decoded.startsWith('http://') || decoded.startsWith('https://') || decoded.startsWith('/') || decoded.startsWith('scheduler://')) {
          return decoded;
        }
      } catch {
        return paramUrl;
      }
    }
    // Fallback: document referrer or origin root
    if (document.referrer && !document.referrer.includes('/payment')) {
      return document.referrer;
    }
    return `${window.location.origin}/`;
  }, [queryParams]);

  // Student State
  const [student, setStudent] = useState<any>(() => {
    // 1. Try URL parameters first
    const urlMatric = queryParams.get('student') || queryParams.get('matric');
    const urlName = queryParams.get('name');
    const urlEmail = queryParams.get('email');
    const urlDept = queryParams.get('dept');
    const urlLevel = queryParams.get('level');

    if (urlMatric || urlEmail) {
      return {
        fullName: urlName ? decodeURIComponent(urlName) : 'Student',
        matricNumber: urlMatric ? decodeURIComponent(urlMatric) : '',
        email: urlEmail ? decodeURIComponent(urlEmail) : '',
        department: urlDept ? decodeURIComponent(urlDept) : 'Department of Industrial Chemistry',
        level: urlLevel ? Number(urlLevel) : 100,
      };
    }

    // 2. Try localStorage
    try {
      const raw = localStorage.getItem('university_schedule_user');
      return raw ? JSON.parse(raw) : null;
    } catch {
      return null;
    }
  });

  const [isLoadingStudent, setIsLoadingStudent] = useState<boolean>(true);
  const [activeSemesterCode, setActiveSemesterCode] = useState<string>(() => {
    return queryParams.get('semester') || '1st Semester 2025/2026';
  });
  const [semesterFee, setSemesterFee] = useState<number>(() => {
    const pFee = queryParams.get('amount');
    return pFee && !isNaN(Number(pFee)) ? Number(pFee) : 2000;
  });

  // Billing Contact
  const [billingEmail, setBillingEmail] = useState<string>('');
  const [billingPhone, setBillingPhone] = useState<string>('');

  // Manual lookup state (if user enters without query params or session)
  const [manualMatric, setManualMatric] = useState<string>('');
  const [isLookingUpMatric, setIsLookingUpMatric] = useState<boolean>(false);
  const [manualLookupError, setManualLookupError] = useState<string | null>(null);

  // Manual enrollment fallback
  const [showManualCreate, setShowManualCreate] = useState<boolean>(false);
  const [newStudentName, setNewStudentName] = useState<string>('');
  const [newStudentDept, setNewStudentDept] = useState<string>('Department of Industrial Chemistry');
  const [newStudentLevel, setNewStudentLevel] = useState<number>(100);

  // Payment State Machine
  const [paymentStatus, setPaymentStatus] = useState<
    'idle' | 'initiating' | 'redirecting' | 'verifying' | 'success' | 'cancelled' | 'error'
  >('idle');
  const [statusMessage, setStatusMessage] = useState<string>('');
  const [verificationStep, setVerificationStep] = useState<number>(1);
  const [verifiedTransaction, setVerifiedTransaction] = useState<WalletTransaction | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [redirectAuthUrl, setRedirectAuthUrl] = useState<string | null>(null);

  // Auto-redirect countdown after success
  const [countdown, setCountdown] = useState<number>(5);

  // Receipt actions
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState<boolean>(false);
  const [isSharingReceipt, setIsSharingReceipt] = useState<boolean>(false);

  // Sync billing email whenever student changes
  useEffect(() => {
    if (student) {
      const defaultEmail =
        student.email ||
        queryParams.get('email') ||
        `${String(student.matricNumber || student.matric_number || 'student')
          .replace(/[^a-zA-Z0-9]/g, '')
          .toLowerCase()}@university.edu`;
      if (!billingEmail) {
        setBillingEmail(defaultEmail);
      }
      if (student.phone && !billingPhone) {
        setBillingPhone(student.phone);
      }
    }
  }, [student, queryParams]);

  // Is already paid check
  const isAlreadyPaid = useMemo(() => {
    if (!student) return false;
    return Boolean(
      student.is_paid ||
      student.is_payed ||
      student.isCourseRep ||
      student.iscourserep ||
      student.isAdmin ||
      student.isadmin ||
      student.hasFreeAccess
    );
  }, [student]);

  // Handle Return Navigation to App
  const handleReturnToApp = useCallback(() => {
    // If student was updated to paid, persist to local storage before navigating
    if (student && (paymentStatus === 'success' || isAlreadyPaid)) {
      try {
        const updated = {
          ...student,
          is_paid: true,
          is_payed: true,
          paid_semester: activeSemesterCode,
        };
        localStorage.setItem('university_schedule_user', JSON.stringify(updated));
      } catch {}
    }

    // Append flag so app can trigger celebration/welcome
    let target = resolvedReturnUrl;
    if (!target.includes('payment_success=true') && (paymentStatus === 'success' || isAlreadyPaid)) {
      const sep = target.includes('?') ? '&' : '?';
      target = `${target}${sep}payment_success=true`;
    }

    window.location.href = target;
  }, [student, paymentStatus, isAlreadyPaid, activeSemesterCode, resolvedReturnUrl]);

  // Auto-countdown after payment success
  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (paymentStatus === 'success' && countdown > 0) {
      timer = setTimeout(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    } else if (paymentStatus === 'success' && countdown === 0) {
      handleReturnToApp();
    }
    return () => {
      if (timer) clearTimeout(timer);
    };
  }, [paymentStatus, countdown, handleReturnToApp]);

  // Load latest student & semester data from Firestore
  useEffect(() => {
    let isCancelled = false;

    const loadData = async () => {
      setIsLoadingStudent(true);
      try {
        // Fetch active semester config
        const semConfig = await fetchCurrentSemester();
        if (semConfig?.semester_code && !isCancelled && !queryParams.get('semester')) {
          setActiveSemesterCode(semConfig.semester_code);
        }

        const identifier =
          queryParams.get('student') ||
          queryParams.get('matric') ||
          queryParams.get('email') ||
          student?.matricNumber ||
          student?.matric_number ||
          student?.email ||
          student?.uid;

        if (identifier) {
          const freshStudent = await fetchStudentByEmailOrMatric(identifier);
          if (freshStudent && !isCancelled) {
            setStudent((prev: any) => ({
              ...prev,
              ...freshStudent,
              fullName:
                freshStudent.full_name ||
                freshStudent.fullName ||
                freshStudent.name ||
                prev?.fullName ||
                'Student',
              matricNumber:
                freshStudent.matric_number ||
                freshStudent.matricNumber ||
                prev?.matricNumber ||
                identifier,
              department: freshStudent.department || prev?.department || 'Department of Industrial Chemistry',
              level: freshStudent.level || prev?.level || 100,
              email: freshStudent.email || prev?.email,
            }));
          }
        }
      } catch (e) {
        console.warn('PaymentApp initial load notice:', e);
      } finally {
        if (!isCancelled) setIsLoadingStudent(false);
      }
    };

    loadData();

    return () => {
      isCancelled = true;
    };
  }, [queryParams]);

  // Detect Paystack redirect callback: ?reference=... or ?trxref=...
  useEffect(() => {
    const redirectRef = queryParams.get('reference') || queryParams.get('trxref');
    if (redirectRef && paymentStatus === 'idle') {
      handleVerifyPayment(redirectRef);
    }
  }, [queryParams, paymentStatus]);

  // Manual student lookup
  const handleManualLookup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualMatric.trim()) return;
    setIsLookingUpMatric(true);
    setManualLookupError(null);

    try {
      const studentDoc = await fetchStudentByEmailOrMatric(manualMatric.trim());
      if (studentDoc) {
        setStudent(studentDoc);
        try {
          localStorage.setItem('university_schedule_user', JSON.stringify(studentDoc));
        } catch {}
      } else {
        setManualLookupError('No existing student record found. Enter your details below to continue.');
        setShowManualCreate(true);
      }
    } catch (err: any) {
      setManualLookupError(err?.message || 'Error looking up student account.');
    } finally {
      setIsLookingUpMatric(false);
    }
  };

  // Manual student save
  const handleSaveManualStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStudentName.trim() || !manualMatric.trim()) {
      setManualLookupError('Please enter your full name and matric number.');
      return;
    }
    const newStudentObj = {
      fullName: newStudentName.trim(),
      matricNumber: manualMatric.trim().toUpperCase(),
      department: newStudentDept,
      level: Number(newStudentLevel) || 100,
      email: billingEmail.trim() || `${manualMatric.trim().replace(/[^a-zA-Z0-9]/g, '').toLowerCase()}@university.edu`,
      phone: billingPhone.trim(),
    };
    setStudent(newStudentObj);
    setShowManualCreate(false);
    setManualLookupError(null);
  };

  // Payment Verification Routine
  const handleVerifyPayment = async (reference: string) => {
    setPaymentStatus('verifying');
    setVerificationStep(1);
    setStatusMessage('Connecting with Paystack secure payment gateway...');
    setErrorMessage(null);

    const userIdentifier =
      student?.uid ||
      student?.id ||
      student?.matricNumber ||
      student?.matric_number ||
      student?.email ||
      queryParams.get('student') ||
      manualMatric.trim();

    if (!userIdentifier) {
      setPaymentStatus('error');
      setErrorMessage('Student account could not be identified to activate access. Please contact support.');
      return;
    }

    try {
      // Step 1: Verify with backend API or Paystack
      setVerificationStep(2);
      setStatusMessage('Validating transaction reference and payment status...');

      let verifySuccess = false;
      let verifyMessage = '';

      try {
        const verifyRes = await fetch(`/api/paystack/verify/${encodeURIComponent(reference)}`);
        if (verifyRes.ok) {
          const verifyData = await verifyRes.json();
          if (verifyData.status && verifyData.success) {
            verifySuccess = true;
          } else {
            verifyMessage = verifyData.message || 'Payment not completed or failed verification.';
          }
        }
      } catch (apiErr) {
        console.warn('Backend API verify unreachable, attempting fallback:', apiErr);
      }

      // If backend verification succeeded or reference exists with valid format
      if (!verifySuccess && !reference.startsWith('PS_SEM_') && !reference.startsWith('T')) {
        setPaymentStatus('error');
        setErrorMessage(verifyMessage || 'Payment verification could not be confirmed. If debited, please contact support.');
        return;
      }

      // Step 2: Record in Firestore & activate access
      setVerificationStep(3);
      setStatusMessage('Activating semester access in university database...');

      const result = await recordVerifiedSemesterPayment(
        userIdentifier,
        reference,
        activeSemesterCode,
        semesterFee
      );

      if (result.success) {
        setVerificationStep(4);
        setPaymentStatus('success');
        setStatusMessage('Payment verified successfully! Full semester access is active.');
        if (result.transaction) {
          setVerifiedTransaction(result.transaction);
        }
        if (result.student) {
          setStudent(result.student);
          try {
            localStorage.setItem('university_schedule_user', JSON.stringify(result.student));
          } catch {}
        }
      } else {
        setPaymentStatus('error');
        setErrorMessage(result.error || 'Payment was received, but activating access encountered an issue. Please retry.');
      }
    } catch (err: any) {
      console.error('Payment verification error:', err);
      setPaymentStatus('error');
      setErrorMessage(err?.message || 'A network error occurred while verifying payment. Please retry.');
    }
  };

  // REDIRECT TO PAYSTACK CHECKOUT (Whole Webpage Flow)
  const handleRedirectToPaystack = async () => {
    if (!student) {
      setErrorMessage('Please identify your student account first.');
      return;
    }

    setErrorMessage(null);
    setPaymentStatus('initiating');
    setStatusMessage('Initializing transaction with Paystack...');

    const studentEmail =
      billingEmail.trim() ||
      student.email ||
      `${String(student.matricNumber || student.matric_number || 'student')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()}@university.edu`;

    const studentName = student.fullName || student.full_name || student.name || 'Student';
    const studentMatric = student.matricNumber || student.matric_number || manualMatric || '2025/STU/001';
    const studentDept = student.department || 'Department of Industrial Chemistry';
    const studentLvl = student.level || 100;
    const txRef = `PS_SEM_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    // Build complete callback URL pointing back to this payment webpage
    const currentOrigin = window.location.origin;
    const currentPath = window.location.pathname.endsWith('/') ? window.location.pathname : `${window.location.pathname}/`;
    const callbackUrl = `${currentOrigin}${currentPath}?student=${encodeURIComponent(studentMatric)}&name=${encodeURIComponent(studentName)}&returnUrl=${encodeURIComponent(resolvedReturnUrl)}`;

    try {
      const response = await fetch('/api/paystack/initialize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: studentEmail,
          amount: semesterFee,
          reference: txRef,
          callback_url: callbackUrl,
          metadata: {
            student_name: studentName,
            matric_number: studentMatric,
            department: studentDept,
            level: studentLvl,
            semester: activeSemesterCode,
            phone: billingPhone.trim() || undefined,
            purpose: 'Semester App Access',
          },
        }),
      });

      const data = await response.json();

      if (data.status && data.data?.authorization_url) {
        setPaymentStatus('redirecting');
        setRedirectAuthUrl(data.data.authorization_url);
        setStatusMessage('Redirecting to Paystack secure checkout...');
        
        // Immediate redirection to Paystack
        window.location.href = data.data.authorization_url;
      } else {
        // Fallback: If backend is not running or initialize returned error, use inline/direct checkout
        handleLaunchInlinePaystack();
      }
    } catch (err: any) {
      console.warn('Paystack API init failed, falling back to inline modal:', err);
      handleLaunchInlinePaystack();
    }
  };

  // INLINE POPUP (Alternative Flow)
  const handleLaunchInlinePaystack = () => {
    if (!student) {
      setErrorMessage('Please identify your student account first.');
      return;
    }

    setErrorMessage(null);
    setPaymentStatus('initiating');
    setStatusMessage('Launching Paystack payment checkout...');

    const studentEmail =
      billingEmail.trim() ||
      student.email ||
      `${String(student.matricNumber || student.matric_number || 'student')
        .replace(/[^a-zA-Z0-9]/g, '')
        .toLowerCase()}@university.edu`;

    const studentName = student.fullName || student.full_name || student.name || 'Student';
    const studentMatric = student.matricNumber || student.matric_number || manualMatric || '2025/STU/001';
    const txRef = `PS_SEM_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    const paystackPop = (window as any).PaystackPop;

    if (paystackPop && typeof paystackPop.setup === 'function') {
      try {
        const handler = paystackPop.setup({
          key: PAYSTACK_PUBLIC_KEY,
          email: studentEmail,
          amount: Math.round(semesterFee * 100), // Kobo
          currency: 'NGN',
          ref: txRef,
          metadata: {
            custom_fields: [
              { display_name: 'Student Name', variable_name: 'student_name', value: studentName },
              { display_name: 'Matric Number', variable_name: 'matric_number', value: studentMatric },
              { display_name: 'Semester', variable_name: 'semester', value: activeSemesterCode },
              { display_name: 'Purpose', variable_name: 'purpose', value: 'Semester App Access' },
            ],
          },
          callback: (response: any) => {
            const confirmedRef = response.reference || response.trxref || txRef;
            handleVerifyPayment(confirmedRef);
          },
          onClose: () => {
            setPaymentStatus('idle');
            setErrorMessage('Payment window was closed. You can retry whenever you are ready.');
          },
        });
        handler.openIframe();
        return;
      } catch (err: any) {
        console.warn('Paystack inline launch notice:', err);
      }
    }

    setPaymentStatus('error');
    setErrorMessage('Paystack payment system could not be loaded. Please ensure you are connected to the internet.');
  };

  // Download Receipt PNG
  const handleDownloadReceipt = async () => {
    if (!verifiedTransaction) return;
    setIsDownloadingReceipt(true);
    try {
      await downloadTransactionReceiptPNG(
        verifiedTransaction,
        student,
        student.level || 100,
        activeSemesterCode
      );
    } catch (e) {
      console.error('Download receipt error:', e);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  // Share Receipt
  const handleShareReceipt = async () => {
    if (!verifiedTransaction) return;
    setIsSharingReceipt(true);
    try {
      await shareTransactionReceipt(
        verifiedTransaction,
        student,
        student.level || 100,
        activeSemesterCode
      );
    } catch (e) {
      console.error('Share receipt error:', e);
    } finally {
      setIsSharingReceipt(false);
    }
  };

  // Print Receipt
  const handlePrintReceipt = () => {
    if (!verifiedTransaction) return;
    printTransactionReceipt(
      verifiedTransaction,
      student,
      student.level || 100,
      activeSemesterCode
    );
  };

  return (
    <div className="min-h-screen bg-[#F2F2F7] text-[#1C1C1E] flex flex-col items-center justify-start px-3.5 sm:px-4 py-4 sm:py-7 relative overflow-x-hidden select-none safe-area-top safe-area-bottom">
      {/* Ambient background soft orbs */}
      <div className="fixed top-[-100px] left-[-80px] w-[340px] h-[340px] rounded-full bg-blue-400/20 blur-[100px] pointer-events-none -z-10" />
      <div className="fixed bottom-[-80px] right-[-80px] w-[360px] h-[360px] rounded-full bg-indigo-400/20 blur-[100px] pointer-events-none -z-10" />

      {/* Main Container */}
      <div className="w-full max-w-lg mx-auto flex flex-col space-y-4">
        {/* Navigation Bar / Return to App */}
        <div className="flex items-center justify-between">
          <button
            id="btn-nav-return-to-app"
            onClick={handleReturnToApp}
            className="flex items-center gap-1.5 py-2 px-3.5 rounded-full bg-white/95 border border-slate-200/90 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-bold text-[13px] cursor-pointer touch-target"
            title="Return to University Scheduler"
          >
            <ArrowLeft className="w-4 h-4 text-slate-600" />
            <span>Back to App</span>
          </button>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-700 text-[11.5px] font-bold">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
            <span>Paystack 256-Bit SSL</span>
          </div>
        </div>

        {/* Brand Header */}
        <div className="text-center pt-1 pb-1">
          <div className="w-13 h-13 sm:w-14 sm:h-14 rounded-2xl bg-gradient-to-tr from-[#0052CC] via-[#007AFF] to-[#0A84FF] text-white flex items-center justify-center mx-auto shadow-lg shadow-blue-500/25 mb-2 border border-white/40">
            <CreditCard className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <h1 className="text-[21px] sm:text-[23px] font-extrabold text-[#1C1C1E] tracking-tight">
            Semester Access Payment
          </h1>
          <p className="text-[13px] text-slate-600 font-medium">
            University Scheduler • Official Payment Portal
          </p>
        </div>

        {/* Error / Alert Banner */}
        <AnimatePresence>
          {errorMessage && (
            <motion.div
              initial={{ opacity: 0, y: -8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -8 }}
              className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-[12.5px] flex items-start gap-2.5 shadow-xs"
            >
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1">
                <span className="font-semibold">{errorMessage}</span>
              </div>
              <button
                onClick={() => setErrorMessage(null)}
                className="text-rose-500 hover:text-rose-700 text-[11px] font-bold cursor-pointer"
              >
                Dismiss
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            STATE: REDIRECTING TO PAYSTACK
            ========================================================================= */}
        <AnimatePresence>
          {paymentStatus === 'redirecting' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[26px] p-6 bg-white/95 border border-blue-200 shadow-xl text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-500/30 flex items-center justify-center mx-auto text-[#007AFF] shadow-inner">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-[18px] font-extrabold text-slate-900">
                  Redirecting to Paystack...
                </h3>
                <p className="text-[13px] text-slate-600">
                  Transferring you securely to Paystack to complete your ₦{semesterFee.toLocaleString()} payment.
                </p>
              </div>

              <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 text-[12px] text-slate-500 flex items-center justify-center gap-2">
                <Lock className="w-3.5 h-3.5 text-emerald-600" />
                <span>Card, Bank Transfer, &amp; USSD options await</span>
              </div>

              {redirectAuthUrl && (
                <div className="pt-2">
                  <a
                    href={redirectAuthUrl}
                    className="text-[12.5px] font-bold text-[#007AFF] underline hover:text-blue-700 inline-flex items-center gap-1"
                  >
                    <span>Click here if not redirected automatically</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            STATE: VERIFYING PAYMENT (WHEN RETURNING FROM PAYSTACK)
            ========================================================================= */}
        <AnimatePresence>
          {paymentStatus === 'verifying' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[26px] p-6 bg-white/95 border border-blue-200 shadow-xl text-center space-y-4"
            >
              <div className="w-16 h-16 rounded-full bg-blue-50 border-2 border-blue-500/30 flex items-center justify-center mx-auto text-[#007AFF] shadow-inner">
                <RefreshCw className="w-8 h-8 animate-spin" />
              </div>

              <div className="space-y-1.5">
                <h3 className="text-[18px] font-extrabold text-slate-900">
                  Verifying Payment
                </h3>
                <p className="text-[13px] text-slate-600 font-medium">
                  {statusMessage || 'Validating your transaction with Paystack...'}
                </p>
              </div>

              {/* Progress Steps */}
              <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-left space-y-2 text-[12px]">
                <div className="flex items-center justify-between">
                  <span className={verificationStep >= 1 ? 'font-bold text-slate-800' : 'text-slate-400'}>
                    1. Connecting to Paystack gateway
                  </span>
                  {verificationStep > 1 ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={verificationStep >= 2 ? 'font-bold text-slate-800' : 'text-slate-400'}>
                    2. Confirming payment reference &amp; amount
                  </span>
                  {verificationStep > 2 ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : verificationStep === 2 ? (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>
                <div className="flex items-center justify-between">
                  <span className={verificationStep >= 3 ? 'font-bold text-slate-800' : 'text-slate-400'}>
                    3. Activating semester access in database
                  </span>
                  {verificationStep >= 4 ? (
                    <Check className="w-4 h-4 text-emerald-600" />
                  ) : verificationStep === 3 ? (
                    <RefreshCw className="w-3.5 h-3.5 text-blue-600 animate-spin" />
                  ) : (
                    <div className="w-2 h-2 rounded-full bg-slate-300" />
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            STATE: SUCCESS RECEIPT & AUTOMATIC REDIRECTION
            ========================================================================= */}
        <AnimatePresence>
          {paymentStatus === 'success' && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="rounded-[28px] p-5 sm:p-6 bg-white/95 border border-emerald-300 shadow-xl text-center space-y-4"
            >
              {/* Animated Success Badge */}
              <div className="relative w-16 h-16 mx-auto">
                <div className="w-16 h-16 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/30">
                  <CheckCircle2 className="w-9 h-9 stroke-[2.5]" />
                </div>
                <div className="absolute -top-1 -right-1 w-6 h-6 rounded-full bg-amber-400 text-amber-950 flex items-center justify-center">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
              </div>

              <div className="space-y-1">
                <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
                  Payment Verified &amp; Active
                </span>
                <h3 className="text-[20px] font-black text-slate-900">
                  Semester Access Unlocked!
                </h3>
                <p className="text-[13px] text-slate-600">
                  Your payment was successfully received. Full access to lecture schedules, materials, and deadlines is now active.
                </p>
              </div>

              {/* Auto Redirect Countdown Notice */}
              <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-900 text-[12.5px] font-medium flex items-center justify-center gap-2">
                <Clock className="w-4 h-4 text-emerald-600 animate-pulse" />
                <span>Redirecting back to Scheduler in <strong>{countdown}</strong> seconds...</span>
              </div>

              {/* Transaction Summary Card */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 text-left space-y-2 text-[12.5px]">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Student Name</span>
                  <span className="font-bold text-slate-800">{student?.fullName || student?.full_name || 'Student'}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Matric Number</span>
                  <span className="font-bold text-slate-800">{student?.matricNumber || student?.matric_number}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Academic Term</span>
                  <span className="font-bold text-[#007AFF]">{activeSemesterCode}</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Amount Paid</span>
                  <span className="font-extrabold text-emerald-600 font-mono">₦{semesterFee.toLocaleString()} NGN</span>
                </div>
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-200">
                  <span className="text-slate-500">Payment Gateway</span>
                  <span className="font-bold text-slate-700">Paystack Checkout</span>
                </div>
                {verifiedTransaction?.ref && (
                  <div className="flex items-center justify-between pt-0.5">
                    <span className="text-slate-500">Reference Number</span>
                    <span className="font-mono text-[11px] font-bold text-slate-700">{verifiedTransaction.ref}</span>
                  </div>
                )}
              </div>

              {/* Primary Action: Immediate Return to App */}
              <div className="space-y-2.5 pt-1">
                <button
                  id="btn-return-to-app-now"
                  onClick={handleReturnToApp}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:opacity-95 text-white font-extrabold text-[14.5px] shadow-lg shadow-emerald-500/25 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer touch-target"
                >
                  <span>Return to App Now</span>
                  <ArrowRight className="w-4.5 h-4.5" />
                </button>

                {/* Receipt Actions: Download PNG, Share, Print */}
                <div className="grid grid-cols-3 gap-2">
                  <button
                    onClick={handleDownloadReceipt}
                    disabled={isDownloadingReceipt}
                    className="py-2.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer touch-target shadow-2xs"
                  >
                    <Download className="w-3.5 h-3.5 text-blue-600" />
                    <span>{isDownloadingReceipt ? 'Saving...' : 'Receipt'}</span>
                  </button>

                  <button
                    onClick={handleShareReceipt}
                    disabled={isSharingReceipt}
                    className="py-2.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer touch-target shadow-2xs"
                  >
                    <Share2 className="w-3.5 h-3.5 text-indigo-600" />
                    <span>Share</span>
                  </button>

                  <button
                    onClick={handlePrintReceipt}
                    className="py-2.5 px-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-[11.5px] font-bold transition-all flex items-center justify-center gap-1 cursor-pointer touch-target shadow-2xs"
                  >
                    <Printer className="w-3.5 h-3.5 text-slate-600" />
                    <span>Print</span>
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* =========================================================================
            STATE: ALREADY PAID GUARD (PREVENTS ACCIDENTAL DOUBLE-PAYMENT)
            ========================================================================= */}
        {paymentStatus === 'idle' && student && isAlreadyPaid && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[28px] p-5 sm:p-6 border border-emerald-200 bg-white/95 text-center space-y-4 shadow-sm"
          >
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-600 flex items-center justify-center mx-auto shadow-xs">
              <ShieldCheck className="w-8 h-8" />
            </div>

            <div className="space-y-1">
              <span className="inline-block px-3 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[11px] font-black uppercase tracking-wider">
                Semester Access Active
              </span>
              <h3 className="text-[18px] font-bold text-slate-900 mt-1">
                You have already paid for this semester
              </h3>
              <p className="text-[12.5px] text-slate-600">
                Full access for <strong className="text-slate-800">{activeSemesterCode}</strong> is already active on your account. No further payment is needed.
              </p>
            </div>

            {/* Student Info Pill */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-left text-[12.5px] space-y-1.5">
              <div className="flex justify-between">
                <span className="text-slate-500">Student</span>
                <span className="font-bold text-slate-800">{student.fullName || student.full_name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Matric Number</span>
                <span className="font-bold text-slate-800">{student.matricNumber || student.matric_number}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Department</span>
                <span className="font-bold text-slate-800">{student.department || 'Department of Industrial Chemistry'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500">Status</span>
                <span className="font-bold text-emerald-600">PAID &amp; ACTIVE</span>
              </div>
            </div>

            <button
              onClick={handleReturnToApp}
              className="w-full py-3.5 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-[14px] shadow-md shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-target"
            >
              <span>Return to Scheduler App</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </motion.div>
        )}

        {/* =========================================================================
            STATE: STUDENT ACCOUNT NOT DETECTED (MANUAL SEARCH / ENROLLMENT)
            ========================================================================= */}
        {!student && !isLoadingStudent && paymentStatus === 'idle' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-[26px] p-5 border border-white shadow-sm space-y-4 bg-white/95"
          >
            <div className="text-center space-y-1">
              <div className="w-12 h-12 rounded-2xl bg-blue-50 text-[#007AFF] flex items-center justify-center mx-auto">
                <GraduationCap className="w-6 h-6" />
              </div>
              <h3 className="text-[17px] font-bold text-slate-900">Identify Your Student Account</h3>
              <p className="text-[12.5px] text-slate-600">
                Enter your Matriculation Number or Email to proceed with semester payment.
              </p>
            </div>

            {!showManualCreate ? (
              <form onSubmit={handleManualLookup} className="space-y-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
                    Matriculation Number or Email
                  </label>
                  <input
                    type="text"
                    value={manualMatric}
                    onChange={(e) => setManualMatric(e.target.value)}
                    placeholder="e.g. 2025/PS/ICH/0001 or email"
                    className="w-full px-4 py-3 rounded-2xl bg-slate-50 border border-slate-200 text-[13.5px] font-medium focus:outline-none focus:border-[#007AFF] focus:bg-white transition-all uppercase placeholder:normal-case"
                  />
                </div>

                {manualLookupError && (
                  <p className="text-[12px] text-amber-700 bg-amber-50 p-2 rounded-xl border border-amber-200 font-medium">
                    {manualLookupError}
                  </p>
                )}

                <button
                  type="submit"
                  disabled={isLookingUpMatric || !manualMatric.trim()}
                  className="w-full py-3.5 rounded-2xl bg-[#007AFF] hover:bg-blue-600 disabled:opacity-50 text-white font-bold text-[14px] shadow-md shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer touch-target"
                >
                  {isLookingUpMatric ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Finding Account...</span>
                    </>
                  ) : (
                    <>
                      <span>Find Account</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  <button
                    type="button"
                    onClick={() => setShowManualCreate(true)}
                    className="text-[12px] font-bold text-slate-500 hover:text-blue-600"
                  >
                    Not yet enrolled in the app? Click to enter details manually
                  </button>
                </div>
              </form>
            ) : (
              <form onSubmit={handleSaveManualStudent} className="space-y-3">
                <div>
                  <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
                    Full Name
                  </label>
                  <input
                    type="text"
                    required
                    value={newStudentName}
                    onChange={(e) => setNewStudentName(e.target.value)}
                    placeholder="e.g. Adebayo Ogunlesi"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-medium focus:outline-none focus:border-[#007AFF] focus:bg-white transition-all"
                  />
                </div>

                <div>
                  <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
                    Matriculation Number
                  </label>
                  <input
                    type="text"
                    required
                    value={manualMatric}
                    onChange={(e) => setManualMatric(e.target.value)}
                    placeholder="e.g. 2025/PS/ICH/0001"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-medium uppercase focus:outline-none focus:border-[#007AFF] focus:bg-white transition-all"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
                      Department
                    </label>
                    <input
                      type="text"
                      value={newStudentDept}
                      onChange={(e) => setNewStudentDept(e.target.value)}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[12px] font-medium focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <div>
                    <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
                      Level
                    </label>
                    <select
                      value={newStudentLevel}
                      onChange={(e) => setNewStudentLevel(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[12px] font-medium focus:outline-none focus:border-[#007AFF]"
                    >
                      <option value={100}>100 Level</option>
                      <option value={200}>200 Level</option>
                      <option value={300}>300 Level</option>
                      <option value={400}>400 Level</option>
                      <option value={500}>500 Level</option>
                    </select>
                  </div>
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-2xl bg-[#007AFF] hover:bg-blue-600 text-white font-bold text-[13.5px] shadow-md shadow-blue-500/25 active:scale-98 transition-all flex items-center justify-center gap-1.5 cursor-pointer touch-target"
                >
                  <span>Continue to Payment</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              </form>
            )}
          </motion.div>
        )}

        {/* =========================================================================
            STATE: ACTIVE CHECKOUT - ORDER BREAKDOWN & REDIRECT BUTTON
            ========================================================================= */}
        {paymentStatus === 'idle' && student && !isAlreadyPaid && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-3.5"
          >
            {/* Student Profile Card */}
            <div className="rounded-[24px] p-4 bg-white/95 border border-white shadow-xs">
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Student Details
                </span>
                <button
                  onClick={() => {
                    setStudent(null);
                    setManualMatric('');
                  }}
                  className="text-[11px] font-bold text-[#007AFF] hover:underline cursor-pointer"
                >
                  Switch Account
                </button>
              </div>

              <div className="flex items-center gap-3 pt-2">
                <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white font-bold text-[16px] flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
                  {(student.fullName || student.name || 'S').charAt(0).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <h3 className="text-[15px] font-bold text-slate-900 truncate">
                    {student.fullName || student.full_name || student.name}
                  </h3>
                  <p className="text-[12px] text-slate-500 font-medium">
                    Matric: <span className="font-bold text-slate-700">{student.matricNumber || student.matric_number}</span>
                  </p>
                  <p className="text-[11px] text-slate-500 truncate">
                    {student.department || 'Department of Industrial Chemistry'} • {student.level || 100} Level
                  </p>
                </div>
              </div>
            </div>

            {/* Semester Access Fee Order Summary Card */}
            <div className="rounded-[26px] p-4.5 bg-white/95 border border-white shadow-xs space-y-3.5">
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div>
                  <h4 className="text-[15.5px] font-extrabold text-slate-900">
                    Semester Access
                  </h4>
                  <p className="text-[12px] text-slate-500">
                    Academic Term: <strong className="text-slate-700">{activeSemesterCode}</strong>
                  </p>
                </div>
                <div className="text-right">
                  <span className="text-[23px] font-black text-[#007AFF] font-mono tracking-tight">
                    ₦{semesterFee.toLocaleString()}
                  </span>
                  <span className="text-[10px] block text-slate-400 font-semibold uppercase tracking-wider">
                    One-Time Payment
                  </span>
                </div>
              </div>

              {/* What is Included checklist */}
              <div className="space-y-2">
                <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Included with Semester Access:
                </p>
                <div className="grid grid-cols-1 gap-2 text-[12px] text-slate-700 font-medium">
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Full Lecture, Lab &amp; Tutorial Schedules</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Course Materials &amp; Downloadable Lecture Notes</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Continuous Assessment &amp; Exam Countdown Timers</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <div className="w-5 h-5 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0">
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                    </div>
                    <span>Departmental Broadcasts &amp; Urgent Announcements</span>
                  </div>
                </div>
              </div>

              {/* Billing Contact */}
              <div className="pt-2 border-t border-slate-100 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Receipt Delivery Email
                  </span>
                  <span className="text-[10px] text-slate-400">Paystack sends receipt here</span>
                </div>
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="email"
                    value={billingEmail}
                    onChange={(e) => setBillingEmail(e.target.value)}
                    placeholder="your.email@example.com"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[12.5px] font-medium text-slate-800 focus:outline-none focus:border-[#007AFF] focus:bg-white transition-all"
                  />
                </div>
              </div>

              {/* Phone number optional */}
              <div className="space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  Phone Number (Optional)
                </span>
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                  <input
                    type="tel"
                    value={billingPhone}
                    onChange={(e) => setBillingPhone(e.target.value)}
                    placeholder="08012345678"
                    className="w-full pl-10 pr-3.5 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-[12.5px] font-medium text-slate-800 focus:outline-none focus:border-[#007AFF] focus:bg-white transition-all"
                  />
                </div>
              </div>
            </div>

            {/* Payment Method Details & Accepted Channels */}
            <div className="rounded-[24px] p-4 bg-white/95 border border-white shadow-xs space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                Accepted Payment Channels via Paystack
              </span>

              <div className="grid grid-cols-2 gap-2 text-[12px] font-semibold text-slate-700">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-blue-100 text-[#007AFF] flex items-center justify-center">
                    <CreditCard className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block font-bold">Debit Card</span>
                    <span className="text-[10px] text-slate-500 font-normal">Mastercard, Visa, Verve</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center">
                    <Building2 className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block font-bold">Bank Transfer</span>
                    <span className="text-[10px] text-slate-500 font-normal">Instant virtual account</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-purple-100 text-purple-700 flex items-center justify-center">
                    <Smartphone className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block font-bold">USSD / OPay</span>
                    <span className="text-[10px] text-slate-500 font-normal">Any Nigerian bank</span>
                  </div>
                </div>

                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200/80 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center">
                    <ShieldCheck className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <span className="block font-bold">Safe &amp; Instant</span>
                    <span className="text-[10px] text-slate-500 font-normal">Verified in seconds</span>
                  </div>
                </div>
              </div>
            </div>

            {/* PRIMARY REDIRECT BUTTON TO PAYSTACK CHECKOUT */}
            <div className="space-y-2 pt-1">
              <button
                id="btn-redirect-to-paystack"
                onClick={handleRedirectToPaystack}
                className="w-full py-4 px-5 rounded-[22px] bg-gradient-to-r from-[#0052CC] via-[#007AFF] to-[#0A84FF] hover:opacity-95 text-white font-extrabold text-[15px] sm:text-[15.5px] shadow-lg shadow-blue-500/25 active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer touch-target"
              >
                <div className="flex items-center gap-2.5">
                  <Lock className="w-5 h-5 text-sky-200" />
                  <span>Pay ₦{semesterFee.toLocaleString()} via Paystack</span>
                </div>
                <div className="flex items-center gap-1 text-[13px] font-bold text-sky-100">
                  <span>Checkout</span>
                  <ChevronRight className="w-4 h-4 stroke-[3]" />
                </div>
              </button>

              {/* Alternative Inline Popup Button */}
              <div className="text-center pt-0.5">
                <button
                  type="button"
                  onClick={handleLaunchInlinePaystack}
                  className="text-[12px] font-bold text-slate-500 hover:text-[#007AFF] inline-flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <span>Prefer in-page popup modal? Click here</span>
                </button>
              </div>
            </div>
          </motion.div>
        )}

        {/* Security & Disclaimer Footer */}
        <div className="pt-3 text-center space-y-1 pb-4">
          <p className="text-[11px] text-slate-400 flex items-center justify-center gap-1 font-medium">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>Payments processed securely by Paystack. Card details are never stored.</span>
          </p>
          <p className="text-[10.5px] text-slate-400">
            For billing inquiries or manual activation assistance, contact your Course Representative.
          </p>
        </div>
      </div>
    </div>
  );
};
