import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Wallet,
  CreditCard,
  ArrowDownLeft,
  Send,
  Receipt,
  Eye,
  EyeOff,
  CheckCircle2,
  ArrowLeft,
  ShieldCheck,
  Search,
  Copy,
  Check,
  AlertCircle,
  Lock,
  Unlock,
  RefreshCw,
  Zap,
  Smartphone,
  Building2,
  UserCheck,
  Sparkles,
  BookOpen,
  CalendarCheck,
  BellRing,
  Download,
  Printer,
  FileText,
  Clock,
} from 'lucide-react';
import { UserSession } from '../types';
import {
  WalletTransaction,
  subscribeToUserWallet,
  fundUserWalletPaystack,
  paySemesterAccessWithWallet,
  transferWalletFundsToPeer,
  lookupStudentByMatric,
} from '../lib/dbService';
import {
  downloadTransactionReceiptPNG,
  printTransactionReceipt,
  formatNaira,
} from '../lib/receiptGenerator';

interface WalletViewProps {
  onBack: () => void;
  userSession: UserSession | null;
  activeLevel?: number;
  activeSemester?: string;
  isCourseRep?: boolean;
  onSessionUpdated?: (updates: Partial<UserSession>) => void;
  onAddNotification?: (title: string, message: string, category?: any, type?: any) => void;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.04,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 6 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.2 },
  },
};

const PAYSTACK_TEST_PUBLIC_KEY = 'pk_test_e9672a354a3fbf8d3e696c1265b29355181a3e11';

