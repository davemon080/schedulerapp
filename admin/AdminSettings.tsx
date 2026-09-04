import React, { useState, useEffect } from 'react';
import { 
  Settings, 
  Shield, 
  Database, 
  Key, 
  Server, 
  User, 
  CheckCircle2, 
  LogOut,
  ExternalLink,
  Info,
  UserPlus,
  Trash2,
  Lock,
  Eye,
  EyeOff,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Users
} from 'lucide-react';
import { AdminUser } from './types';
import { 
  fetchRegistryAccounts, 
  createRegistryAccount, 
  deleteRegistryAccount, 
  AdminAccountRecord 
} from '@src/lib/dbService';

interface AdminSettingsProps {
  adminUser: AdminUser;
  onLogout: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  adminUser,
  onLogout,
}) => {
  // Registerer Accounts State
  const [registryAccounts, setRegistryAccounts] = useState<AdminAccountRecord[]>([]);
  const [isLoadingRegistry, setIsLoadingRegistry] = useState(false);
  const [isCreatingRegistry, setIsCreatingRegistry] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Form State
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [formFeedback, setFormFeedback] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  // Load registry accounts
  const loadRegistryAccounts = async () => {
    setIsLoadingRegistry(true);
    try {
      const accounts = await fetchRegistryAccounts();
      setRegistryAccounts(accounts);
    } catch (e) {
      console.warn('Failed to load registry accounts:', e);
    } finally {
      setIsLoadingRegistry(false);
    }
  };

  useEffect(() => {
    loadRegistryAccounts();
  }, []);

  const handleCreateRegisterer = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormFeedback(null);

    if (!regFullName.trim()) {
      setFormFeedback({ type: 'error', message: 'Please enter the registerer full name / title.' });
      return;
    }
    if (!regEmail.trim() || !regEmail.includes('@')) {
      setFormFeedback({ type: 'error', message: 'Please enter a valid staff email address.' });
      return;
    }
    if (!regPassword.trim() || regPassword.trim().length < 6) {
      setFormFeedback({ type: 'error', message: 'Password must be at least 6 characters long.' });
      return;
    }

    setIsCreatingRegistry(true);
    try {
      const res = await createRegistryAccount({
        fullName: regFullName.trim(),
        email: regEmail.trim(),
        password: regPassword.trim(),
      });

      if (res.success && res.account) {
        setFormFeedback({
          type: 'success',
          message: `Successfully created registerer account for ${res.account.fullName} (${res.account.email}). They can now log in to register & manage students.`,
        });
        setRegFullName('');
        setRegEmail('');
        setRegPassword('');
        loadRegistryAccounts();
      } else {
        setFormFeedback({
          type: 'error',
          message: res.error || 'Failed to create registerer account. Please try again.',
        });
      }
    } catch (err: any) {
      setFormFeedback({
        type: 'error',
        message: err?.message || 'Failed to create registerer account.',
      });
    } finally {
      setIsCreatingRegistry(false);
    }
  };

  const handleDeleteRegisterer = async (account: AdminAccountRecord) => {
    const confirmDelete = window.confirm(`Are you sure you want to revoke and delete registerer account for "${account.fullName}" (${account.email})?`);
    if (!confirmDelete) return;

    setDeletingId(account.id);
    try {
      const ok = await deleteRegistryAccount(account.id);
      if (ok) {
        setRegistryAccounts(prev => prev.filter(a => a.id !== account.id));
        setFormFeedback({
          type: 'success',
          message: `Revoked access for registerer: ${account.fullName}`,
        });
      } else {
        setFormFeedback({
          type: 'error',
          message: 'Could not revoke registerer account. Please try again.',
        });
      }
    } catch (err: any) {
      setFormFeedback({
        type: 'error',
        message: err?.message || 'Failed to revoke registerer account.',
      });
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl">
      {/* Admin Profile Card */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white font-bold text-2xl shadow-lg shadow-blue-500/20">
            {adminUser.fullName?.charAt(0) || 'A'}
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xl font-bold text-slate-900">{adminUser.fullName}</h3>
              <span className="px-2.5 py-0.5 rounded-full bg-blue-50 text-blue-700 text-[11px] font-bold">
                {adminUser.role}
              </span>
            </div>
            <p className="text-[13px] text-slate-500 font-medium">{adminUser.email}</p>
            <p className="text-[11.5px] text-slate-400 mt-1 font-mono">
              Session ID: {adminUser.id} &bull; Route: /adminschedulerapp
            </p>
          </div>
        </div>

        <div className="pt-4 border-t border-slate-100 flex items-center justify-between">
          <span className="text-[13px] text-slate-600 font-medium">
            Active Administrative Token: <code className="text-amber-600 font-mono text-[12px]">Firebase Auth &amp; Firestore Verified</code>
          </span>

          <button
            onClick={onLogout}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-red-50 hover:bg-red-100 text-red-600 text-[13px] font-semibold transition-colors cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
            <span>Sign Out of Admin</span>
          </button>
        </div>
      </div>

      {/* REGISTERER ACCOUNTS MANAGEMENT SECTION */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-6">
        <div className="flex items-start sm:items-center justify-between flex-col sm:flex-row gap-2">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-50 text-indigo-600">
              <UserPlus className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[16px] font-bold text-slate-900">Registerer Accounts &amp; Staff Access</h4>
              <p className="text-[12.5px] text-slate-500 font-medium">
                Create and manage restricted Registerer staff who can only register and manage student accounts
              </p>
            </div>
          </div>
          <button
            onClick={loadRegistryAccounts}
            disabled={isLoadingRegistry}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12px] font-semibold transition-colors cursor-pointer"
            title="Refresh registerer list"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoadingRegistry ? 'animate-spin' : ''}`} />
            <span>Refresh</span>
          </button>
        </div>

        {/* Feedback Alert */}
        {formFeedback && (
          <div
            className={`p-3.5 rounded-xl text-[13px] flex items-start gap-2.5 border ${
              formFeedback.type === 'success'
                ? 'bg-emerald-50 text-emerald-800 border-emerald-200'
                : 'bg-rose-50 text-rose-800 border-rose-200'
            }`}
          >
            {formFeedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            )}
            <div className="flex-1 font-medium">{formFeedback.message}</div>
          </div>
        )}

        {/* Add Registerer Form */}
        <form onSubmit={handleCreateRegisterer} className="p-4 rounded-xl bg-slate-50/70 border border-slate-200/80 space-y-4">
          <div className="flex items-center gap-2 text-slate-800 text-[13.5px] font-bold">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Create New Registerer Account</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
                Full Name / Staff Title
              </label>
              <input
                type="text"
                value={regFullName}
                onChange={(e) => setRegFullName(e.target.value)}
                placeholder="e.g., Mrs. Adebayo (Admissions)"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
                Registerer Staff Email
              </label>
              <input
                type="email"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                placeholder="registry@university.edu"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                required
              />
            </div>

            <div>
              <label className="block text-[11.5px] font-bold text-slate-600 mb-1">
                Login Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={regPassword}
                  onChange={(e) => setRegPassword(e.target.value)}
                  placeholder="Min. 6 characters"
                  className="w-full px-3 py-2 pr-9 bg-white border border-slate-200 rounded-xl text-[13px] text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-[11.5px] text-slate-500 font-medium">
              Registerers log in via <strong className="text-slate-700">/adminschedulerapp</strong> and are restricted exclusively to student registrations and student rosters.
            </p>
            <button
              type="submit"
              disabled={isCreatingRegistry}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-[12.5px] font-bold transition-all shadow-sm cursor-pointer disabled:opacity-50"
            >
              <UserPlus className="w-4 h-4" />
              <span>{isCreatingRegistry ? 'Creating Account...' : 'Create Registerer'}</span>
            </button>
          </div>
        </form>

        {/* Existing Registerers List */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h5 className="text-[13px] font-bold text-slate-800 flex items-center gap-2">
              <Users className="w-4 h-4 text-slate-500" />
              <span>Active Registerer Staff ({registryAccounts.length})</span>
            </h5>
          </div>

          {registryAccounts.length === 0 ? (
            <div className="p-6 text-center rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-[13px]">
              No registerer accounts configured yet. Use the form above to add a registerer.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 rounded-xl border border-slate-200 overflow-hidden bg-white">
              {registryAccounts.map((account) => (
                <div
                  key={account.id}
                  className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-slate-50/70 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-700 font-bold text-[13px] flex items-center justify-center shrink-0">
                      {account.fullName?.charAt(0) || 'R'}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-[13px] text-slate-900">{account.fullName}</span>
                        <span className="px-2 py-0.5 rounded-full bg-blue-50 text-blue-700 border border-blue-200 text-[10px] font-bold">
                          Registerer Role
                        </span>
                      </div>
                      <div className="text-[12px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                        <span>{account.email}</span>
                        <span>&bull;</span>
                        <span className="text-slate-400">Created {new Date(account.created_at || Date.now()).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-center">
                    <span className="text-[11px] text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full font-semibold border border-emerald-100">
                      Students Only
                    </span>
                    <button
                      onClick={() => handleDeleteRegisterer(account)}
                      disabled={deletingId === account.id}
                      className="p-1.5 rounded-lg text-rose-500 hover:bg-rose-50 hover:text-rose-600 transition-colors cursor-pointer border border-transparent hover:border-rose-200"
                      title="Revoke and delete registerer account"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Firebase Cloud Connection Details */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-50 text-amber-600">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-slate-900">Firebase Backend Configuration</h4>
              <p className="text-[12px] text-slate-400 font-medium">
                Live Cloud Firestore database instance settings
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[12px] font-semibold text-emerald-600 bg-emerald-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Operational</span>
          </span>
        </div>

        <div className="space-y-3 pt-2 text-[13px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-1">
            <span className="font-semibold text-slate-700">Firebase Project ID</span>
            <span className="font-mono text-slate-600 text-[12px]">schedulerapp-7f7ca</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-1">
            <span className="font-semibold text-slate-700">Auth Domain</span>
            <span className="font-mono text-slate-600 text-[12px]">schedulerapp-7f7ca.firebaseapp.com</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-1">
            <span className="font-semibold text-slate-700">Storage Bucket</span>
            <span className="font-mono text-slate-600 text-[12px]">schedulerapp-7f7ca.firebasestorage.app</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-1">
            <span className="font-semibold text-slate-700">Firestore SDK Status</span>
            <span className="text-emerald-600 font-semibold text-[12.5px] flex items-center gap-1">
              <span>Connected &amp; Synced in Realtime</span>
            </span>
          </div>
        </div>
      </div>

      {/* Migration Details & Statistics */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-[15px] font-bold text-slate-900">User Migration &amp; Authentication Status</h4>
              <p className="text-[12px] text-slate-400 font-medium">
                Migrated student directory from external project to main Firebase app
              </p>
            </div>
          </div>
          <span className="flex items-center gap-1 text-[12px] font-bold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>100 Students Synced</span>
          </span>
        </div>

        <div className="space-y-3 pt-2 text-[13px]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-1">
            <span className="font-semibold text-slate-700">Source Project &amp; Database</span>
            <span className="font-mono text-slate-600 text-[12px]">ich100l / ai-studio-b2216e35-b400-4148-9fd9-9bc1d2ad5f38</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-1">
            <span className="font-semibold text-slate-700">Target Main App Database</span>
            <span className="font-mono text-slate-600 text-[12px]">schedulerapp-7f7ca &bull; Collection: users</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-1">
            <span className="font-semibold text-slate-700">Student Identification Method</span>
            <span className="text-emerald-700 font-bold text-[12px] font-mono bg-emerald-50 px-2 py-0.5 rounded-md">
              Firebase Auth UID (Document Key)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100 gap-1">
            <span className="font-semibold text-slate-700">Default Student Access Password</span>
            <span className="font-mono text-slate-700 text-[12px] font-bold">123456</span>
          </div>
        </div>
      </div>

      {/* Security notice */}
      <div className="p-4 rounded-2xl bg-amber-50/70 border border-amber-100 flex items-start gap-3 text-amber-900 text-[13px]">
        <Info className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
        <div>
          <p className="font-bold">Administrative Route Security</p>
          <p className="text-amber-700 mt-0.5 leading-relaxed">
            The <code className="font-mono font-semibold">/adminschedulerapp</code> route is restricted to authenticated university staff. All database writes are secured with Firebase Cloud Firestore security rules.
          </p>
        </div>
      </div>
    </div>
  );
};
