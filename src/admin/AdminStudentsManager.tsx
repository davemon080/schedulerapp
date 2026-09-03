import React, { useState, useEffect, useMemo } from 'react';
import { StudentProfileRecord, DepartmentRecord } from './types';
import { 
  Users, 
  Plus, 
  Trash2, 
  Search, 
  GraduationCap, 
  Mail, 
  IdCard, 
  Database,
  X,
  Download,
  CheckCircle2,
  Sparkles,
  Filter,
  Building2,
  Check,
  RotateCcw,
  Wallet,
  CheckSquare,
  Square,
  ImageOff,
  BellOff,
  Receipt,
  Coins,
  Layers,
  AlertTriangle,
  RefreshCw,
  SlidersHorizontal
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  detectDepartmentFromMatric, 
  fetchDepartments, 
  getStudentDepartmentInfo, 
  correctAllStudentsTo100LFirstSemester, 
  correctAllStudentsTo100LSecondSemester, 
  resetAllStudentsToUnpaidInDatabase,
  bulkClearStudentTransactions,
  bulkResetStudentWallets,
  bulkResetStudentProfilePics,
  bulkResetStudentNotifications
} from '../lib/dbService';
import { StudentDetailsModal } from './StudentDetailsModal';
import { ConfirmDeleteModal } from './ConfirmDeleteModal';

interface AdminStudentsManagerProps {
  students: StudentProfileRecord[];
  departments?: DepartmentRecord[];
  searchQuery?: string;
  onSearchChange?: (q: string) => void;
  onAddStudent: (student: StudentProfileRecord) => Promise<void>;
  onUpdateStudent?: (student: StudentProfileRecord) => Promise<boolean>;
  onDeleteStudent: (email: string) => Promise<void>;
  isAddModalOpen: boolean;
  setIsAddModalOpen: (open: boolean) => void;
  isRegistry?: boolean;
  onRunBackgroundTask?: (
    taskTitle: string,
    taskFn: () => Promise<{ success: boolean; count?: number; message?: string; error?: string }>
  ) => void;
  onManualSync?: () => Promise<void>;
}