export const WalletView: React.FC<WalletViewProps> = ({
  onBack,
  userSession,
  activeLevel = 100,
  activeSemester = '1st Semester',
  isCourseRep = false,
  onSessionUpdated,
  onAddNotification,
}) => {
  const studentName = userSession?.fullName || 'Student User';
  const studentMatric = userSession?.matricNumber || '2025/PS/ICH/0001';
  const studentEmail = userSession?.email || 'student@university.edu';
  const studentDepartment = userSession?.department || 'Department of Industrial Chemistry';
  const userIdentifier = userSession?.uid || userSession?.id || userSession?.matricNumber || userSession?.email || '';

  const SEMESTER_FEE = 2000;

  // Strict Course Rep Free Access Check
  const isActualCourseRep = Boolean(
    isCourseRep ||
    userSession?.isCourseRep ||
    (userSession as any)?.iscourserep ||
    userSession?.isAdmin ||
    (userSession as any)?.isadmin
  );

  // Balance & Visibility State
  const [showBalance, setShowBalance] = useState(true);
  const [walletBalance, setWalletBalance] = useState<number>(() => {
    return typeof userSession?.wallet_balance === 'number'
      ? userSession.wallet_balance
      : (typeof userSession?.walletBalance === 'number' ? userSession.walletBalance : 0);
  });

  const [isPaidAccess, setIsPaidAccess] = useState<boolean>(() => {
    return isActualCourseRep || Boolean(
      userSession?.is_paid ||
      userSession?.is_payed
    );
  });

  const [paidSemester, setPaidSemester] = useState<string | undefined>(userSession?.paid_semester);
  const [walletTxns, setWalletTxns] = useState<WalletTransaction[]>(() => {
    try {
      const raw = localStorage.getItem(`wallet_txns_${userIdentifier}`);
      return raw ? JSON.parse(raw) : [];
    } catch {
      return [];
    }
  });

  // Loading & Processing Indicators
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isDownloadingReceipt, setIsDownloadingReceipt] = useState<boolean>(false);
  const [receiptSuccessToast, setReceiptSuccessToast] = useState<string | null>(null);

  // Search & Filter State
  const [filterType, setFilterType] = useState<'all' | 'credit' | 'transfer' | 'access'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Modals State
  const [isFundModalOpen, setIsFundModalOpen] = useState(false);
  const [fundAmount, setFundAmount] = useState('2000');
  const [fundMethod, setFundMethod] = useState<'card' | 'transfer' | 'ussd'>('card');
  const [isPaystackCheckoutOpen, setIsPaystackCheckoutOpen] = useState(false);
  const [isRegisterSemesterModalOpen, setIsRegisterSemesterModalOpen] = useState(false);

  // Transfer Modal State
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);
  const [transferMatric, setTransferMatric] = useState('');
  const [transferAmount, setTransferAmount] = useState('');
  const [transferNote, setTransferNote] = useState('');
  const [isLookingUpPeer, setIsLookingUpPeer] = useState(false);
  const [recipientLookupResult, setRecipientLookupResult] = useState<{ found: boolean; name?: string; department?: string; matric?: string } | null>(null);

  const [selectedTxDetail, setSelectedTxDetail] = useState<WalletTransaction | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const showFeedback = (text: string, type: 'success' | 'error' = 'success') => {
    setFeedbackMsg({ text, type });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  // Download Receipt Handlers
  const handleDownloadReceipt = async (tx: WalletTransaction) => {
    setIsDownloadingReceipt(true);
    try {
      const ok = await downloadTransactionReceiptPNG(tx, userSession, activeLevel, activeSemester);
      if (ok) {
        setReceiptSuccessToast(`Official receipt downloaded (${tx.ref || tx.id})`);
        setTimeout(() => setReceiptSuccessToast(null), 4500);
      }
    } catch (e) {
      console.error('Download receipt error:', e);
    } finally {
      setIsDownloadingReceipt(false);
    }
  };

  const handlePrintReceipt = (tx: WalletTransaction) => {
    printTransactionReceipt(tx, userSession, activeLevel, activeSemester);
  };

  // Stable references for props to prevent infinite synchronization cascades
  const onSessionUpdatedRef = useRef(onSessionUpdated);
  useEffect(() => {
    onSessionUpdatedRef.current = onSessionUpdated;
  }, [onSessionUpdated]);

  const userSessionRef = useRef(userSession);
  useEffect(() => {
    userSessionRef.current = userSession;
  }, [userSession]);

  // Real-time Firestore synchronization in background without UI disruption
  useEffect(() => {
    if (!userIdentifier) return;

    let isMounted = true;

    const unsubscribe = subscribeToUserWallet(userIdentifier, (data) => {
      if (!isMounted) return;

      setWalletBalance((prev) => (prev !== data.balance ? data.balance : prev));

      const isPaid = Boolean(
        data.is_paid ||
        data.is_payed ||
        userSessionRef.current?.isAdmin ||
        (userSessionRef.current as any)?.isadmin ||
        isCourseRep
      );

      setIsPaidAccess((prev) => (prev !== isPaid ? isPaid : prev));
      if (data.paid_semester) {
        setPaidSemester((prev) => (prev !== data.paid_semester ? data.paid_semester : prev));
      }
      if (data.transactions) {
        setWalletTxns(data.transactions);
      }

      // Sync user session state only if actual attributes changed
      const currentSess = userSessionRef.current;
      if (
        currentSess &&
        (currentSess.wallet_balance !== data.balance ||
          currentSess.walletBalance !== data.balance ||
          currentSess.is_paid !== isPaid ||
          currentSess.is_payed !== isPaid ||
          currentSess.paid_semester !== data.paid_semester)
      ) {
        if (onSessionUpdatedRef.current) {
          onSessionUpdatedRef.current({
            wallet_balance: data.balance,
            walletBalance: data.balance,
            is_paid: isPaid,
            is_payed: isPaid,
            paid_semester: data.paid_semester,
          });
        }
      }
    });

    return () => {
      isMounted = false;
      unsubscribe();
    };
  }, [userIdentifier, isCourseRep]);

  // Recipient live lookup during peer transfer input
  useEffect(() => {
    const query = transferMatric.trim();
    if (query.length >= 4) {
      setIsLookingUpPeer(true);
      const timer = setTimeout(() => {
        lookupStudentByMatric(query).then((res) => {
          setRecipientLookupResult(res);
          setIsLookingUpPeer(false);
        });
      }, 300);
      return () => clearTimeout(timer);
    } else {
      setRecipientLookupResult(null);
      setIsLookingUpPeer(false);
    }
  }, [transferMatric]);

  const handleCopy = (text: string, refId: string) => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(text);
      setCopiedRef(refId);
      setTimeout(() => setCopiedRef(null), 2000);
    }
  };

  // 1. Paystack Checkout & Fund Wallet Handler with Key
  const handleInitiatePaystack = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const amountNum = parseFloat(fundAmount);
    if (isNaN(amountNum) || amountNum < 500) {
      showFeedback('Minimum wallet top-up amount is ₦500', 'error');
      return;
    }

    setIsFundModalOpen(false);

    // If Paystack inline JS is available in the browser window, launch standard inline popup
    const paystackPop = (window as any).PaystackPop;
    if (paystackPop && typeof paystackPop.setup === 'function') {
      try {
        const handler = paystackPop.setup({
          key: PAYSTACK_TEST_PUBLIC_KEY,
          email: studentEmail,
          amount: Math.round(amountNum * 100),
          currency: 'NGN',
          ref: `PS_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`,
          metadata: {
            custom_fields: [
              { display_name: 'Student Name', variable_name: 'student_name', value: studentName },
              { display_name: 'Matric Number', variable_name: 'matric_number', value: studentMatric },
            ],
          },
          callback: (response: any) => {
            handleCompletePaystackFunding(response.reference || response.trxref);
          },
          onClose: () => {
            showFeedback('Paystack payment window closed', 'error');
          },
        });
        handler.openIframe();
        return;
      } catch (err) {
        console.warn('Paystack inline popup fallback to modal dialog:', err);
      }
    }

    // Fallback: in-app seamless checkout dialog
    setIsPaystackCheckoutOpen(true);
  };

  // Complete Paystack Payment in Firestore
  const handleCompletePaystackFunding = async (customRef?: string) => {
    const amountNum = parseFloat(fundAmount);
    if (isNaN(amountNum) || amountNum <= 0) return;

    setIsProcessing(true);
    const paystackRef = customRef || `PS_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

    try {
      const res = await fundUserWalletPaystack(
        userIdentifier,
        amountNum,
        paystackRef,
        fundMethod === 'card' ? 'Paystack Debit Card' : fundMethod === 'transfer' ? 'Paystack Bank Transfer' : 'Paystack USSD',
        { email: studentEmail, matric: studentMatric, test_public_key: PAYSTACK_TEST_PUBLIC_KEY }
      );

      if (res.success) {
        setWalletBalance(res.newBalance);
        setIsPaystackCheckoutOpen(false);
        showFeedback(`🎉 ₦${amountNum.toLocaleString()} credited to your Campus Wallet via Paystack!`);

        onAddNotification?.(
          'Wallet Credited',
          `₦${amountNum.toLocaleString()} was credited to your Campus Digital Wallet via Paystack.`,
          'wallet',
          'success'
        );

        if (onSessionUpdated) {
          onSessionUpdated({
            wallet_balance: res.newBalance,
            walletBalance: res.newBalance,
          });
        }
      } else {
        showFeedback(res.error || 'Failed to record Paystack funding', 'error');
      }
    } catch (err: any) {
      showFeedback(err?.message || 'Paystack funding failed', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 2. Pay Semester Access Fee (₦2,000) with 1-Click
  const handleUnlockSemesterAccess = async () => {
    if (walletBalance < SEMESTER_FEE) {
      const needed = SEMESTER_FEE - walletBalance;
      showFeedback(`Insufficient balance (₦${walletBalance.toLocaleString()}). Please top up ₦${needed.toLocaleString()} via Paystack to register semester.`, 'error');
      setFundAmount(String(needed > 0 ? needed : SEMESTER_FEE));
      setIsRegisterSemesterModalOpen(false);
      setIsFundModalOpen(true);
      return;
    }

    setIsProcessing(true);
    try {
      const semLabel = `${activeSemester} 2025/2026`;
      const res = await paySemesterAccessWithWallet(userIdentifier, semLabel, SEMESTER_FEE);

      if (res.success) {
        setWalletBalance(res.newBalance || 0);
        setIsPaidAccess(true);
        setPaidSemester(semLabel);
        setIsRegisterSemesterModalOpen(false);
        showFeedback(`✨ ${semLabel} Registered successfully! Lecture schedules, syllabus materials, and alerts are unlocked.`);

        onAddNotification?.(
          'Semester Access Unlocked',
          `Active semester access enabled for ${semLabel} (₦2,000 deducted).`,
          'wallet',
          'success'
        );

        if (onSessionUpdated) {
          onSessionUpdated({
            wallet_balance: res.newBalance,
            walletBalance: res.newBalance,
            is_paid: true,
            is_payed: true,
            hasFreeAccess: true,
            paid_semester: semLabel,
          });
        }
      } else {
        showFeedback(res.error || 'Failed to process semester registration fee', 'error');
      }
    } catch (err: any) {
      showFeedback(err?.message || 'Error registering semester access', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // 3. Transfer Funds to Peer via Matric Number
  const handleTransferToPeer = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = parseFloat(transferAmount);
    if (isNaN(amountNum) || amountNum <= 0) {
      showFeedback('Please enter a valid transfer amount', 'error');
      return;
    }
    if (walletBalance < amountNum) {
      showFeedback(`Insufficient wallet balance. You have ₦${walletBalance.toLocaleString()}.`, 'error');
      return;
    }
    if (!transferMatric.trim()) {
      showFeedback('Please enter the recipient student matric number', 'error');
      return;
    }

    const cleanMatric = transferMatric.trim().toUpperCase();
    if (cleanMatric === studentMatric.toUpperCase()) {
      showFeedback('You cannot transfer funds to your own matric number', 'error');
      return;
    }

    setIsProcessing(true);
    try {
      const res = await transferWalletFundsToPeer(
        userIdentifier,
        cleanMatric,
        amountNum,
        transferNote.trim() || 'Peer Student Transfer'
      );

      if (res.success) {
        const recipientDisplayName = recipientLookupResult?.name || cleanMatric;
        setWalletBalance(res.newBalance || 0);
        setIsTransferModalOpen(false);
        setTransferMatric('');
        setTransferAmount('');
        setTransferNote('');
        setRecipientLookupResult(null);
        showFeedback(`💸 Sent ₦${amountNum.toLocaleString()} to ${recipientDisplayName} successfully!`);

        onAddNotification?.(
          'Transfer Sent',
          `Transferred ₦${amountNum.toLocaleString()} to ${recipientDisplayName} (${cleanMatric}).`,
          'wallet',
          'info'
        );

        if (onSessionUpdated) {
          onSessionUpdated({
            wallet_balance: res.newBalance,
            walletBalance: res.newBalance,
          });
        }
      } else {
        showFeedback(res.error || 'Transfer failed', 'error');
      }
    } catch (err: any) {
      showFeedback(err?.message || 'Error processing transfer', 'error');
    } finally {
      setIsProcessing(false);
    }
  };

  // Calculations for Wallet Metrics
  const totalInflow = useMemo(() => {
    return walletTxns
      .filter((tx) => tx.type === 'credit')
      .reduce((acc, tx) => acc + tx.amount, 0);
  }, [walletTxns]);

  const totalOutflow = useMemo(() => {
    return walletTxns
      .filter((tx) => tx.type === 'debit')
      .reduce((acc, tx) => acc + tx.amount, 0);
  }, [walletTxns]);

  // Filtered transactions
  const filteredTxns = useMemo(() => {
    return walletTxns.filter((tx) => {
      const matchesFilter =
        filterType === 'all'
          ? true
          : filterType === 'credit'
          ? tx.type === 'credit'
          : filterType === 'access'
          ? tx.category === 'access'
          : filterType === 'transfer'
          ? tx.category === 'transfer'
          : true;

      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        tx.title.toLowerCase().includes(q) ||
        tx.ref.toLowerCase().includes(q) ||
        (tx.recipientOrSender && tx.recipientOrSender.toLowerCase().includes(q)) ||
        (tx.note && tx.note.toLowerCase().includes(q));

      return matchesFilter && matchesSearch;
    });
  }, [walletTxns, filterType, searchQuery]);

  return (
    <div id="campus-wallet-view" className="w-full max-w-lg mx-auto pb-24 pt-1 px-3 sm:px-4 select-none">
      {/* Toast Notification */}
      <AnimatePresence>
        {(feedbackMsg || receiptSuccessToast) && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 left-4 right-4 z-50 max-w-md mx-auto p-3 rounded-2xl shadow-xl border flex items-center gap-2.5 backdrop-blur-xl text-[12.5px] font-semibold ${
              receiptSuccessToast || feedbackMsg?.type === 'success'
                ? 'bg-emerald-50/95 border-emerald-300 text-emerald-800'
                : 'bg-rose-50/95 border-rose-300 text-rose-800'
            }`}
          >
            {receiptSuccessToast || feedbackMsg?.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span className="flex-1">{receiptSuccessToast || feedbackMsg?.text}</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Top Header Bar */}
      <div className="flex items-center justify-between mb-3">
        <button
          id="btn-wallet-back"
          onClick={onBack}
          className="flex items-center gap-1.5 py-1 px-2.5 rounded-full bg-white/90 border border-slate-200 shadow-2xs hover:bg-slate-50 active:scale-95 transition-all text-slate-700 font-semibold text-[12px] cursor-pointer"
        >
          <ArrowLeft className="w-3.5 h-3.5 text-slate-600" />
          <span>Back</span>
        </button>

        <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50/90 border border-blue-200/80 text-[11px] font-bold text-[#007AFF]">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>Paystack Secured</span>
        </div>
      </div>

      <motion.div variants={containerVariants} initial="hidden" animate="visible" className="space-y-3">
        {/* =========================================================================
            1. FIRST CONTAINER: WALLET BALANCE CONTAINER (SLEEK & PROPORTIONAL)
            ========================================================================= */}
        <motion.div variants={itemVariants} id="container-wallet-balance-primary">
          <div className="relative w-full rounded-[22px] overflow-hidden p-4 sm:p-4.5 bg-gradient-to-tr from-[#002855] via-[#0052CC] to-[#007AFF] text-white shadow-[0_12px_28px_rgba(0,122,255,0.22)] border border-white/20">
            {/* Ambient glow ornaments */}
            <div className="absolute top-[-30px] right-[-20px] w-40 h-40 rounded-full bg-white/10 blur-xl pointer-events-none" />
            <div className="absolute bottom-[-30px] left-[-20px] w-36 h-36 rounded-full bg-sky-300/20 blur-lg pointer-events-none" />

            <div className="relative z-10 flex flex-col justify-between space-y-3">
              {/* Card Header Info */}
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-white/20 backdrop-blur-md flex items-center justify-center text-white border border-white/30 shadow-xs">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-[13px] font-bold tracking-tight block">
                      Campus Digital Wallet
                    </span>
                    <span className="text-[9.5px] text-blue-100 uppercase tracking-wider font-semibold block">
                      {studentDepartment.replace('Department of ', '')}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-[10.5px] font-bold text-white shadow-2xs">
                  <CreditCard className="w-3 h-3 text-sky-200" />
                  <span>{activeLevel}L • {studentMatric}</span>
                </div>
              </div>

              {/* Balance Display */}
              <div className="py-0.5">
                <div className="flex items-center gap-2 text-blue-100 text-[11.5px] font-medium mb-0.5">
                  <span>Available Balance</span>
                  <button
                    onClick={() => setShowBalance(!showBalance)}
                    className="p-0.5 hover:text-white transition-colors cursor-pointer"
                    title={showBalance ? 'Hide Balance' : 'Show Balance'}
                  >
                    {showBalance ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                  </button>
                </div>
                <div className="flex items-baseline gap-1.5">
                  <span className="text-2xl sm:text-3xl font-extrabold tracking-tight font-mono">
                    {showBalance ? `₦${walletBalance.toLocaleString('en-NG', { minimumFractionDigits: 2 })}` : '••••••••'}
                  </span>
                  {showBalance && (
                    <span className="text-[11px] font-bold text-sky-200 tracking-wider">NGN</span>
                  )}
                </div>
              </div>

              {/* "REGISTER SEMESTER" BUTTON DIRECTLY INSIDE / ON THE BALANCE CONTAINER */}
              <div className="pt-2 border-t border-white/15">
                {isPaidAccess ? (
                  <button
                    id="btn-semester-status-registered"
                    onClick={() => setIsRegisterSemesterModalOpen(true)}
                    className="w-full py-2 px-3 rounded-xl bg-emerald-500/25 hover:bg-emerald-500/35 border border-emerald-300/40 text-white font-bold text-[12px] backdrop-blur-md shadow-xs active:scale-[0.99] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <div className="w-5 h-5 rounded-full bg-emerald-400 text-emerald-950 flex items-center justify-center">
                        <Check className="w-3 h-3 stroke-[3]" />
                      </div>
                      <span>Semester Access Registered (Active)</span>
                    </div>
                    <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-mono text-emerald-100">
                      UNLOCKED
                    </span>
                  </button>
                ) : (
                  <button
                    id="btn-register-semester-primary"
                    onClick={() => setIsRegisterSemesterModalOpen(true)}
                    className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-amber-400 via-orange-400 to-amber-500 hover:from-amber-300 hover:to-orange-400 text-amber-950 font-extrabold text-[12.5px] shadow-md shadow-black/15 active:scale-[0.98] transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-1.5">
                      <div className="w-5 h-5 rounded-full bg-amber-950 text-amber-300 flex items-center justify-center">
                        <Unlock className="w-3 h-3" />
                      </div>
                      <span>Register Semester (₦2,000)</span>
                    </div>
                    <span className="text-[10px] bg-amber-950/15 border border-amber-950/20 px-2 py-0.5 rounded-full font-bold">
                      {walletBalance >= SEMESTER_FEE ? 'Pay via Balance' : 'Top up & Pay'}
                    </span>
                  </button>
                )}
              </div>

              {/* Card Footer Summary */}
              <div className="flex items-center justify-between text-[10.5px] text-blue-100/90 pt-0.5">
                <span className="font-semibold text-white truncate max-w-[150px]">{studentName}</span>
                <div className="flex items-center gap-2">
                  <span>In: <strong className="text-emerald-300 font-mono">₦{totalInflow.toLocaleString()}</strong></span>
                  <span>Out: <strong className="text-amber-200 font-mono">₦{totalOutflow.toLocaleString()}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </motion.div>

        {/* =========================================================================
            2. SECOND CONTAINER: ACTION BUTTONS (ADD FUNDS, TRANSFER)
            ========================================================================= */}
        <motion.div variants={itemVariants} className="grid grid-cols-2 gap-2.5">
          {/* Fund Wallet via Paystack */}
          <button
            id="btn-fund-wallet-paystack"
            onClick={() => {
              setFundAmount('2000');
              setIsFundModalOpen(true);
            }}
            className="flex items-center gap-2.5 p-3 rounded-[18px] bg-white border border-slate-200/80 shadow-2xs hover:border-blue-300 hover:bg-blue-50/30 active:scale-[0.98] transition-all group cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-blue-500/10 text-[#007AFF] flex items-center justify-center shrink-0 group-hover:bg-[#007AFF] group-hover:text-white transition-colors shadow-2xs">
              <ArrowDownLeft className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-bold text-slate-800 block truncate">Add Funds</span>
              <span className="text-[10.5px] text-[#8E8E93] block truncate">Paystack Gateway</span>
            </div>
          </button>

          {/* Transfer to Peer via Matric No */}
          <button
            id="btn-open-transfer-peer"
            onClick={() => setIsTransferModalOpen(true)}
            className="flex items-center gap-2.5 p-3 rounded-[18px] bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-300 hover:bg-indigo-50/30 active:scale-[0.98] transition-all group cursor-pointer text-left"
          >
            <div className="w-9 h-9 rounded-xl bg-indigo-500/10 text-indigo-600 flex items-center justify-center shrink-0 group-hover:bg-indigo-600 group-hover:text-white transition-colors shadow-2xs">
              <Send className="w-4.5 h-4.5" />
            </div>
            <div className="min-w-0">
              <span className="text-[13px] font-bold text-slate-800 block truncate">Transfer</span>
              <span className="text-[10.5px] text-[#8E8E93] block truncate">To Student Peer</span>
            </div>
          </button>
        </motion.div>

        {/* =========================================================================
            3. THIRD CONTAINER: SEMESTER ACCESS OVERVIEW & BENEFITS
            ========================================================================= */}
        <motion.div variants={itemVariants}>
          <div className={`w-full p-3 sm:p-3.5 rounded-[18px] border transition-all ${
            isPaidAccess 
              ? 'bg-emerald-50/80 border-emerald-200/90 text-emerald-950'
              : 'bg-amber-50/80 border-amber-200/90 text-amber-950'
          }`}>
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-white font-bold shadow-xs ${
                  isPaidAccess ? 'bg-emerald-600' : 'bg-amber-600'
                }`}>
                  {isPaidAccess ? <CheckCircle2 className="w-4 h-4" /> : <Lock className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="text-[12.5px] font-bold">
                    {isPaidAccess ? 'Semester Access Active' : 'Semester Access Required'}
                  </h4>
                  <span className="text-[10.5px] opacity-80 block">
                    {isPaidAccess ? (paidSemester || `${activeSemester} 2025/2026`) : 'Fee: ₦2,000 / Semester'}
                  </span>
                </div>
              </div>

              {!isPaidAccess && (
                <button
                  onClick={() => setIsRegisterSemesterModalOpen(true)}
                  className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-bold text-[11px] shadow-xs active:scale-95 transition-all cursor-pointer"
                >
                  Register Now
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-1.5 pt-1.5 border-t border-black/5 text-[10.5px]">
              <div className="flex items-center gap-1 font-medium opacity-90">
                <CalendarCheck className="w-3 h-3 shrink-0 text-blue-600" />
                <span className="truncate">Timetable</span>
              </div>
              <div className="flex items-center gap-1 font-medium opacity-90">
                <BookOpen className="w-3 h-3 shrink-0 text-indigo-600" />
                <span className="truncate">Syllabi</span>
              </div>
              <div className="flex items-center gap-1 font-medium opacity-90">
                <BellRing className="w-3 h-3 shrink-0 text-amber-600" />
                <span className="truncate">Deadlines</span>
              </div>
            </div>
          </div>
        </motion.div>

        {/* =========================================================================
            4. FOURTH CONTAINER: WALLET HISTORY & RECEIPTS (ACCESSIBLE IN WALLET VIEW)
            ========================================================================= */}
        <motion.div variants={itemVariants} className="space-y-2.5 pt-0.5">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-[14px] font-bold text-[#1C1C1E]">
                Wallet History &amp; Receipts
              </h3>
              <p className="text-[11px] text-[#8E8E93]">
                Audit transactions &amp; download receipts
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-bold text-blue-600 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-100">
                {filteredTxns.length} {filteredTxns.length === 1 ? 'Record' : 'Records'}
              </span>
            </div>
          </div>

          {/* Filter Pills */}
          <div className="flex items-center gap-1 overflow-x-auto pb-0.5 no-scrollbar">
            {(
              [
                { id: 'all', label: 'All' },
                { id: 'credit', label: 'Top-ups' },
                { id: 'transfer', label: 'Transfers' },
                { id: 'access', label: 'Semester' },
              ] as const
            ).map((tab) => (
              <button
                key={tab.id}
                onClick={() => setFilterType(tab.id)}
                className={`px-3 py-1 rounded-full text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                  filterType === tab.id
                    ? 'bg-[#007AFF] text-white shadow-2xs'
                    : 'bg-white text-slate-600 border border-slate-200/80 hover:bg-slate-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Search Box */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search reference, student matric, or note..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 rounded-xl bg-white border border-slate-200/80 text-[12px] placeholder-slate-400 focus:outline-none focus:border-[#007AFF] transition-colors"
            />
          </div>

          {/* Transaction List with immediate display */}
          <div className="space-y-1.5">
            {filteredTxns.length === 0 ? (
              <div className="p-6 text-center bg-white/80 rounded-[18px] border border-slate-200/70 shadow-2xs">
                <Receipt className="w-7 h-7 text-slate-300 mx-auto mb-1.5" />
                <p className="text-[12.5px] font-semibold text-slate-700">No transactions recorded</p>
                <p className="text-[11px] text-[#8E8E93] mt-0.5">
                  {searchQuery
                    ? 'No transactions match your search query'
                    : 'Your wallet transactions will appear here as soon as you fund, register, or transfer'}
                </p>
              </div>
            ) : (
              filteredTxns.map((tx) => {
                const isCredit = tx.type === 'credit';
                const isAccess = tx.category === 'access';
                const isTransfer = tx.category === 'transfer';

                return (
                  <motion.div
                    key={tx.id}
                    onClick={() => setSelectedTxDetail(tx)}
                    whileHover={{ scale: 1.003 }}
                    whileTap={{ scale: 0.99 }}
                    className="w-full bg-white p-2.5 sm:p-3 rounded-[16px] border border-slate-200/80 shadow-2xs hover:border-blue-300 transition-all flex items-center justify-between cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <div
                        className={`w-8.5 h-8.5 rounded-xl flex items-center justify-center shrink-0 ${
                          isCredit
                            ? 'bg-emerald-500/10 text-emerald-600'
                            : isAccess
                            ? 'bg-amber-500/10 text-amber-600'
                            : 'bg-indigo-500/10 text-indigo-600'
                        }`}
                      >
                        {isCredit ? (
                          <ArrowDownLeft className="w-4 h-4" />
                        ) : isAccess ? (
                          <Unlock className="w-4 h-4" />
                        ) : (
                          <Send className="w-4 h-4" />
                        )}
                      </div>

                      <div className="text-left min-w-0">
                        <span className="text-[12.5px] font-bold text-[#1C1C1E] block truncate">
                          {tx.title}
                        </span>
                        <div className="flex items-center gap-1.5 mt-0.5 text-[10.5px] text-[#8E8E93]">
                          <span>{tx.date}</span>
                          <span>•</span>
                          <span className="font-mono text-[10px] truncate max-w-[100px]">{tx.ref}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 ml-2">
                      <div className="text-right">
                        <span
                          className={`text-[13px] font-bold block ${
                            isCredit ? 'text-emerald-600' : 'text-[#1C1C1E]'
                          }`}
                        >
                          {isCredit ? '+' : '-'}₦{tx.amount.toLocaleString()}
                        </span>
                        <span className="inline-flex items-center gap-0.5 text-[9.5px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded-full border border-emerald-100">
                          {tx.status}
                        </span>
                      </div>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDownloadReceipt(tx);
                        }}
                        disabled={isDownloadingReceipt}
                        className="w-7.5 h-7.5 rounded-lg bg-slate-100 hover:bg-blue-50 text-slate-400 hover:text-[#007AFF] flex items-center justify-center transition-colors cursor-pointer"
                        title="Download Official Receipt"
                      >
                        <Download className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })
            )}
          </div>
        </motion.div>
      </motion.div>

      {/* =========================================================================
          MODAL A: REGISTER SEMESTER CONFIRMATION MODAL
          ========================================================================= */}
      <AnimatePresence>
        {isRegisterSemesterModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-sm bg-white rounded-t-[26px] sm:rounded-[24px] p-5 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-md shadow-amber-500/25">
                    <Sparkles className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#1C1C1E]">
                      Semester Registration
                    </h3>
                    <p className="text-[11px] text-[#8E8E93]">
                      Academic Session 2025/2026
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsRegisterSemesterModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              {isPaidAccess ? (
                <div className="space-y-3">
                  <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-950">
                    <div className="flex items-center gap-1.5 mb-1">
                      <CheckCircle2 className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
                      <span className="font-bold text-[13px]">You are already registered!</span>
                    </div>
                    <p className="text-[11.5px] text-emerald-800 leading-relaxed">
                      Your semester access is active for {paidSemester || `${activeSemester} 2025/2026`}. You have full access to lecture schedules, lab venues, syllabi PDFs, course rep announcements, and deadline reminders.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => setIsRegisterSemesterModalOpen(false)}
                    className="w-full py-2.5 rounded-xl bg-slate-900 text-white font-bold text-[13px] cursor-pointer hover:bg-slate-800 transition-all"
                  >
                    Got It
                  </button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-1.5 text-[12px]">
                    <div className="flex justify-between">
                      <span className="text-slate-500">Target Semester:</span>
                      <span className="font-bold text-slate-800">{activeSemester} 2025/2026</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-500">Student Account:</span>
                      <span className="font-bold text-slate-800">{studentMatric}</span>
                    </div>
                    <div className="flex justify-between items-center pt-1.5 border-t border-slate-200">
                      <span className="text-slate-600 font-semibold">Semester Fee:</span>
                      <span className="font-extrabold text-[15px] text-amber-600">₦2,000</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-600">Current Balance:</span>
                      <span className="font-mono font-bold text-slate-800">₦{walletBalance.toLocaleString()}</span>
                    </div>
                  </div>

                  {walletBalance >= SEMESTER_FEE ? (
                    <button
                      type="button"
                      onClick={handleUnlockSemesterAccess}
                      disabled={isProcessing}
                      className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 text-white font-bold text-[13.5px] shadow-md shadow-emerald-500/25 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                    >
                      {isProcessing ? (
                        <RefreshCw className="w-4 h-4 animate-spin" />
                      ) : (
                        <Unlock className="w-4 h-4" />
                      )}
                      <span>Deduct ₦2,000 &amp; Register Semester</span>
                    </button>
                  ) : (
                    <div className="space-y-2">
                      <div className="p-2.5 rounded-xl bg-amber-50 border border-amber-200 text-[11.5px] text-amber-900 flex items-start gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5 text-amber-600 shrink-0 mt-0.5" />
                        <span>
                          You need ₦{(SEMESTER_FEE - walletBalance).toLocaleString()} more in your wallet to register for {activeSemester}.
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setFundAmount(String(SEMESTER_FEE - walletBalance));
                          setIsRegisterSemesterModalOpen(false);
                          setIsFundModalOpen(true);
                        }}
                        className="w-full py-3 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[13.5px] shadow-md shadow-blue-500/25 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Zap className="w-4 h-4" />
                        <span>Fund ₦{(SEMESTER_FEE - walletBalance).toLocaleString()} with Paystack &amp; Unlock</span>
                      </button>
                    </div>
                  )}
                </div>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL B: FUND WALLET VIA PAYSTACK
          ========================================================================= */}
      <AnimatePresence>
        {isFundModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-sm bg-white rounded-t-[26px] sm:rounded-[24px] p-5 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-blue-50 flex items-center justify-center text-[#007AFF]">
                    <Wallet className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#1C1C1E]">
                      Fund Campus Wallet
                    </h3>
                    <p className="text-[11px] text-[#8E8E93]">
                      Instant deposit via Paystack Gateway
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setIsFundModalOpen(false)}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleInitiatePaystack} className="space-y-3">
                {/* Preset Amount Pills */}
                <div>
                  <label className="text-[11.5px] font-bold text-slate-700 block mb-1.5">
                    Select Quick Amount (NGN)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[
                      { amt: '2000', label: '₦2,000', note: 'Semester' },
                      { amt: '3000', label: '₦3,000' },
                      { amt: '5000', label: '₦5,000' },
                      { amt: '10000', label: '₦10,000' },
                    ].map((item) => (
                      <button
                        type="button"
                        key={item.amt}
                        onClick={() => setFundAmount(item.amt)}
                        className={`py-1.5 px-1 rounded-xl text-[11.5px] font-bold border transition-all cursor-pointer flex flex-col items-center justify-center ${
                          fundAmount === item.amt
                            ? 'bg-[#007AFF] text-white border-[#007AFF] shadow-xs'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        <span>{item.label}</span>
                        {item.note && (
                          <span className={`text-[8.5px] ${fundAmount === item.amt ? 'text-blue-100' : 'text-blue-600'} font-semibold`}>
                            {item.note}
                          </span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Custom Amount Input */}
                <div>
                  <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                    Or Enter Custom Amount (₦)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                      ₦
                    </span>
                    <input
                      type="number"
                      min="500"
                      step="100"
                      value={fundAmount}
                      onChange={(e) => setFundAmount(e.target.value)}
                      placeholder="e.g. 2000"
                      required
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 font-bold text-[14px] focus:outline-none focus:border-[#007AFF]"
                    />
                  </div>
                  <span className="text-[10px] text-[#8E8E93] mt-0.5 block">
                    Minimum top-up: ₦500
                  </span>
                </div>

                {/* Payment Method Selector */}
                <div>
                  <label className="text-[11.5px] font-bold text-slate-700 block mb-1.5">
                    Paystack Channel
                  </label>
                  <div className="grid grid-cols-3 gap-1.5">
                    <button
                      type="button"
                      onClick={() => setFundMethod('card')}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        fundMethod === 'card'
                          ? 'border-[#007AFF] bg-blue-50/50 text-[#007AFF]'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <CreditCard className="w-3.5 h-3.5" />
                      <span className="text-[10.5px] font-bold">Debit Card</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFundMethod('transfer')}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        fundMethod === 'transfer'
                          ? 'border-[#007AFF] bg-blue-50/50 text-[#007AFF]'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Building2 className="w-3.5 h-3.5" />
                      <span className="text-[10.5px] font-bold">Transfer</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setFundMethod('ussd')}
                      className={`p-2 rounded-xl border flex flex-col items-center gap-1 transition-all cursor-pointer ${
                        fundMethod === 'ussd'
                          ? 'border-[#007AFF] bg-blue-50/50 text-[#007AFF]'
                          : 'border-slate-200 bg-white text-slate-600'
                      }`}
                    >
                      <Smartphone className="w-3.5 h-3.5" />
                      <span className="text-[10.5px] font-bold">USSD Code</span>
                    </button>
                  </div>
                </div>

                {/* Submit to Paystack */}
                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-[#007AFF] to-[#0A84FF] text-white font-bold text-[13.5px] shadow-md shadow-blue-500/25 hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer mt-1"
                >
                  <ShieldCheck className="w-4 h-4" />
                  <span>Proceed with Paystack (₦{parseFloat(fundAmount || '0').toLocaleString()})</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL C: PAYSTACK TEST CHECKOUT OVERLAY
          ========================================================================= */}
      <AnimatePresence>
        {isPaystackCheckoutOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-[360px] bg-white rounded-[22px] overflow-hidden shadow-2xl border border-slate-200"
            >
              {/* Paystack Header Brand */}
              <div className="bg-[#0BA4DB] p-3.5 text-white flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-md bg-white/20 flex items-center justify-center font-extrabold text-xs tracking-tight">
                    P
                  </div>
                  <div>
                    <span className="text-[12.5px] font-extrabold tracking-tight">paystack</span>
                    <span className="text-[9.5px] text-sky-100 block">Secured Payment Gateway</span>
                  </div>
                </div>
                <div className="text-right">
                  <span className="text-[9.5px] text-sky-100 block">Amount</span>
                  <span className="text-[14px] font-extrabold">₦{parseFloat(fundAmount || '0').toLocaleString()}</span>
                </div>
              </div>

              <div className="p-4 space-y-3">
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-[11.5px] text-slate-700">
                  <div className="flex justify-between mb-0.5">
                    <span className="text-slate-500">Student Account:</span>
                    <span className="font-bold text-slate-800">{studentMatric}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Email:</span>
                    <span className="font-mono text-slate-800 truncate max-w-[160px]">{studentEmail}</span>
                  </div>
                </div>

                {fundMethod === 'card' && (
                  <div className="space-y-2">
                    <div className="p-3 rounded-xl border border-blue-200 bg-blue-50/50 text-[11.5px]">
                      <div className="flex items-center justify-between text-blue-900 font-bold mb-0.5">
                        <span>Card Checkout</span>
                        <span className="text-[9.5px] bg-blue-200/80 px-1.5 py-0.5 rounded font-mono">TEST MODE</span>
                      </div>
                      <p className="text-[11px] text-blue-800">
                        Paystack test key active. Click below to verify and complete funding instantly.
                      </p>
                    </div>
                  </div>
                )}

                {fundMethod === 'transfer' && (
                  <div className="space-y-2 text-[11.5px]">
                    <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50">
                      <span className="text-[10px] text-slate-500 uppercase tracking-wider block">Paystack Virtual Bank</span>
                      <p className="text-[13px] font-bold text-slate-800">Wema Bank / Paystack</p>
                      <div className="flex items-center justify-between mt-1 pt-1 border-t border-slate-200">
                        <span className="font-mono font-bold text-[13px] text-blue-600">9938201948</span>
                        <button
                          type="button"
                          onClick={() => handleCopy('9938201948', 'wema')}
                          className="text-[10.5px] font-semibold text-blue-600 cursor-pointer"
                        >
                          {copiedRef === 'wema' ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                    </div>
                  </div>
                )}

                {fundMethod === 'ussd' && (
                  <div className="p-2.5 rounded-xl border border-slate-200 bg-slate-50 text-[11.5px]">
                    <span className="text-slate-500 block mb-1">Dial USSD Code on your registered SIM:</span>
                    <p className="font-mono font-bold text-[13px] text-slate-800 bg-white p-1.5 rounded-lg border text-center">
                      *737*000*{fundAmount}#
                    </p>
                  </div>
                )}

                <div className="flex items-center gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsPaystackCheckoutOpen(false)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-600 font-semibold text-[12px] hover:bg-slate-50 cursor-pointer"
                  >
                    Cancel
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCompletePaystackFunding()}
                    disabled={isProcessing}
                    className="flex-2 py-2 rounded-xl bg-[#0BA4DB] text-white font-bold text-[12.5px] shadow-md hover:brightness-105 active:scale-95 transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
                  >
                    {isProcessing ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <CheckCircle2 className="w-3.5 h-3.5" />
                    )}
                    <span>I Have Paid ₦{parseFloat(fundAmount || '0').toLocaleString()}</span>
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL D: PEER-TO-PEER WALLET TRANSFER
          ========================================================================= */}
      <AnimatePresence>
        {isTransferModalOpen && (
          <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, y: 100 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 100 }}
              className="w-full max-w-sm bg-white rounded-t-[26px] sm:rounded-[24px] p-5 shadow-2xl border border-slate-100"
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-indigo-50 flex items-center justify-center text-indigo-600">
                    <Send className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-[15px] font-bold text-[#1C1C1E]">
                      Transfer Funds to Peer
                    </h3>
                    <p className="text-[11px] text-[#8E8E93]">
                      Instant transfer via Matriculation Number
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setIsTransferModalOpen(false);
                    setRecipientLookupResult(null);
                  }}
                  className="w-7 h-7 rounded-full bg-slate-100 flex items-center justify-center text-slate-500 hover:bg-slate-200 transition-colors cursor-pointer text-xs"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleTransferToPeer} className="space-y-3">
                {/* Matric Number Input & Live Student Lookup */}
                <div>
                  <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                    Recipient Matriculation Number
                  </label>
                  <div className="relative">
                    <input
                      type="text"
                      placeholder="e.g. 2025/PS/ICH/0002"
                      value={transferMatric}
                      onChange={(e) => setTransferMatric(e.target.value)}
                      required
                      className="w-full px-3 py-2 rounded-xl border border-slate-200 text-[13px] font-mono uppercase focus:outline-none focus:border-indigo-500"
                    />
                    {isLookingUpPeer && (
                      <div className="absolute right-3 top-1/2 -translate-y-1/2">
                        <RefreshCw className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
                      </div>
                    )}
                  </div>

                  {/* Recipient verification card */}
                  {recipientLookupResult?.found && (
                    <motion.div
                      initial={{ opacity: 0, y: -4 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-1.5 p-2 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-[11.5px]"
                    >
                      <div className="flex items-center gap-1.5">
                        <UserCheck className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <div>
                          <span className="font-bold text-emerald-900 block leading-tight">{recipientLookupResult.name}</span>
                          <span className="text-[10px] text-emerald-700 block">{recipientLookupResult.department}</span>
                        </div>
                      </div>
                      <span className="text-[9.5px] font-bold bg-emerald-200/80 text-emerald-800 px-1.5 py-0.5 rounded-full">
                        Verified
                      </span>
                    </motion.div>
                  )}
                </div>

                {/* Amount Input with Quick Pills */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11.5px] font-bold text-slate-700">
                      Transfer Amount (₦)
                    </label>
                    <span className="text-[10.5px] text-[#8E8E93]">
                      Bal: ₦{walletBalance.toLocaleString()}
                    </span>
                  </div>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 font-bold text-slate-500 text-sm">
                      ₦
                    </span>
                    <input
                      type="number"
                      min="100"
                      step="50"
                      placeholder="Amount to send"
                      value={transferAmount}
                      onChange={(e) => setTransferAmount(e.target.value)}
                      required
                      className="w-full pl-7 pr-3 py-2 rounded-xl border border-slate-200 font-bold text-[14px] focus:outline-none focus:border-indigo-500"
                    />
                  </div>

                  {/* Quick Amount Buttons */}
                  <div className="grid grid-cols-4 gap-1 mt-1.5">
                    {['500', '1000', '2000'].map((amt) => (
                      <button
                        type="button"
                        key={amt}
                        onClick={() => setTransferAmount(amt)}
                        className="py-1 rounded-lg text-[10.5px] font-bold bg-slate-50 border border-slate-200 text-slate-600 hover:bg-indigo-50 hover:border-indigo-200 hover:text-indigo-600 cursor-pointer transition-all"
                      >
                        ₦{parseInt(amt, 10).toLocaleString()}
                      </button>
                    ))}
                    <button
                      type="button"
                      onClick={() => setTransferAmount(String(walletBalance))}
                      className="py-1 rounded-lg text-[10.5px] font-bold bg-indigo-50 border border-indigo-200 text-indigo-700 hover:bg-indigo-100 cursor-pointer transition-all"
                    >
                      Max
                    </button>
                  </div>
                </div>

                {/* Note */}
                <div>
                  <label className="text-[11.5px] font-bold text-slate-700 block mb-1">
                    Transfer Note (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Study materials / lab manuals"
                    value={transferNote}
                    onChange={(e) => setTransferNote(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-xl border border-slate-200 text-[12.5px] focus:outline-none focus:border-indigo-500"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isProcessing}
                  className="w-full py-3 rounded-xl bg-indigo-600 text-white font-bold text-[13.5px] shadow-md shadow-indigo-500/25 hover:bg-indigo-700 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50 mt-1"
                >
                  {isProcessing ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>Send ₦{parseFloat(transferAmount || '0').toLocaleString()} to Peer</span>
                </button>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* =========================================================================
          MODAL E: TRANSACTION RECEIPT DETAILS MODAL
          ========================================================================= */}
      <AnimatePresence>
        {selectedTxDetail && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
            <motion.div
              initial={{ scale: 0.92, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.92, opacity: 0 }}
              className="w-full max-w-[360px] bg-white rounded-[22px] p-5 shadow-2xl border border-slate-100 text-center"
            >
              <div className="w-10 h-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto mb-2.5">
                <Receipt className="w-5 h-5" />
              </div>

              <span className="text-[10.5px] font-bold uppercase tracking-wider text-slate-400">
                Official Transaction Receipt
              </span>
              <h3 className="text-lg font-extrabold text-[#1C1C1E] mt-0.5 mb-0.5">
                {selectedTxDetail.type === 'credit' ? '+' : '-'}₦{selectedTxDetail.amount.toLocaleString()}
              </h3>
              <p className="text-[12.5px] font-semibold text-slate-700 mb-3">
                {selectedTxDetail.title}
              </p>

              <div className="space-y-1.5 text-left text-[11.5px] bg-slate-50 p-3 rounded-xl border border-slate-100 mb-4">
                <div className="flex justify-between">
                  <span className="text-slate-500">Status</span>
                  <span className="font-bold text-emerald-600">{selectedTxDetail.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Date</span>
                  <span className="font-medium text-slate-800">{selectedTxDetail.date}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-slate-500">Reference</span>
                  <div className="flex items-center gap-1 font-mono text-[10.5px] font-bold text-slate-800">
                    <span>{selectedTxDetail.ref}</span>
                    <button
                      onClick={() => handleCopy(selectedTxDetail.ref, selectedTxDetail.id)}
                      className="p-0.5 hover:text-blue-600 cursor-pointer"
                      title="Copy Reference"
                    >
                      {copiedRef === selectedTxDetail.id ? (
                        <Check className="w-3 h-3 text-emerald-600" />
                      ) : (
                        <Copy className="w-3 h-3 text-slate-400" />
                      )}
                    </button>
                  </div>
                </div>
                {selectedTxDetail.recipientOrSender && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Counterparty</span>
                    <span className="font-medium text-slate-800">{selectedTxDetail.recipientOrSender}</span>
                  </div>
                )}
                {selectedTxDetail.note && (
                  <div className="flex justify-between">
                    <span className="text-slate-500">Description / Note</span>
                    <span className="font-medium text-slate-800 text-right">{selectedTxDetail.note}</span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => handleDownloadReceipt(selectedTxDetail)}
                  disabled={isDownloadingReceipt}
                  className="w-full py-2.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-bold text-[13px] hover:from-blue-700 hover:to-indigo-700 shadow-md shadow-blue-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isDownloadingReceipt ? (
                    <>
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                      <span>Generating Receipt...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-3.5 h-3.5" />
                      <span>Download Receipt (PNG)</span>
                    </>
                  )}
                </button>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handlePrintReceipt(selectedTxDetail)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 text-slate-700 font-semibold text-[12px] transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    <Printer className="w-3.5 h-3.5" />
                    <span>Print / PDF</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => handleCopy(selectedTxDetail.ref, `full-${selectedTxDetail.id}`)}
                    className="flex-1 py-2 rounded-xl border border-slate-200 text-slate-700 font-semibold text-[12px] hover:bg-slate-50 transition-colors flex items-center justify-center gap-1 cursor-pointer"
                  >
                    {copiedRef === `full-${selectedTxDetail.id}` ? (
                      <>
                        <Check className="w-3 h-3 text-emerald-600" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3 h-3 text-slate-400" />
                        <span>Copy Ref</span>
                      </>
                    )}
                  </button>
                </div>

                <button
                  type="button"
                  onClick={() => setSelectedTxDetail(null)}
                  className="w-full py-2 rounded-xl bg-slate-900 text-white font-bold text-[12.5px] hover:bg-slate-800 transition-colors cursor-pointer"
                >
                  Close
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
