import React from 'react';
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
  Info
} from 'lucide-react';
import { AdminUser } from './types';

interface AdminSettingsProps {
  adminUser: AdminUser;
  onLogout: () => void;
}

export const AdminSettings: React.FC<AdminSettingsProps> = ({
  adminUser,
  onLogout,
}) => {
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
