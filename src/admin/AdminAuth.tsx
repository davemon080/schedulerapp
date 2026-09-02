import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { AdminUser } from './types';
import { verifyAdminCredentialsFromDb } from '../lib/dbService';
import { 
  Shield, 
  Lock, 
  Mail, 
  ArrowRight, 
  Eye, 
  EyeOff, 
  AlertCircle, 
  Database, 
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Server
} from 'lucide-react';

interface AdminAuthProps {
  onLoginSuccess: (admin: AdminUser) => void;
  onBackToStudentPortal: () => void;
}

export const AdminAuth: React.FC<AdminAuthProps> = ({
  onLoginSuccess,
  onBackToStudentPortal,
}) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAdminLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const cleanPass = password.trim();

    try {
      // 1. Attempt login via backend route
      try {
        const res = await fetch('/api/admin/auth/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: cleanEmail, password: cleanPass }),
        });

        const data = await res.json();

        if (res.ok && data.success && data.user) {
          const isRegistry = Boolean(data.user.isRegistry || data.user.role === 'Registry Officer' || data.user.role === 'Registry');
          const adminUser: AdminUser = {
            id: data.user.id,
            email: data.user.email,
            role: data.user.role || (isRegistry ? 'Registry Officer' : 'Super Administrator'),
            fullName: data.user.fullName || (isRegistry ? 'Registry Officer' : 'Academic Administrator'),
            lastLogin: new Date().toISOString(),
            isAdmin: true,
            isRegistry: isRegistry,
          };
          localStorage.setItem('university_admin_session', JSON.stringify(adminUser));
          onLoginSuccess(adminUser);
          return;
        }
      } catch (backendErr) {
        // Continue to Firestore admins collection verification
      }

      // 2. Direct verification against separate Firestore 'admins' collection
      const dbAdmin = await verifyAdminCredentialsFromDb(cleanEmail, cleanPass);
      if (dbAdmin) {
        const isRegistry = Boolean(dbAdmin.isRegistry || dbAdmin.role === 'Registry Officer' || dbAdmin.role === 'Registry' || dbAdmin.role === 'Registrar');
        const adminUser: AdminUser = {
          id: dbAdmin.id || 'admin_davemon080',
          email: dbAdmin.email,
          role: dbAdmin.role || (isRegistry ? 'Registry Officer' : 'Super Administrator'),
          fullName: dbAdmin.fullName || (isRegistry ? 'Registry Officer' : 'David Mon (Super Admin)'),
          lastLogin: new Date().toISOString(),
          isAdmin: true,
          isRegistry: isRegistry,
        };
        localStorage.setItem('university_admin_session', JSON.stringify(adminUser));
        onLoginSuccess(adminUser);
        return;
      }

      // 3. Reject any unauthorized account
      setErrorMessage('Access denied. Only registered administrator accounts on the database can access this portal.');
    } catch (err: any) {
      setErrorMessage(err?.message || 'Access denied. Account is not authorized as an administrator.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleFillDemoAdmin = () => {
    setEmail('davemon080@gmail.com');
    setPassword('Eroll@12');
    setErrorMessage(null);
  };

  return (
    <div className="min-h-screen w-full bg-[#0F172A] text-slate-100 flex flex-col justify-between relative overflow-hidden select-none font-sans">
      {/* Ambient background glows */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Top Bar */}
      <header className="w-full px-6 py-4 flex items-center justify-between z-10">
        <button
          onClick={onBackToStudentPortal}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors cursor-pointer bg-slate-800/60 hover:bg-slate-800 px-3.5 py-2 rounded-xl border border-slate-700/50 backdrop-blur-md"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Student Portal</span>
        </button>

        <div className="flex items-center gap-2 text-xs text-amber-400 bg-amber-500/10 px-3 py-1.5 rounded-full border border-amber-500/20">
          <Database className="w-3.5 h-3.5" />
          <span>Firebase Cloud Firestore</span>
        </div>
      </header>

      {/* Main Login Card */}
      <main className="flex-1 flex items-center justify-center p-4 z-10">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-slate-900/90 border border-slate-800 rounded-3xl p-8 shadow-2xl backdrop-blur-xl relative"
        >
          {/* Logo & Heading */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-blue-600 flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-500/20">
              <Shield className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-2xl font-black tracking-tight text-white">
              Academic Admin Control
            </h1>
            <p className="text-sm text-slate-400 mt-1.5">
              Secure administrative access for university scheduling &amp; curriculum operations
            </p>
          </div>

          {/* Error Message */}
          <AnimatePresence>
            {errorMessage && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mb-6 p-3.5 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs flex items-start gap-2.5"
              >
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{errorMessage}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form onSubmit={handleAdminLogin} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Staff Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@university.edu"
                  className="w-full pl-10 pr-4 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5 uppercase tracking-wider">
                Access Password
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter administrator password"
                  className="w-full pl-10 pr-10 py-3 bg-slate-800/80 border border-slate-700/80 rounded-xl text-white placeholder-slate-500 text-sm focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 transition-all font-medium"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-200 cursor-pointer"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3.5 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all cursor-pointer disabled:opacity-50 mt-2"
            >
              {isLoading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Authenticate &amp; Access Dashboard</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick Demo Credentials */}
          <div className="mt-6 pt-5 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <span className="text-slate-400">Testing credentials:</span>
            <button
              type="button"
              onClick={handleFillDemoAdmin}
              className="text-blue-400 hover:text-blue-300 font-semibold flex items-center gap-1 cursor-pointer bg-blue-500/10 px-2.5 py-1 rounded-lg border border-blue-500/20"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Fill Demo Credentials</span>
            </button>
          </div>
        </motion.div>
      </main>

      {/* Footer */}
      <footer className="w-full px-6 py-4 text-center text-xs text-slate-500 z-10">
        Academic Timetable &amp; Schedule Management System &bull; Powered by Firebase Cloud Firestore
      </footer>
    </div>
  );
};