export const AdminStudentsManager: React.FC<AdminStudentsManagerProps> = ({
  students,
  departments: propDepartments,
  searchQuery = '',
  onSearchChange,
  onAddStudent,
  onUpdateStudent,
  onDeleteStudent,
  isAddModalOpen,
  setIsAddModalOpen,
  isRegistry = false,
  onRunBackgroundTask,
  onManualSync,
}) => {
  const [internalSearch, setInternalSearch] = useState<string>(searchQuery || '');

  // Keep internal search synchronized with external searchQuery prop
  useEffect(() => {
    if (searchQuery !== undefined && searchQuery !== internalSearch) {
      setInternalSearch(searchQuery);
    }
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setInternalSearch(val);
    if (onSearchChange) {
      onSearchChange(val);
    }
  };

  const [isSaving, setIsSaving] = useState(false);
  const [deletingStudent, setDeletingStudent] = useState<StudentProfileRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [departments, setDepartments] = useState<DepartmentRecord[]>(propDepartments || []);
  const [selectedDeptFilter, setSelectedDeptFilter] = useState<string>('all');
  const [selectedLevelFilter, setSelectedLevelFilter] = useState<string>('all');
  const [selectedStudentForDetails, setSelectedStudentForDetails] = useState<StudentProfileRecord | null>(null);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState<boolean>(false);

  // Bulk Actions Selection State
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);
  const [isBulkProcessing, setIsBulkProcessing] = useState<boolean>(false);
  const [bulkActionNotice, setBulkActionNotice] = useState<string | null>(null);
  const [activeBulkModal, setActiveBulkModal] = useState<string | null>(null);

  const [formData, setFormData] = useState<StudentProfileRecord>({
    email: '',
    password: '123456',
    matric_number: '',
    full_name: '',
    department: 'Department of Industrial Chemistry',
    department_id: 'dept-ich',
    year_level: '100 Level',
  });

  // Keep departments list synchronized
  useEffect(() => {
    if (propDepartments && propDepartments.length > 0) {
      setDepartments(propDepartments);
    } else {
      fetchDepartments().then((depts) => {
        if (depts && depts.length > 0) {
          setDepartments(depts);
        }
      });
    }
  }, [propDepartments]);

  // Detected Department Info in form
  const detectedDept = useMemo(() => {
    return detectDepartmentFromMatric(formData.matric_number || '', departments);
  }, [formData.matric_number, departments]);

  // Auto-update department when matric number changes
  const handleMatricChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawVal = e.target.value;
    const detected = detectDepartmentFromMatric(rawVal, departments);
    setFormData((prev) => ({
      ...prev,
      matric_number: rawVal,
      matricNumber: rawVal,
      department: detected.department,
      department_id: detected.department_id,
    }));
  };

  // Genuine student list - explicitly excludes super admin records
  const pureStudents = useMemo(() => {
    return students.filter(s => {
      const email = (s.email || '').toLowerCase().trim();
      const sAny = s as any;
      const isSuperAdmin = sAny.role === 'super_admin' || 
                           sAny.role === 'Super Administrator' || 
                           sAny.isSuperAdmin || 
                           email === 'davemon080@gmail.com' ||
                           (s.id && s.id.startsWith('admin_'));
      return !isSuperAdmin;
    });
  }, [students]);

  // Department counts for UI pills
  const deptCounts = useMemo(() => {
    const counts: Record<string, number> = {
      all: pureStudents.length,
      ICH: 0,
      CHM: 0,
    };

    departments.forEach(d => {
      if (d.code) counts[d.code.toUpperCase()] = 0;
    });

    pureStudents.forEach(s => {
      const sInfo = getStudentDepartmentInfo(s, departments);
      const code = sInfo.code.toUpperCase();
      counts[code] = (counts[code] || 0) + 1;
    });

    return counts;
  }, [pureStudents, departments]);

  // Strict, isolated department, level, and comprehensive search filtering
  const filteredStudents = useMemo(() => {
    const q = (internalSearch || searchQuery || '').toLowerCase().trim();

    return pureStudents.filter((s) => {
      const sInfo = getStudentDepartmentInfo(s, departments);
      const isRep = Boolean(s.iscourserep || s.isCourseRep || (s as any).role === 'course_rep');
      const isPaid = Boolean(s.is_payed || s.is_paid);

      const matchesSearch = !q || (
        (s.full_name && s.full_name.toLowerCase().includes(q)) ||
        (s.name && s.name.toLowerCase().includes(q)) ||
        (s.email && s.email.toLowerCase().includes(q)) ||
        (s.matric_number && s.matric_number.toLowerCase().includes(q)) ||
        (s.matricNumber && s.matricNumber.toLowerCase().includes(q)) ||
        (s.phone && s.phone.toLowerCase().includes(q)) ||
        (Boolean((s as any).phoneNumber) && String((s as any).phoneNumber).toLowerCase().includes(q)) ||
        (sInfo.code.toLowerCase().includes(q)) ||
        (sInfo.name.toLowerCase().includes(q)) ||
        (s.department && s.department.toLowerCase().includes(q)) ||
        (s.year_level && s.year_level.toLowerCase().includes(q)) ||
        (s.yearLevel && s.yearLevel.toLowerCase().includes(q)) ||
        (s.id && s.id.toLowerCase().includes(q)) ||
        (s.uid && s.uid.toLowerCase().includes(q)) ||
        (q === 'rep' && isRep) ||
        (q === 'course rep' && isRep) ||
        (q === 'paid' && isPaid) ||
        (q === 'unpaid' && !isPaid)
      );

      // Strict department matching - ICH vs CHM vs others
      let matchesDept = true;
      if (selectedDeptFilter !== 'all') {
        const filterKey = selectedDeptFilter.trim().toUpperCase();
        if (filterKey === 'ICH' || filterKey === 'DEPT-ICH' || filterKey === 'INDUSTRIAL CHEMISTRY' || filterKey === 'DEPARTMENT OF INDUSTRIAL CHEMISTRY') {
          matchesDept = sInfo.code === 'ICH' || sInfo.id === 'dept-ich';
        } else if (filterKey === 'CHM' || filterKey === 'DEPT-CHM' || filterKey === 'CHEMISTRY' || filterKey === 'DEPARTMENT OF CHEMISTRY') {
          matchesDept = sInfo.code === 'CHM' || sInfo.id === 'dept-chm';
        } else {
          matchesDept = 
            sInfo.code.toUpperCase() === filterKey || 
            sInfo.id === selectedDeptFilter ||
            sInfo.name.toUpperCase() === filterKey;
        }
      }

      // Academic level filtering
      let matchesLevel = true;
      if (selectedLevelFilter !== 'all') {
        const sLevelStr = (s.year_level || s.yearLevel || `${s.level || 100} Level`).toLowerCase();
        const sLevelNum = s.level || parseInt(sLevelStr.replace(/\D/g, ''), 10) || 100;
        const targetNum = parseInt(selectedLevelFilter, 10);
        matchesLevel = sLevelNum === targetNum || sLevelStr.includes(`${targetNum}`);
      }

      return matchesSearch && matchesDept && matchesLevel;
    });
  }, [pureStudents, internalSearch, searchQuery, selectedDeptFilter, selectedLevelFilter, departments]);

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.matric_number || !formData.full_name) return;

    const detected = detectDepartmentFromMatric(formData.matric_number, departments);
    const finalDepartment = formData.department || detected.department;
    const finalDeptId = formData.department_id || detected.department_id;

    setIsSaving(true);
    try {
      await onAddStudent({
        email: formData.email.trim().toLowerCase(),
        password: formData.password?.trim() || '123456',
        portal_password: formData.password?.trim() || '123456',
        matric_number: formData.matric_number.trim().toUpperCase(),
        matricNumber: formData.matric_number.trim().toUpperCase(),
        full_name: formData.full_name.trim(),
        department: finalDepartment.trim(),
        department_id: finalDeptId,
        year_level: formData.year_level || '100 Level',
      });
      setIsAddModalOpen(false);
      setFormData({
        email: '',
        password: '123456',
        matric_number: '',
        full_name: '',
        department: 'Department of Industrial Chemistry',
        department_id: 'dept-ich',
        year_level: '100 Level',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const exportStudentsCSV = () => {
    const headers = ['Auth UID', 'Full Name', 'Matric Number', 'Email', 'Department Code', 'Department Name', 'Level'];
    const rows = filteredStudents.map(s => {
      const sInfo = getStudentDepartmentInfo(s, departments);
      return [
        `"${s.id || s.uid || ''}"`,
        `"${s.full_name || s.name || ''}"`,
        `"${s.matric_number || s.matricNumber || ''}"`,
        `"${s.email || ''}"`,
        `"${sInfo.code}"`,
        `"${sInfo.name}"`,
        `"${s.year_level || '100L'}"`
      ];
    });
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", encodeURI(csvContent));
    downloadAnchor.setAttribute("download", `student_directory_${selectedDeptFilter}_${Date.now()}.csv`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleConfirmDelete = async () => {
    if (!deletingStudent) return;
    setIsDeleting(true);
    try {
      await onDeleteStudent(deletingStudent.id || deletingStudent.uid || deletingStudent.email);
      setDeletingStudent(null);
    } finally {
      setIsDeleting(false);
    }
  };

  const getDeptBadgeStyle = (deptCode: string) => {
    const code = deptCode.toUpperCase();
    if (code === 'ICH') {
      return {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-200',
        dot: 'bg-blue-600',
        pillActive: 'bg-blue-600 text-white border-blue-600 shadow-xs',
        tag: 'ICH',
      };
    }
    if (code === 'CHM') {
      return {
        bg: 'bg-emerald-50',
        text: 'text-emerald-700',
        border: 'border-emerald-200',
        dot: 'bg-emerald-600',
        pillActive: 'bg-emerald-600 text-white border-emerald-600 shadow-xs',
        tag: 'CHM',
      };
    }
    if (code === 'BCH') {
      return {
        bg: 'bg-purple-50',
        text: 'text-purple-700',
        border: 'border-purple-200',
        dot: 'bg-purple-600',
        pillActive: 'bg-purple-600 text-white border-purple-600 shadow-xs',
        tag: code,
      };
    }
    if (code === 'PHY') {
      return {
        bg: 'bg-indigo-50',
        text: 'text-indigo-700',
        border: 'border-indigo-200',
        dot: 'bg-indigo-600',
        pillActive: 'bg-indigo-600 text-white border-indigo-600 shadow-xs',
        tag: code,
      };
    }
    if (code === 'CSC') {
      return {
        bg: 'bg-cyan-50',
        text: 'text-cyan-700',
        border: 'border-cyan-200',
        dot: 'bg-cyan-600',
        pillActive: 'bg-cyan-600 text-white border-cyan-600 shadow-xs',
        tag: code,
      };
    }
    return {
      bg: 'bg-slate-100',
      text: 'text-slate-700',
      border: 'border-slate-200',
      dot: 'bg-slate-500',
      pillActive: 'bg-slate-800 text-white border-slate-800 shadow-xs',
      tag: code || 'DEPT',
    };
  };

  const [isAligning, setIsAligning] = useState<boolean>(false);
  const [isResettingPayments, setIsResettingPayments] = useState<boolean>(false);
  const [syncNotice, setSyncNotice] = useState<string | null>(null);

  const handleAlignAllStudents = () => {
    if (onRunBackgroundTask) {
      onRunBackgroundTask(
        'Aligning all students to 2025/2026 1st Semester 100L',
        async () => {
          const res = await correctAllStudentsTo100LFirstSemester();
          return {
            success: res.success,
            count: res.totalUpdated,
            message: `Aligned ${res.totalUpdated} student(s) to 2025/2026 1st Semester 100L in Firestore.`,
          };
        }
      );
    } else {
      setIsAligning(true);
      correctAllStudentsTo100LFirstSemester()
        .then((res) => {
          if (res.success) {
            setSyncNotice(`Synced ${res.totalUpdated} student(s) to 2025/2026 1st Semester 100L.`);
            setTimeout(() => setSyncNotice(null), 4000);
          }
        })
        .finally(() => setIsAligning(false));
    }
  };

  const handleResetPayments = () => {
    if (!window.confirm('Are you sure you want to mark all students as unpaid and remove their semester access across the database?')) {
      return;
    }
    if (onRunBackgroundTask) {
      onRunBackgroundTask(
        'Resetting all student payment statuses to unpaid',
        async () => {
          const res = await resetAllStudentsToUnpaidInDatabase();
          return {
            success: res.success,
            count: res.count,
            message: `Reset payment status for ${res.count} student(s) and cleared semester access in Firestore.`,
            error: res.error,
          };
        }
      );
    } else {
      setIsResettingPayments(true);
      resetAllStudentsToUnpaidInDatabase()
        .then((res) => {
          if (res.success) {
            setSyncNotice(`Successfully marked ${res.count} student(s) as unpaid and cleared semester access in Firestore.`);
            setTimeout(() => setSyncNotice(null), 5000);
          } else {
            setSyncNotice(`Notice: ${res.error || 'Could not reset student payments.'}`);
            setTimeout(() => setSyncNotice(null), 5000);
          }
        })
        .finally(() => setIsResettingPayments(false));
    }
  };

  // Bulk selection helpers
  const allFilteredIds = useMemo(() => {
    return filteredStudents.map(s => (s.id || s.uid || s.email) as string).filter(Boolean);
  }, [filteredStudents]);

  const isAllSelected = useMemo(() => {
    return allFilteredIds.length > 0 && allFilteredIds.every(id => selectedStudentIds.includes(id));
  }, [allFilteredIds, selectedStudentIds]);

  const toggleSelectAll = () => {
    if (isAllSelected) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(allFilteredIds);
    }
  };

  const toggleSelectStudent = (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setSelectedStudentIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  const clearSelection = () => {
    setSelectedStudentIds([]);
  };

  // Bulk action handlers (run in background, non-blocking)
  const handleBulkClearTransactions = () => {
    if (selectedStudentIds.length === 0) return;
    const targetIds = [...selectedStudentIds];
    setActiveBulkModal(null);
    setSelectedStudentIds([]);

    if (onRunBackgroundTask) {
      onRunBackgroundTask(
        `Clearing transactions for ${targetIds.length} existing student(s)`,
        () => bulkClearStudentTransactions(targetIds)
      );
    } else {
      setIsBulkProcessing(true);
      bulkClearStudentTransactions(targetIds)
        .then((res) => {
          if (res.success) {
            setBulkActionNotice(res.message || `Successfully cleared transaction records for ${res.count} student(s).`);
          } else {
            setBulkActionNotice(`Notice: ${res.error || 'Could not clear student transactions.'}`);
          }
          setTimeout(() => setBulkActionNotice(null), 5000);
        })
        .catch((e: any) => {
          setBulkActionNotice(`Error: ${e.message}`);
          setTimeout(() => setBulkActionNotice(null), 5000);
        })
        .finally(() => {
          setIsBulkProcessing(false);
        });
    }
  };

  const handleBulkResetWallets = () => {
    if (selectedStudentIds.length === 0) return;
    const targetIds = [...selectedStudentIds];
    setActiveBulkModal(null);
    setSelectedStudentIds([]);

    if (onRunBackgroundTask) {
      onRunBackgroundTask(
        `Resetting wallets to ₦0.00 for ${targetIds.length} existing student(s)`,
        () => bulkResetStudentWallets(targetIds)
      );
    } else {
      setIsBulkProcessing(true);
      bulkResetStudentWallets(targetIds)
        .then((res) => {
          if (res.success) {
            setBulkActionNotice(res.message || `Successfully reset wallet balance to ₦0.00 for ${res.count} student(s).`);
          } else {
            setBulkActionNotice(`Notice: ${res.error || 'Could not reset student wallets.'}`);
          }
          setTimeout(() => setBulkActionNotice(null), 5000);
        })
        .catch((e: any) => {
          setBulkActionNotice(`Error: ${e.message}`);
          setTimeout(() => setBulkActionNotice(null), 5000);
        })
        .finally(() => {
          setIsBulkProcessing(false);
        });
    }
  };

  const handleBulkResetProfilePics = () => {
    if (selectedStudentIds.length === 0) return;
    const targetIds = [...selectedStudentIds];
    setActiveBulkModal(null);
    setSelectedStudentIds([]);

    if (onRunBackgroundTask) {
      onRunBackgroundTask(
        `Resetting profile pictures for ${targetIds.length} existing student(s)`,
        () => bulkResetStudentProfilePics(targetIds)
      );
    } else {
      setIsBulkProcessing(true);
      bulkResetStudentProfilePics(targetIds)
        .then((res) => {
          if (res.success) {
            setBulkActionNotice(res.message || `Successfully reset profile picture/avatars for ${res.count} student(s).`);
          } else {
            setBulkActionNotice(`Notice: ${res.error || 'Could not reset profile pictures.'}`);
          }
          setTimeout(() => setBulkActionNotice(null), 5000);
        })
        .catch((e: any) => {
          setBulkActionNotice(`Error: ${e.message}`);
          setTimeout(() => setBulkActionNotice(null), 5000);
        })
        .finally(() => {
          setIsBulkProcessing(false);
        });
    }
  };

  const handleBulkResetNotifications = () => {
    if (selectedStudentIds.length === 0) return;
    const targetIds = [...selectedStudentIds];
    setActiveBulkModal(null);
    setSelectedStudentIds([]);

    if (onRunBackgroundTask) {
      onRunBackgroundTask(
        `Resetting notifications for ${targetIds.length} existing student(s)`,
        () => bulkResetStudentNotifications(targetIds)
      );
    } else {
      setIsBulkProcessing(true);
      bulkResetStudentNotifications(targetIds)
        .then((res) => {
          if (res.success) {
            setBulkActionNotice(res.message || `Successfully cleared notifications for ${res.count} student(s).`);
          } else {
            setBulkActionNotice(`Notice: ${res.error || 'Could not reset notifications.'}`);
          }
          setTimeout(() => setBulkActionNotice(null), 5000);
        })
        .catch((e: any) => {
          setBulkActionNotice(`Error: ${e.message}`);
          setTimeout(() => setBulkActionNotice(null), 5000);
        })
        .finally(() => {
          setIsBulkProcessing(false);
        });
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* Top Banner */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-emerald-50 text-emerald-600">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-[15px] font-bold text-slate-900">Enrolled Student Directory</h3>
              {isRegistry && (
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-100 text-blue-800 border border-blue-200">
                  REGISTRY VIEW
                </span>
              )}
            </div>
            <p className="text-[12px] text-slate-500 font-medium">
              Strict department isolation: Filter <strong className="text-blue-600 font-semibold">ICH</strong> (Industrial Chemistry) separately from <strong className="text-emerald-600 font-semibold">CHM</strong> (Chemistry)
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto justify-end flex-wrap">
          {!isRegistry && (
            <>
              <button
                onClick={handleResetPayments}
                disabled={isResettingPayments}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 text-[12.5px] font-semibold transition-colors cursor-pointer border border-amber-200/70"
                title="Mark all students as Not Paid and revoke semester access on database"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-700" />
                <span>{isResettingPayments ? 'Resetting...' : 'Reset Student Payments'}</span>
              </button>

              <button
                onClick={handleAlignAllStudents}
                disabled={isAligning}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-50 hover:bg-blue-100 text-blue-700 text-[12.5px] font-semibold transition-colors cursor-pointer border border-blue-200/60"
                title="Set all students to 2025/2026 1st Semester 100L in Firestore"
              >
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>{isAligning ? 'Syncing...' : 'Align 100L 1st Sem'}</span>
              </button>
            </>
          )}

          <button
            onClick={exportStudentsCSV}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[12.5px] font-semibold transition-colors cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Export CSV</span>
          </button>

          <button
            onClick={() => setIsAddModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[12.5px] font-semibold shadow-sm transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Student</span>
          </button>
        </div>
      </div>

      {syncNotice && (
        <div className="bg-blue-50 border border-blue-200 rounded-2xl p-3 text-xs font-semibold text-blue-800 flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-blue-600 shrink-0" />
          <span>{syncNotice}</span>
        </div>
      )}

      {bulkActionNotice && (
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-3.5 text-xs font-semibold text-emerald-800 flex items-center justify-between gap-2 shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{bulkActionNotice}</span>
          </div>
          <button 
            onClick={() => setBulkActionNotice(null)}
            className="text-emerald-700 hover:text-emerald-900 p-1 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Dedicated Student Directory Search Bar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
          {/* Search Input Box */}
          <div className="relative flex-1">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
              <Search className="w-4 h-4 text-emerald-600" />
            </div>
            <input
              type="text"
              value={internalSearch}
              onChange={(e) => handleSearchChange(e.target.value)}
              placeholder="Search students by name, matric no., email, phone, or department..."
              className="w-full pl-10 pr-10 py-2.5 bg-slate-50 hover:bg-slate-100/70 focus:bg-white border border-slate-200 rounded-xl text-[13px] font-medium text-slate-900 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all"
            />
            {internalSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-slate-200/60 transition-colors cursor-pointer"
                title="Clear search"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            )}
          </div>

          {/* Matches Count & Clear */}
          <div className="flex items-center gap-2 shrink-0 justify-between sm:justify-end">
            <div className="px-3 py-2 rounded-xl bg-slate-50 border border-slate-200 text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <span className="text-slate-400 font-normal">Found:</span>
              <span className="font-mono text-emerald-700 font-bold">{filteredStudents.length}</span>
              <span className="text-slate-400">/</span>
              <span className="font-mono text-slate-600">{pureStudents.length}</span>
              <span className="text-[11px] text-slate-500">students</span>
            </div>

            {internalSearch && (
              <button
                type="button"
                onClick={() => handleSearchChange('')}
                className="px-3 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer flex items-center gap-1 border border-slate-200"
              >
                <RotateCcw className="w-3 h-3 text-slate-500" />
                <span>Clear</span>
              </button>
            )}
          </div>
        </div>

        {/* Quick Filter Suggestion Chips */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5 text-[11px]">
          <span className="text-slate-400 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-amber-500 shrink-0" />
            <span>Quick search:</span>
          </span>
          {[
            { label: 'All', query: '' },
            { label: 'ICH', query: 'ICH' },
            { label: 'CHM', query: 'CHM' },
            { label: '100 Level', query: '100' },
            { label: '200 Level', query: '200' },
            { label: 'Course Reps', query: 'rep' },
            { label: 'Paid', query: 'paid' },
            { label: 'Unpaid', query: 'unpaid' },
          ].map((tag) => {
            const isActive = tag.query === '' ? !internalSearch : internalSearch.toLowerCase() === tag.query.toLowerCase();
            return (
              <button
                key={tag.label}
                type="button"
                onClick={() => handleSearchChange(tag.query)}
                className={`px-2.5 py-1 rounded-lg border text-[11px] font-semibold transition-all cursor-pointer ${
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 hover:bg-slate-100 text-slate-600 border-slate-200'
                }`}
              >
                {tag.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Department Filter Bar & Quick Selectors */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-slate-500" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Department &amp; Level Filters:
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-slate-400 font-medium">Quick Selectors:</span>
            <select
              value={selectedDeptFilter}
              onChange={(e) => setSelectedDeptFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Departments ({students.length})</option>
              <option value="ICH">Industrial Chemistry only (ICH: {deptCounts['ICH'] || 0})</option>
              <option value="CHM">Chemistry only (CHM: {deptCounts['CHM'] || 0})</option>
              {departments
                .filter(d => d.code?.toUpperCase() !== 'ICH' && d.code?.toUpperCase() !== 'CHM')
                .map(d => (
                  <option key={d.id} value={d.code || d.name}>
                    {d.name} ({d.code}: {deptCounts[d.code?.toUpperCase() || ''] || 0})
                  </option>
                ))
              }
            </select>

            <select
              value={selectedLevelFilter}
              onChange={(e) => setSelectedLevelFilter(e.target.value)}
              className="text-xs bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
            >
              <option value="all">All Levels</option>
              <option value="100">100 Level</option>
              <option value="200">200 Level</option>
              <option value="300">300 Level</option>
              <option value="400">400 Level</option>
              <option value="500">500 Level</option>
            </select>
          </div>
        </div>

        {/* Interactive Filter Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 border-t border-slate-100">
          {/* All */}
          <button
            onClick={() => setSelectedDeptFilter('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDeptFilter === 'all'
                ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
            }`}
          >
            <span>All Students</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedDeptFilter === 'all' ? 'bg-slate-800 text-white' : 'bg-slate-200 text-slate-700'
            }`}>
              {students.length}
            </span>
          </button>

          {/* ICH Filter Pill */}
          <button
            onClick={() => setSelectedDeptFilter('ICH')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDeptFilter === 'ICH'
                ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                : 'bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-blue-500" />
            <span>Industrial Chemistry (ICH only)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedDeptFilter === 'ICH' ? 'bg-blue-700 text-white' : 'bg-blue-100 text-blue-800 font-bold'
            }`}>
              {deptCounts['ICH'] || 0}
            </span>
          </button>

          {/* CHM Filter Pill */}
          <button
            onClick={() => setSelectedDeptFilter('CHM')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
              selectedDeptFilter === 'CHM'
                ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100/70'
            }`}
          >
            <span className="w-2 h-2 rounded-full bg-emerald-500" />
            <span>Chemistry (CHM only)</span>
            <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
              selectedDeptFilter === 'CHM' ? 'bg-emerald-700 text-white' : 'bg-emerald-100 text-emerald-800 font-bold'
            }`}>
              {deptCounts['CHM'] || 0}
            </span>
          </button>

          {/* Dynamic Extra Departments */}
          {departments
            .filter(d => d.code?.toUpperCase() !== 'ICH' && d.code?.toUpperCase() !== 'CHM')
            .map(d => {
              const code = d.code?.toUpperCase() || d.name;
              const isSelected = selectedDeptFilter === code || selectedDeptFilter === d.id || selectedDeptFilter === d.name;
              const count = deptCounts[code] || 0;
              return (
                <button
                  key={d.id}
                  onClick={() => setSelectedDeptFilter(code)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition-all cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-purple-50 text-purple-700 border-purple-200 hover:bg-purple-100/70'
                  }`}
                >
                  <span>{d.name} ({code})</span>
                  <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-mono ${
                    isSelected ? 'bg-purple-700 text-white' : 'bg-purple-100 text-purple-800 font-bold'
                  }`}>
                    {count}
                  </span>
                </button>
              );
            })
          }

          {selectedDeptFilter !== 'all' && (
            <button
              onClick={() => setSelectedDeptFilter('all')}
              className="ml-auto text-[11.5px] text-slate-500 hover:text-slate-800 font-semibold flex items-center gap-1 px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>Reset Filter</span>
            </button>
          )}
        </div>
      </div>

      {/* Active Filter Notice Bar */}
      {selectedDeptFilter !== 'all' && (
        <div className="bg-slate-900 text-white px-4 py-2.5 rounded-xl flex items-center justify-between text-xs shadow-xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>
              Showing only students enrolled in{' '}
              <strong className="text-amber-300 font-bold">
                {selectedDeptFilter === 'ICH' 
                  ? 'Industrial Chemistry (ICH)' 
                  : selectedDeptFilter === 'CHM' 
                    ? 'Pure Chemistry (CHM)' 
                    : selectedDeptFilter}
              </strong>
            </span>
          </div>
          <span className="font-mono text-slate-300">
            {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''} matched
          </span>
        </div>
      )}

      {/* Bulk Action Toolbar Banner (when items are selected) */}
      {selectedStudentIds.length > 0 && (
        <div className="bg-linear-to-r from-slate-900 via-slate-850 to-slate-900 text-white p-4 rounded-2xl border border-slate-700 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h4 className="text-sm font-bold text-white">
                  {selectedStudentIds.length} Student{selectedStudentIds.length !== 1 ? 's' : ''} Selected
                </h4>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-semibold border border-emerald-500/30">
                  BULK OPERATIONS
                </span>
              </div>
              <p className="text-[11.5px] text-slate-300">
                Perform batched administrative actions across the selected student accounts.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap w-full md:w-auto justify-end">
            <button
              onClick={clearSelection}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-semibold transition-colors cursor-pointer border border-white/10"
            >
              Clear Selection
            </button>

            {/* Clear Transactions */}
            <button
              onClick={() => setActiveBulkModal('clear_transactions')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <Receipt className="w-3.5 h-3.5" />
              <span>Clear Transactions</span>
            </button>

            {/* Reset Wallets (Super Admin only) */}
            {!isRegistry && (
              <button
                onClick={() => setActiveBulkModal('reset_wallets')}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-bold transition-all cursor-pointer"
              >
                <Coins className="w-3.5 h-3.5" />
                <span>Reset Wallets (₦0)</span>
              </button>
            )}

            {/* Reset Profile Picture */}
            <button
              onClick={() => setActiveBulkModal('reset_profile_pics')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-blue-500/20 hover:bg-blue-500/30 text-blue-300 border border-blue-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <ImageOff className="w-3.5 h-3.5" />
              <span>Reset Profile Pics</span>
            </button>

            {/* Reset Notifications */}
            <button
              onClick={() => setActiveBulkModal('reset_notifications')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 text-xs font-bold transition-all cursor-pointer"
            >
              <BellOff className="w-3.5 h-3.5" />
              <span>Reset Notifications</span>
            </button>
          </div>
        </div>
      )}

      {/* Students Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2">
            <h4 className="text-[14px] font-bold text-slate-900">Enrolled Students</h4>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">
              {filteredStudents.length} of {students.length} students
            </span>
          </div>
          
          <div className="flex items-center gap-3">
            <button
              onClick={toggleSelectAll}
              className="text-xs text-slate-600 hover:text-emerald-700 font-semibold flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-emerald-50 border border-slate-200 transition-colors cursor-pointer"
            >
              {isAllSelected ? (
                <>
                  <CheckSquare className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Deselect All Filtered ({allFilteredIds.length})</span>
                </>
              ) : (
                <>
                  <Square className="w-3.5 h-3.5 text-slate-400" />
                  <span>Select All Filtered ({allFilteredIds.length})</span>
                </>
              )}
            </button>

            <span className="text-[12px] text-slate-400 font-medium flex items-center gap-1.5">
              <Database className="w-3.5 h-3.5 text-emerald-500" />
              <span>Collection: <code className="text-slate-600 font-mono">users (Auth UID)</code></span>
            </span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-[13px] border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold text-[12px] uppercase tracking-wider">
                <th className="py-3 px-4 w-12 text-center">
                  <input
                    type="checkbox"
                    checked={isAllSelected}
                    onChange={toggleSelectAll}
                    className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                    title="Select/Deselect all visible students"
                  />
                </th>
                <th className="py-3 px-4">Student / UID</th>
                <th className="py-3 px-4">Matriculation No.</th>
                <th className="py-3 px-4">Email Address</th>
                <th className="py-3 px-4">Department &amp; Level</th>
                {!isRegistry && <th className="py-3 px-4">Wallet Balance</th>}
                <th className="py-3 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={isRegistry ? 6 : 7} className="py-12 text-center text-slate-400">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Users className="w-8 h-8 text-slate-300" />
                      <p className="text-sm font-semibold text-slate-600">No student records found</p>
                      <p className="text-xs text-slate-400">
                        {selectedDeptFilter !== 'all' 
                          ? `No students found matching department filter "${selectedDeptFilter}".` 
                          : 'No students matching the current search query.'}
                      </p>
                      {(internalSearch || selectedDeptFilter !== 'all' || selectedLevelFilter !== 'all') && (
                        <div className="flex items-center gap-2 mt-2">
                          {internalSearch && (
                            <button
                              onClick={() => handleSearchChange('')}
                              className="px-3 py-1.5 text-xs font-semibold bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
                            >
                              Clear Search
                            </button>
                          )}
                          {selectedDeptFilter !== 'all' && (
                            <button
                              onClick={() => setSelectedDeptFilter('all')}
                              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              Reset Dept Filter
                            </button>
                          )}
                          {selectedLevelFilter !== 'all' && (
                            <button
                              onClick={() => setSelectedLevelFilter('all')}
                              className="px-3 py-1.5 text-xs font-semibold bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg transition-colors cursor-pointer"
                            >
                              Reset Level Filter
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              ) : (
                filteredStudents.map((s, idx) => {
                  const sInfo = getStudentDepartmentInfo(s, departments);
                  const badge = getDeptBadgeStyle(sInfo.code);
                  const studentBal = typeof s.wallet_balance === 'number'
                    ? s.wallet_balance
                    : (typeof s.walletBalance === 'number' ? s.walletBalance : 0);
                  const studentId = (s.id || s.uid || s.email) as string;
                  const isSelected = selectedStudentIds.includes(studentId);

                  return (
                    <tr 
                      key={studentId || idx} 
                      onClick={() => {
                        setSelectedStudentForDetails(s);
                        setIsDetailsModalOpen(true);
                      }}
                      className={`transition-colors group cursor-pointer ${
                        isSelected ? 'bg-emerald-50/70 hover:bg-emerald-50' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      <td className="py-3.5 px-4 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={(e) => toggleSelectStudent(studentId, e as any)}
                          className="w-4 h-4 text-emerald-600 rounded-sm border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          {s.profile_picture || s.profilePicture || s.photo_url || s.photoURL ? (
                            <img
                              src={s.profile_picture || s.profilePicture || s.photo_url || s.photoURL}
                              alt={s.full_name || s.name}
                              referrerPolicy="no-referrer"
                              className="w-9 h-9 rounded-full object-cover border border-emerald-200 shadow-xs shrink-0"
                            />
                          ) : (
                            <div className="w-9 h-9 rounded-full bg-linear-to-br from-emerald-100 to-teal-100 text-emerald-800 font-bold text-xs flex items-center justify-center shrink-0 border border-emerald-200/60 shadow-xs">
                              {(s.full_name || s.name)?.charAt(0) || 'S'}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-slate-900 group-hover:text-emerald-700 transition-colors block truncate">
                                {s.full_name || s.name}
                              </span>
                              {(s.iscourserep || s.isCourseRep) && (
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-300 shrink-0">
                                  Course Rep
                                </span>
                              )}
                              {(s.is_payed || s.is_paid || s.hasFreeAccess) && (
                                <span className="px-2 py-0.2 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300 shrink-0">
                                  Free Access
                                </span>
                              )}
                            </div>
                            <span className="text-[11px] text-slate-400 block truncate">
                              {!isRegistry ? 'Tap row to view & manage wallet' : 'Tap row to view academic profile'}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-lg bg-slate-100 text-slate-800 font-mono text-[12px] font-bold">
                          {s.matric_number || s.matricNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-slate-600 font-mono text-[12px]">{s.email}</td>
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span className={`px-2.5 py-0.5 rounded-lg text-[11px] font-mono font-bold border ${badge.bg} ${badge.text} ${badge.border}`}>
                            {sInfo.code}
                          </span>
                          <div>
                            <p className="text-slate-800 text-[12.5px] font-semibold">{sInfo.name}</p>
                            <p className="text-[11px] text-slate-400">{s.year_level || s.yearLevel || `${s.level || 100} Level`}</p>
                          </div>
                        </div>
                      </td>
                      {!isRegistry && (
                        <td className="py-3.5 px-4">
                          <div className="flex items-center">
                            <span className={`px-2.5 py-1 rounded-xl font-mono text-[12px] font-bold border flex items-center gap-1.5 transition-all ${
                              studentBal > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-200 shadow-2xs group-hover:bg-emerald-100'
                                : 'bg-slate-100 text-slate-600 border-slate-200'
                            }`}>
                              <Wallet className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                              <span>₦{studentBal.toLocaleString()}</span>
                            </span>
                          </div>
                        </td>
                      )}
                      <td className="py-3.5 px-5 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        {!isRegistry ? (
                          <button
                            onClick={() => setDeletingStudent(s)}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
                            title="Remove student record"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => {
                              setSelectedStudentForDetails(s);
                              setIsDetailsModalOpen(true);
                            }}
                            className="text-xs text-blue-600 hover:text-blue-800 font-semibold px-2 py-1 rounded-md hover:bg-blue-50 transition-colors cursor-pointer"
                          >
                            View Record
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Student Modal with Live Matric Auto-Detection */}
      <AnimatePresence>
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-lg w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/80">
                <div className="flex items-center gap-2">
                  <GraduationCap className="w-5 h-5 text-emerald-600" />
                  <h4 className="text-[16px] font-bold text-slate-900">Register Student Profile</h4>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200 cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">Full Name *</label>
                  <input
                    type="text"
                    value={formData.full_name}
                    onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                    placeholder="e.g. David Simon O."
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">
                      Matriculation No. *
                    </label>
                    <input
                      type="text"
                      value={formData.matric_number}
                      onChange={handleMatricChange}
                      placeholder="e.g. 2025/PS/ICH/0001"
                      required
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-mono font-bold uppercase focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[12px] font-bold text-slate-700 mb-1">Year Level</label>
                    <select
                      value={formData.year_level}
                      onChange={(e) => setFormData({ ...formData, year_level: e.target.value })}
                      className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                    >
                      <option value="100 Level">100 Level</option>
                      <option value="200 Level">200 Level</option>
                      <option value="300 Level">300 Level</option>
                      <option value="400 Level">400 Level</option>
                    </select>
                  </div>
                </div>

                {/* Auto-detected Department Indicator */}
                <div className={`p-3 rounded-xl border flex items-center justify-between gap-3 ${
                  detectedDept.code === 'ICH' 
                    ? 'bg-blue-50/80 border-blue-200' 
                    : detectedDept.code === 'CHM' 
                      ? 'bg-emerald-50/80 border-emerald-200'
                      : 'bg-purple-50/80 border-purple-200'
                }`}>
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-emerald-600 shrink-0" />
                    <div>
                      <span className="text-[11px] font-bold text-slate-500 block uppercase tracking-wider">
                        Auto-detected Department
                      </span>
                      <span className="text-[13px] font-bold text-slate-900">
                        {detectedDept.department}
                      </span>
                    </div>
                  </div>
                  <span className={`px-2.5 py-1 rounded-lg border font-mono font-bold text-xs shadow-2xs ${
                    detectedDept.code === 'ICH'
                      ? 'bg-blue-100 text-blue-800 border-blue-300'
                      : detectedDept.code === 'CHM'
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                        : 'bg-purple-100 text-purple-800 border-purple-300'
                  }`}>
                    Code: {detectedDept.code}
                  </span>
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">Email Address *</label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                    placeholder="student@university.edu"
                    required
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">Portal Login Password</label>
                  <input
                    type="text"
                    value={formData.password}
                    onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                    placeholder="Default: 123456"
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-mono font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  />
                </div>

                <div>
                  <label className="block text-[12px] font-bold text-slate-700 mb-1">Assigned Department</label>
                  <select
                    value={formData.department}
                    onChange={(e) => {
                      const selectedName = e.target.value;
                      const matched = departments.find(d => d.name === selectedName);
                      setFormData({
                        ...formData,
                        department: selectedName,
                        department_id: matched?.id || formData.department_id,
                      });
                    }}
                    className="w-full px-3.5 py-2 rounded-xl bg-slate-50 border border-slate-200 text-[13px] font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="Department of Industrial Chemistry">Department of Industrial Chemistry (ICH)</option>
                    <option value="Department of Chemistry">Department of Chemistry (CHM)</option>
                    {departments
                      .filter(d => !d.name.includes('Industrial Chemistry') && !d.name.includes('Chemistry'))
                      .map(d => (
                        <option key={d.id} value={d.name}>{d.name} ({d.code})</option>
                      ))
                    }
                  </select>
                </div>

                <div className="pt-3 flex justify-end gap-2 border-t border-slate-100">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-[13px] font-semibold cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-[13px] font-semibold cursor-pointer shadow-xs disabled:opacity-60 flex items-center gap-1.5"
                  >
                    {isSaving ? 'Registering...' : 'Register Student'}
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Student Details & Credentials Modal */}
      <StudentDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => {
          setIsDetailsModalOpen(false);
          setSelectedStudentForDetails(null);
        }}
        student={selectedStudentForDetails}
        departments={departments}
        onUpdateStudent={onUpdateStudent}
        isRegistry={isRegistry}
        onDeleteStudent={async (identifier) => {
          const s = students.find(item => (item.id === identifier || item.uid === identifier || item.email === identifier));
          if (s) {
            setDeletingStudent(s);
          } else {
            await onDeleteStudent(identifier);
          }
        }}
      />

      {/* Confirm Delete Student Modal */}
      <ConfirmDeleteModal
        isOpen={Boolean(deletingStudent)}
        onClose={() => setDeletingStudent(null)}
        onConfirm={handleConfirmDelete}
        title="Delete Student Record"
        itemType="student account"
        itemName={deletingStudent ? `${deletingStudent.full_name || deletingStudent.name || 'Student'} (${deletingStudent.matric_number || deletingStudent.matricNumber || deletingStudent.email})` : undefined}
        description="Are you sure you want to remove this student account from the university system? This will remove their profile record from the database."
        confirmLabel="Yes, Delete Student"
        isDeleting={isDeleting}
      />

      {/* ========================================================= */}
      {/* BULK ACTION CONFIRMATION MODALS */}
      {/* ========================================================= */}

      {/* 1. Bulk Clear Transactions Modal */}
      <AnimatePresence>
        {activeBulkModal === 'clear_transactions' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200">
                    <Receipt className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Clear Transaction History</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Bulk operation for {selectedStudentIds.length} student account{selectedStudentIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200/80 text-xs text-amber-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-amber-950">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                    <span>Warning: Irreversible action</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed">
                    This will permanently delete all recorded ledger transactions in Firestore for the {selectedStudentIds.length} selected student(s). Their current wallet balances will remain unaffected.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveBulkModal(null)}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkClearTransactions}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isBulkProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Clearing Records...</span>
                      </>
                    ) : (
                      <>
                        <Receipt className="w-3.5 h-3.5" />
                        <span>Confirm Clear Transactions</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 2. Bulk Reset Wallets Modal */}
      <AnimatePresence>
        {activeBulkModal === 'reset_wallets' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-emerald-100 text-emerald-700 border border-emerald-200">
                    <Coins className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Reset Wallet Balances to ₦0</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Bulk operation for {selectedStudentIds.length} student account{selectedStudentIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200/80 text-xs text-rose-900 space-y-1">
                  <div className="flex items-center gap-1.5 font-bold text-rose-950">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>Balance Zeroing Notice</span>
                  </div>
                  <p className="text-[11.5px] leading-relaxed">
                    This will set the <code className="font-mono font-bold">wallet_balance</code> of all {selectedStudentIds.length} selected student(s) to <strong>₦0.00</strong> and record an administrative audit entry on their profile.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveBulkModal(null)}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkResetWallets}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isBulkProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Resetting Wallets...</span>
                      </>
                    ) : (
                      <>
                        <Coins className="w-3.5 h-3.5" />
                        <span>Confirm Reset to ₦0.00</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 3. Bulk Reset Profile Pics Modal */}
      <AnimatePresence>
        {activeBulkModal === 'reset_profile_pics' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-blue-100 text-blue-700 border border-blue-200">
                    <ImageOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Reset Profile Pictures</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Bulk operation for {selectedStudentIds.length} student account{selectedStudentIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200/80 text-xs text-blue-900 space-y-1">
                  <p className="text-[11.5px] leading-relaxed">
                    This will clear the custom avatar / photo URLs for all {selectedStudentIds.length} selected student(s), reverting their avatars back to the default university monogram initials.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveBulkModal(null)}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkResetProfilePics}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isBulkProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Resetting Avatars...</span>
                      </>
                    ) : (
                      <>
                        <ImageOff className="w-3.5 h-3.5" />
                        <span>Confirm Reset Photos</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* 4. Bulk Reset Notifications Modal */}
      <AnimatePresence>
        {activeBulkModal === 'reset_notifications' && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className="bg-white rounded-2xl max-w-md w-full shadow-2xl border border-slate-200 overflow-hidden"
            >
              <div className="p-6 space-y-4">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 rounded-2xl bg-purple-100 text-purple-700 border border-purple-200">
                    <BellOff className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-base font-bold text-slate-900">Reset Student Notifications</h4>
                    <p className="text-xs text-slate-500 font-medium">
                      Bulk operation for {selectedStudentIds.length} student account{selectedStudentIds.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </div>

                <div className="p-3.5 rounded-xl bg-purple-50 border border-purple-200/80 text-xs text-purple-900 space-y-1">
                  <p className="text-[11.5px] leading-relaxed">
                    This will clear all pending notifications and notification counters for the {selectedStudentIds.length} selected student(s) in Firestore.
                  </p>
                </div>

                <div className="flex items-center justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveBulkModal(null)}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleBulkResetNotifications}
                    disabled={isBulkProcessing}
                    className="px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm flex items-center gap-1.5 disabled:opacity-50"
                  >
                    {isBulkProcessing ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                        <span>Resetting Notifications...</span>
                      </>
                    ) : (
                      <>
                        <BellOff className="w-3.5 h-3.5" />
                        <span>Confirm Reset Notifications</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

