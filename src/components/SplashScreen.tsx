import React, { useEffect } from 'react';
import { motion } from 'motion/react';
import { CalendarDays } from 'lucide-react';

interface SplashScreenProps {
  onComplete: () => void;
  appName?: string;
  isReady?: boolean;
  statusMessage?: string;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({
  onComplete,
  appName = 'Scheduler',
  isReady = true,
  statusMessage,
}) => {
  const [minTimeElapsed, setMinTimeElapsed] = React.useState(false);

  useEffect(() => {
    // Minimum smooth splash duration for high-end branded look
    const timer = setTimeout(() => {
      setMinTimeElapsed(true);
    }, 1800);

    return () => clearTimeout(timer);
  }, []);

  // When BOTH minimum time has elapsed AND the app account state & data are verified
  useEffect(() => {
    if (minTimeElapsed && isReady) {
      const exitTimer = setTimeout(() => {
        onComplete();
      }, 120);
      return () => clearTimeout(exitTimer);
    }
  }, [minTimeElapsed, isReady, onComplete]);

  // Safeguard: Dismiss after 5.0 seconds under any circumstance (e.g. extreme network freeze)
  useEffect(() => {
    const safetyTimer = setTimeout(() => {
      onComplete();
    }, 5000);

    return () => clearTimeout(safetyTimer);
  }, [onComplete]);

  return (
    <motion.div
      key="app-splash-screen"
      initial={{ opacity: 1 }}
      exit={{ opacity: 0, scale: 1.03, filter: 'blur(8px)' }}
      transition={{ duration: 0.55, ease: [0.32, 0.72, 0, 1] }}
      className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-[#F5F5F7] px-6 py-12 overflow-hidden select-none pointer-events-auto"
    >
      {/* Dynamic Animated Ambient Halo Glows */}
      <motion.div
        animate={{
          scale: [1, 1.15, 1],
          opacity: [0.4, 0.65, 0.4],
        }}
        transition={{ repeat: Infinity, duration: 4.5, ease: 'easeInOut' }}
        className="absolute top-[-100px] left-[-80px] w-[420px] h-[420px] rounded-full bg-gradient-to-tr from-blue-400/40 via-sky-300/45 to-indigo-300/30 blur-[100px] pointer-events-none"
      />
      <motion.div
        animate={{
          scale: [1.1, 1, 1.1],
          opacity: [0.35, 0.6, 0.35],
        }}
        transition={{ repeat: Infinity, duration: 5, ease: 'easeInOut', delay: 0.5 }}
        className="absolute bottom-[-100px] right-[-80px] w-[440px] h-[440px] rounded-full bg-gradient-to-br from-indigo-400/35 via-blue-300/40 to-teal-200/30 blur-[110px] pointer-events-none"
      />
      <div className="absolute top-[35%] left-[20%] w-[320px] h-[320px] rounded-full bg-gradient-to-tr from-sky-200/25 to-purple-200/20 blur-[120px] pointer-events-none" />

      {/* Top spacer */}
      <div className="h-4" />

      {/* Center Stage: Minimalist Frosted Logo + Circular Spinner */}
      <div className="flex flex-col items-center text-center my-auto max-w-sm w-full relative">
        
        {/* Animated App Icon with Glow & Rings (Clean, without top-right star badge) */}
        <div className="relative mb-6 flex items-center justify-center">
          {/* Concentric Pulse Rings */}
          <motion.div
            animate={{
              scale: [1, 1.25, 1.35],
              opacity: [0.5, 0.2, 0],
            }}
            transition={{
              repeat: Infinity,
              duration: 2.4,
              ease: 'easeOut',
            }}
            className="absolute -inset-4 rounded-[42px] border border-[#007AFF]/35 pointer-events-none"
          />

          {/* Pulsing Backlight Bloom */}
          <div className="absolute -inset-4 bg-gradient-to-tr from-[#007AFF] via-sky-400 to-indigo-500 rounded-[38px] blur-2xl opacity-40 animate-pulse" />
          
          {/* Main Frosted Applet Icon */}
          <motion.div
            initial={{ scale: 0.6, opacity: 0, rotate: -6 }}
            animate={{ scale: 1, opacity: 1, rotate: 0 }}
            transition={{ type: 'spring', damping: 16, stiffness: 220, delay: 0.1 }}
            className="relative w-28 h-28 rounded-[30px] bg-white p-1.5 backdrop-blur-2xl border-2 border-white shadow-[0_20px_50px_rgba(0,122,255,0.28)] flex items-center justify-center overflow-hidden text-[#007AFF]"
          >
            <img
              src="/app-icon.png"
              alt={appName}
              className="w-full h-full object-cover rounded-[24px]"
              onError={(e) => {
                const target = e.target as HTMLImageElement;
                if (!target.src.endsWith('/user-icon.jpg')) {
                  target.src = '/user-icon.jpg';
                } else if (!target.src.endsWith('/logo.svg')) {
                  target.src = '/logo.svg';
                }
              }}
            />
          </motion.div>
        </div>

        {/* App Name */}
        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2, duration: 0.45 }}
          className="text-[30px] font-extrabold text-[#1C1C1E] tracking-tight leading-tight mb-7"
        >
          {appName}
        </motion.h1>

        {/* Pro iOS Circular Loading Spinner */}
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.28, duration: 0.4 }}
          className="relative w-10 h-10 flex items-center justify-center"
        >
          {/* Background Track Circle */}
          <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
            <circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              className="stroke-black/10"
              strokeWidth="3.5"
            />
            {/* Animated Rotating Gradient Stroke */}
            <motion.circle
              cx="18"
              cy="18"
              r="14"
              fill="none"
              stroke="url(#spinnerGradient)"
              strokeWidth="3.5"
              strokeLinecap="round"
              strokeDasharray="88"
              strokeDashoffset="55"
              animate={{
                rotate: 360,
                strokeDashoffset: [55, 20, 55],
              }}
              transition={{
                rotate: { repeat: Infinity, duration: 1.1, ease: 'linear' },
                strokeDashoffset: { repeat: Infinity, duration: 1.8, ease: 'easeInOut' },
              }}
              style={{ transformOrigin: 'center' }}
            />
            <defs>
              <linearGradient id="spinnerGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#007AFF" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
          </svg>
        </motion.div>

        {/* Dynamic Verification / Status Message */}
        {statusMessage && (
          <motion.div
            key={statusMessage}
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="mt-4 flex items-center justify-center gap-2 text-[12px] font-medium text-slate-500 tracking-tight"
          >
            <span className="w-1.5 h-1.5 rounded-full bg-[#007AFF] animate-pulse" />
            <span>{statusMessage}</span>
          </motion.div>
        )}
      </div>

      {/* Footer Branding: Powered by Nexlify Innovation (No skip button) */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.45 }}
        className="flex flex-col items-center gap-1 text-center"
      >
        <span className="text-[12px] font-medium text-[#8E8E93] tracking-wide">
          Powered by <span className="font-bold text-[#1C1C1E]">Nexlify Innovation</span>
        </span>
      </motion.div>
    </motion.div>
  );
};
