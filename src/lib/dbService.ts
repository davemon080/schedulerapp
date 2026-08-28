import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  addDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  orderBy, 
  where, 
  onSnapshot,
  Unsubscribe 
} from 'firebase/firestore';
import { db, auth } from './firebase';
import { EventItem, AssignmentItem, NotificationItem } from '../types';
import { 
  StudentProfileRecord, 
  DepartmentRecord, 
  CourseRecord, 
  ActivityRecord, 
  DeadlineRecord, 
  AnnouncementRecord, 
  FeedbackRecord, 
  CurrentSemesterRecord 
} from '../admin/types';
import { INITIAL_EVENTS, INITIAL_ASSIGNMENTS, NOTIFICATIONS } from '../data/mockData';

export type { DepartmentRecord, CourseRecord, ActivityRecord, DeadlineRecord, AnnouncementRecord, FeedbackRecord, CurrentSemesterRecord };

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): FirestoreErrorInfo {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  };
  console.warn('Firestore Operation Info: ', JSON.stringify(errInfo));
  return errInfo;
}

// Day conversion utilities
export function mapDbDayToDayKey(dbDay: number | string | undefined): string {
  if (typeof dbDay === 'string') {
    const upper = dbDay.toUpperCase();
    if (upper.includes('MON') || upper.includes('17')) return 'MON 17';
    if (upper.includes('TUE') || upper.includes('18')) return 'TUE 18';
    if (upper.includes('WED') || upper.includes('19')) return 'WED 19';
    if (upper.includes('THU') || upper.includes('20')) return 'THU 20';
    if (upper.includes('FRI') || upper.includes('21')) return 'FRI 21';
    if (upper.includes('SAT') || upper.includes('22')) return 'SAT 22';
    if (upper.includes('SUN') || upper.includes('23')) return 'SUN 23';
  }
  const num = Number(dbDay);
  switch (num) {
    case 1: return 'MON 17';
    case 2: return 'TUE 18';
    case 3: return 'WED 19';
    case 4: return 'THU 20';
    case 5: return 'FRI 21';
    case 6: return 'SAT 22';
    case 7: return 'SUN 23';
    default: return 'WED 19';
  }
}

export function mapDayKeyToDbDay(dayKey: string | number | undefined): number {
  if (typeof dayKey === 'number') return dayKey;
  if (!dayKey) return 1;
  const upper = dayKey.toUpperCase();
  if (upper.includes('MON') || upper.includes('17')) return 1;
  if (upper.includes('TUE') || upper.includes('18')) return 2;
  if (upper.includes('WED') || upper.includes('19')) return 3;
  if (upper.includes('THU') || upper.includes('20')) return 4;
  if (upper.includes('FRI') || upper.includes('21')) return 5;
  if (upper.includes('SAT') || upper.includes('22')) return 6;
  if (upper.includes('SUN') || upper.includes('23')) return 7;
  return 1;
}

// Time formatting utilities
export function formatTimeRange(start?: string | null, end?: string | null, fallback = '08:00 AM - 10:00 AM'): string {
  if (!start) return fallback;
  const formatSingle = (tStr: string) => {
    const clean = tStr.trim();
    if (clean.includes('AM') || clean.includes('PM')) return clean;
    const parts = clean.split(':');
    let hours = parseInt(parts[0], 10);
    const mins = (parts[1] || '00').substring(0, 2);
    const ampm = hours >= 12 ? 'PM' : 'AM';
    hours = hours % 12;
    hours = hours ? hours : 12;
    const hStr = hours < 10 ? `0${hours}` : `${hours}`;
    return `${hStr}:${mins} ${ampm}`;
  };

  try {
    const s = formatSingle(start);
    if (!end) return s;
    const e = formatSingle(end);
    return `${s} - ${e}`;
  } catch {
    return fallback;
  }
}

export function parseTimeRange(timeStr?: string): { startTime: string; endTime: string } {
  if (!timeStr) return { startTime: '08:00:00', endTime: '10:00:00' };

  const parseTo24h = (segment: string): string => {
    const clean = segment.trim().toUpperCase();
    const isPM = clean.includes('PM');
    const isAM = clean.includes('AM');
    const timeOnly = clean.replace(/AM|PM/g, '').trim();
    const [rawH, rawM = '00'] = timeOnly.split(':');
    let h = parseInt(rawH, 10) || 8;
    const m = (parseInt(rawM, 10) || 0).toString().padStart(2, '0');
    if (isPM && h < 12) h += 12;
    if (isAM && h === 12) h = 0;
    return `${h.toString().padStart(2, '0')}:${m}:00`;
  };

  const parts = timeStr.split('-');
  if (parts.length >= 2) {
    return {
      startTime: parseTo24h(parts[0]),
      endTime: parseTo24h(parts[1]),
    };
  }
  return {
    startTime: parseTo24h(timeStr),
    endTime: '10:00:00',
  };
}

const COLOR_PALETTES = ['blue', 'indigo', 'emerald', 'teal', 'amber', 'cyan', 'purple'];
export function getCourseAccentColor(courseCode: string): string {
  let hash = 0;
  for (let i = 0; i < courseCode.length; i++) {
    hash = courseCode.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % COLOR_PALETTES.length;
  return COLOR_PALETTES[index];
}

let cachedDeptId: string | null = null;
export async function getDefaultDepartmentId(): Promise<string> {
  if (cachedDeptId) return cachedDeptId;
  try {
    const q = query(collection(db, 'departments'));
    const snap = await getDocs(q);
    if (!snap.empty) {
      cachedDeptId = snap.docs[0].id;
      return cachedDeptId;
    }
  } catch (e) {
    handleFirestoreError(e, OperationType.GET, 'departments');
  }
  return 'dept-ich';
}

let cachedDepartmentsList: DepartmentRecord[] = (() => {
  try {
    const raw = localStorage.getItem('cached_university_departments');
    if (raw) {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch (e) {}
  return [
    {
      id: 'dept-ich',
      name: 'Department of Industrial Chemistry',
      code: 'ICH',
      level: 100,
      created_at: new Date().toISOString(),
    },
    {
      id: 'dept-chm',
      name: 'Department of Chemistry',
      code: 'CHM',
      level: 100,
      created_at: new Date().toISOString(),
    },
  ];
})();

function updateCachedDepartments(depts: DepartmentRecord[]) {
  if (Array.isArray(depts) && depts.length > 0) {
    cachedDepartmentsList = depts;
    try {
      localStorage.setItem('cached_university_departments', JSON.stringify(depts));
    } catch (e) {}
  }
}

export interface DetectedDepartmentInfo {
  department: string;
  department_id: string;
  code: string;
}

/**
 * Autodetects the student's department from their matriculation number against all available and admin-created departments.
 * Strictly guarantees that ICH (Industrial Chemistry) and CHM (Chemistry) are separated.
 * Examples:
 * - 2025/PS/ICH/0001 or 2025-ps-ich-4000 or ICH/2026/001 -> Department of Industrial Chemistry (ICH)
 * - 2025/PS/CHM/0001 or 2025-ps-chm-0001 or CHM/2026/001 -> Department of Chemistry (CHM)
 * - Any custom admin department codes (e.g. BCH, MCB, PHY, CSC, MTH) automatically resolved
 */
export function detectDepartmentFromMatric(
  matric: string,
  availableDepartments?: DepartmentRecord[]
): DetectedDepartmentInfo {
  const cleanMatric = (matric || '').trim().toUpperCase();

  // Consolidate department list from passed argument, memory cache, or storage
  const deptsToCheck: DepartmentRecord[] = 
    (availableDepartments && availableDepartments.length > 0)
      ? availableDepartments
      : (cachedDepartmentsList && cachedDepartmentsList.length > 0)
        ? cachedDepartmentsList
        : [
            { id: 'dept-ich', name: 'Department of Industrial Chemistry', code: 'ICH', level: 100 },
            { id: 'dept-chm', name: 'Department of Chemistry', code: 'CHM', level: 100 },
          ];

  if (cleanMatric) {
    // 1. Explicit Check for Industrial Chemistry (ICH)
    if (
      cleanMatric.includes('ICH') || 
      cleanMatric.includes('INDUSTRIAL')
    ) {
      const ichDept = deptsToCheck.find(
        (d) => d.code?.toUpperCase() === 'ICH' || d.name.toUpperCase().includes('INDUSTRIAL')
      );
      if (ichDept) {
        return { department: ichDept.name, department_id: ichDept.id, code: ichDept.code || 'ICH' };
      }
      return { department: 'Department of Industrial Chemistry', department_id: 'dept-ich', code: 'ICH' };
    }

    // 2. Explicit Check for Pure/General Chemistry (CHM) - strictly NOT Industrial Chemistry
    if (
      cleanMatric.includes('CHM') || 
      (cleanMatric.includes('CHEMISTRY') && !cleanMatric.includes('INDUSTRIAL')) || 
      (cleanMatric.includes('CHEM') && !cleanMatric.includes('INDUSTRIAL'))
    ) {
      const chmDept = deptsToCheck.find(
        (d) => d.code?.toUpperCase() === 'CHM' || 
          (d.name.toUpperCase().includes('CHEMISTRY') && !d.name.toUpperCase().includes('INDUSTRIAL'))
      );
      if (chmDept) {
        return { department: chmDept.name, department_id: chmDept.id, code: chmDept.code || 'CHM' };
      }
      return { department: 'Department of Chemistry', department_id: 'dept-chm', code: 'CHM' };
    }

    const tokens = cleanMatric.split(/[^A-Z0-9]+/).filter(Boolean);

    // 3. Exact token match for any other dynamic department code (e.g., "BCH", "PHY", "CSC", "MTH", "MCB")
    for (const dept of deptsToCheck) {
      const dCode = dept.code?.trim().toUpperCase();
      if (dCode && tokens.includes(dCode)) {
        return {
          department: dept.name,
          department_id: dept.id,
          code: dept.code,
        };
      }
    }

    // 4. Substring code match in matric (e.g. 2025/PS/BCH/001)
    for (const dept of deptsToCheck) {
      const dCode = dept.code?.trim().toUpperCase();
      if (dCode && dCode.length >= 2 && cleanMatric.includes(dCode)) {
        return {
          department: dept.name,
          department_id: dept.id,
          code: dept.code,
        };
      }
    }

    // 5. Department Name keywords matching (excluding common filler words)
    for (const dept of deptsToCheck) {
      const nameWords = (dept.name || '')
        .toUpperCase()
        .split(/[^A-Z0-9]+/)
        .filter((w) => w.length > 3 && !['DEPARTMENT', 'DEPT', 'THE', 'AND', 'FOR', 'SCIENCES', 'FACULTY', 'CHEMISTRY'].includes(w));
      for (const word of nameWords) {
        if (cleanMatric.includes(word)) {
          return {
            department: dept.name,
            department_id: dept.id,
            code: dept.code,
          };
        }
      }
    }
  }

  // 6. Fallback to first available department or Industrial Chemistry
  const defaultDept = deptsToCheck.find((d) => d.code === 'ICH' || d.id === 'dept-ich') || deptsToCheck[0];
  if (defaultDept) {
    return {
      department: defaultDept.name,
      department_id: defaultDept.id,
      code: defaultDept.code || 'ICH',
    };
  }

  return {
    department: 'Department of Industrial Chemistry',
    department_id: 'dept-ich',
    code: 'ICH',
  };
}

/**
 * Accurately resolves a student record's canonical department code (e.g. 'ICH', 'CHM', 'BCH'),
 * department name, and department ID.
 * Guarantees that ICH (Industrial Chemistry) and CHM (Chemistry) are strictly differentiated.
 */
export function getStudentDepartmentInfo(
  student: {
    department?: string;
    department_id?: string;
    departmentId?: string;
    matric_number?: string;
    matricNumber?: string;
  },
  availableDepartments: DepartmentRecord[] = []
): { code: string; name: string; id: string } {
  const deptName = (student.department || '').trim();
  const deptId = (student.department_id || student.departmentId || '').trim();
  const matric = (student.matric_number || student.matricNumber || '').trim().toUpperCase();
  const upperDept = deptName.toUpperCase();

  // 1. Explicit Check for Industrial Chemistry (ICH)
  const isICH = 
    deptId === 'dept-ich' ||
    matric.includes('/ICH/') ||
    matric.includes('-ICH-') ||
    matric.includes('.ICH.') ||
    matric.includes('ICH') ||
    upperDept === 'ICH' ||
    upperDept.includes('INDUSTRIAL') ||
    upperDept === 'INDUSTRIAL CHEMISTRY' ||
    upperDept === 'DEPARTMENT OF INDUSTRIAL CHEMISTRY';

  if (isICH) {
    const foundDept = availableDepartments.find(
      (d) => d.code?.toUpperCase() === 'ICH' || d.name?.toUpperCase().includes('INDUSTRIAL')
    );
    return {
      code: 'ICH',
      name: foundDept?.name || 'Department of Industrial Chemistry',
      id: foundDept?.id || 'dept-ich',
    };
  }

  // 2. Explicit Check for Chemistry (CHM) - Pure/General Chemistry
  const isCHM = 
    deptId === 'dept-chm' ||
    matric.includes('/CHM/') ||
    matric.includes('-CHM-') ||
    matric.includes('.CHM.') ||
    matric.includes('CHM') ||
    upperDept === 'CHM' ||
    (upperDept.includes('CHEMISTRY') && !upperDept.includes('INDUSTRIAL')) ||
    upperDept === 'CHEMISTRY' ||
    upperDept === 'DEPARTMENT OF CHEMISTRY';

  if (isCHM) {
    const foundDept = availableDepartments.find(
      (d) => d.code?.toUpperCase() === 'CHM' || 
        (d.name?.toUpperCase().includes('CHEMISTRY') && !d.name?.toUpperCase().includes('INDUSTRIAL'))
    );
    return {
      code: 'CHM',
      name: foundDept?.name || 'Department of Chemistry',
      id: foundDept?.id || 'dept-chm',
    };
  }

  // 3. Match against other custom dynamic departments (e.g. BCH, PHY, CSC, MTH)
  for (const dept of availableDepartments) {
    const dCode = dept.code?.trim().toUpperCase();
    const dId = dept.id?.trim();
    const dName = dept.name?.trim().toUpperCase();

    if (dId && deptId === dId) {
      return { code: dept.code, name: dept.name, id: dept.id };
    }
    if (dCode && (matric.includes(dCode) || upperDept === dCode || upperDept === dName)) {
      return { code: dept.code, name: dept.name, id: dept.id };
    }
  }

  // 4. Auto-detect from matric if available
  if (matric) {
    const detected = detectDepartmentFromMatric(matric, availableDepartments);
    if (detected) {
      return { code: detected.code, name: detected.department, id: detected.department_id };
    }
  }

  // 5. Fallback
  return {
    code: upperDept.replace(/[^A-Z]/g, '').slice(0, 4) || 'DEPT',
    name: deptName || 'Department of Industrial Chemistry',
    id: deptId || 'dept-ich',
  };
}

// =================== 1. DEPARTMENTS API ===================
export async function fetchDepartments(): Promise<DepartmentRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'departments'));
    if (!snap.empty) {
      const depts = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          name: d.name || 'Department of Industrial Chemistry',
          code: d.code || 'ICH',
          level: d.level || 100,
          created_at: d.created_at || new Date().toISOString(),
        } as DepartmentRecord;
      });
      updateCachedDepartments(depts);
      return depts;
    }

    // Default departments: Industrial Chemistry (ICH), Pure Chemistry (CHM), Computer Science (CSC), Biochemistry (BCH), Microbiology (MCB)
    const initialDepts: DepartmentRecord[] = [
      {
        id: 'dept-ich',
        name: 'Department of Industrial Chemistry',
        code: 'ICH',
        level: 100,
        created_at: new Date().toISOString(),
      },
      {
        id: 'dept-chm',
        name: 'Department of Chemistry',
        code: 'CHM',
        level: 100,
        created_at: new Date().toISOString(),
      },
      {
        id: 'dept-csc',
        name: 'Department of Computer Science',
        code: 'CSC',
        level: 100,
        created_at: new Date().toISOString(),
      },
      {
        id: 'dept-bch',
        name: 'Department of Biochemistry',
        code: 'BCH',
        level: 100,
        created_at: new Date().toISOString(),
      },
      {
        id: 'dept-mcb',
        name: 'Department of Microbiology',
        code: 'MCB',
        level: 100,
        created_at: new Date().toISOString(),
      },
    ];

    for (const d of initialDepts) {
      await setDoc(doc(db, 'departments', d.id), d);
    }
    updateCachedDepartments(initialDepts);
    return initialDepts;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'departments');
    return cachedDepartmentsList;
  }
}

export async function createDepartment(data: { name: string; code: string; level?: number }): Promise<DepartmentRecord | null> {
  try {
    const payload = {
      name: data.name.trim(),
      code: data.code.trim().toUpperCase(),
      level: data.level || 100,
      created_at: new Date().toISOString(),
    };
    const docRef = await addDoc(collection(db, 'departments'), payload);
    const newDept: DepartmentRecord = { id: docRef.id, ...payload };
    updateCachedDepartments([...cachedDepartmentsList.filter(d => d.id !== newDept.id), newDept]);
    return newDept;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'departments');
    return null;
  }
}

export async function updateDepartment(id: string, updates: Partial<DepartmentRecord>): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'departments', id), updates);
    const updated = cachedDepartmentsList.map(d => d.id === id ? { ...d, ...updates } : d);
    updateCachedDepartments(updated);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `departments/${id}`);
    return false;
  }
}

export async function deleteDepartment(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'departments', id));
    const filtered = cachedDepartmentsList.filter(d => d.id !== id);
    updateCachedDepartments(filtered);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `departments/${id}`);
    return false;
  }
}

// =================== 2. COURSES API ===================
export const COMPREHENSIVE_SEEDED_COURSES: CourseRecord[] = [
  // ---------- INDUSTRIAL CHEMISTRY (dept-ich) ----------
  // 100 Level - 1st Semester
  { id: 'ich-101', courseCode: 'ICH 101', title: 'Introduction to Industrial Chemistry', description: 'Chemical processes, raw materials, flowcharts, material balance and basic industrial unit operations.', department_id: 'dept-ich', units: 3, level: 100, semester: '1st Semester' },
  { id: 'ich-chm101', courseCode: 'CHM 101', title: 'General Physical Chemistry I', description: 'Thermodynamics, chemical kinetics, equilibria, gases and states of matter.', department_id: 'dept-ich', units: 3, level: 100, semester: '1st Semester' },
  { id: 'ich-mth101', courseCode: 'MTH 101', title: 'Elementary Mathematics I (Algebra & Trigonometry)', description: 'Sets, quadratic equations, progressions, matrices, determinants and trigonometric functions.', department_id: 'dept-ich', units: 3, level: 100, semester: '1st Semester' },
  { id: 'ich-phy101', courseCode: 'PHY 101', title: 'General Physics I (Mechanics & Matter)', description: 'Units, dimensions, kinematics, dynamics, gravitation, elasticity, surface tension and fluid dynamics.', department_id: 'dept-ich', units: 3, level: 100, semester: '1st Semester' },
  { id: 'ich-gst101', courseCode: 'GST 101', title: 'Use of English & Scientific Communication', description: 'Study skills, comprehension, scientific essay writing, listening comprehension and vocabulary development.', department_id: 'dept-ich', units: 2, level: 100, semester: '1st Semester' },
  { id: 'ich-bio101', courseCode: 'BIO 101', title: 'General Biology I', description: 'Cell biology, molecular genetics, physiology and biological chemistry.', department_id: 'dept-ich', units: 2, level: 100, semester: '1st Semester' },

  // 100 Level - 2nd Semester
  { id: 'ich-102', courseCode: 'ICH 102', title: 'Industrial Raw Materials & Chemical Processing', description: 'Sources of raw materials, mineral processing, water treatment, agro-allied chemical feedstocks.', department_id: 'dept-ich', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'ich-chm102', courseCode: 'CHM 102', title: 'General Inorganic Chemistry I', description: 'Periodic table, bonding, main group elements, transition metals and qualitative inorganic analysis.', department_id: 'dept-ich', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'ich-chm104', courseCode: 'CHM 104', title: 'General Practical Chemistry', description: 'Volumetric and qualitative inorganic analysis laboratory experiments.', department_id: 'dept-ich', units: 1, level: 100, semester: '2nd Semester' },
  { id: 'ich-mth102', courseCode: 'MTH 102', title: 'Calculus & Coordinate Geometry', description: 'Differential and integral calculus, limits, integration techniques and geometric applications.', department_id: 'dept-ich', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'ich-phy102', courseCode: 'PHY 102', title: 'Introductory Physics II (Electricity, Optics & Modern Physics)', description: 'Electrostatics, DC circuits, magnetism, wave optics and atomic structure.', department_id: 'dept-ich', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'ich-gst102', courseCode: 'GST 102', title: 'Philosophy, Logic & Human Existence', description: 'Nature of philosophy, symbolic logic, fallacies and epistemology in science.', department_id: 'dept-ich', units: 2, level: 100, semester: '2nd Semester' },

  // 200 Level - 1st Semester
  { id: 'ich-201', courseCode: 'ICH 201', title: 'Applied Chemical Thermodynamics & Kinetics', description: 'First and second laws applied to open flow systems, reaction rate laws and chemical reactor dynamics.', department_id: 'dept-ich', units: 3, level: 200, semester: '1st Semester' },
  { id: 'ich-chm211', courseCode: 'CHM 211', title: 'Basic Organic Chemistry I', description: 'Structure, bonding, stereochemistry, aliphatic hydrocarbons and nucleophilic substitution mechanisms.', department_id: 'dept-ich', units: 3, level: 200, semester: '1st Semester' },
  { id: 'ich-chm221', courseCode: 'CHM 221', title: 'Basic Inorganic Chemistry I', description: 'Coordination chemistry, crystal field theory and non-aqueous solvents in industry.', department_id: 'dept-ich', units: 3, level: 200, semester: '1st Semester' },
  { id: 'ich-203', courseCode: 'ICH 203', title: 'Chemical Process Calculations & Stoichiometry', description: 'Material and energy balance over non-reactive and reactive chemical engineering systems.', department_id: 'dept-ich', units: 2, level: 200, semester: '1st Semester' },
  { id: 'ich-mth201', courseCode: 'MTH 201', title: 'Mathematical Methods for Scientists', description: 'Ordinary differential equations, Fourier series, partial differentiation and vector calculus.', department_id: 'dept-ich', units: 3, level: 200, semester: '1st Semester' },

  // 200 Level - 2nd Semester
  { id: 'ich-202', courseCode: 'ICH 202', title: 'Unit Operations in Industrial Processes I', description: 'Fluid flow, heat transfer, conduction, convection and radiation in chemical plants.', department_id: 'dept-ich', units: 3, level: 200, semester: '2nd Semester' },
  { id: 'ich-204', courseCode: 'ICH 204', title: 'Industrial Safety, Hazard Control & Toxicology', description: 'Chemical plant hazards, HAZOP analysis, occupational safety and industrial environmental toxicology.', department_id: 'dept-ich', units: 2, level: 200, semester: '2nd Semester' },
  { id: 'ich-chm232', courseCode: 'CHM 232', title: 'Basic Physical Chemistry II', description: 'Electrochemistry, phase equilibria, colloids and surface chemistry.', department_id: 'dept-ich', units: 3, level: 200, semester: '2nd Semester' },
  { id: 'ich-chm292', courseCode: 'CHM 292', title: 'Applied Experimental Chemistry Lab', description: 'Synthetic and analytical practical chemistry for industrial formulations.', department_id: 'dept-ich', units: 2, level: 200, semester: '2nd Semester' },
  { id: 'ich-gst202', courseCode: 'GST 202', title: 'Peace Studies & Conflict Resolution', description: 'Conflict dynamics, communication, negotiation and dispute resolution frameworks.', department_id: 'dept-ich', units: 2, level: 200, semester: '2nd Semester' },

  // 300 Level - 1st Semester
  { id: 'ich-301', courseCode: 'ICH 301', title: 'Polymer Chemistry & Technology', description: 'Polymerization mechanisms, synthetic polymers, elastomers, resin formulations and plastics extrusion.', department_id: 'dept-ich', units: 3, level: 300, semester: '1st Semester' },
  { id: 'ich-303', courseCode: 'ICH 303', title: 'Petroleum Refining & Petrochemicals', description: 'Crude oil assay, atmospheric & vacuum distillation, catalytic cracking, reforming and petrochemical derivatives.', department_id: 'dept-ich', units: 3, level: 300, semester: '1st Semester' },
  { id: 'ich-305', courseCode: 'ICH 305', title: 'Quality Assurance & Chemical Process Control', description: 'ISO 9001 standards, statistical process control, automated instrumentation and feedback control loops.', department_id: 'dept-ich', units: 2, level: 300, semester: '1st Semester' },
  { id: 'ich-chm341', courseCode: 'CHM 341', title: 'Instrumental Methods of Chemical Analysis', description: 'Spectrophotometry (UV-Vis, FTIR), AAS, gas chromatography (GC), and HPLC.', department_id: 'dept-ich', units: 3, level: 300, semester: '1st Semester' },

  // 300 Level - 2nd Semester
  { id: 'ich-399', courseCode: 'ICH 399', title: 'Industrial Training / SIWES (6-Month Attachment)', description: 'Full-time supervised practical work experience in a recognized chemical or manufacturing industry.', department_id: 'dept-ich', units: 6, level: 300, semester: '2nd Semester' },
  { id: 'ich-302', courseCode: 'ICH 302', title: 'Unit Operations in Industrial Processes II', description: 'Mass transfer operations: distillation, liquid-liquid extraction, gas absorption and drying.', department_id: 'dept-ich', units: 3, level: 300, semester: '2nd Semester' },

  // 400 Level - 1st Semester
  { id: 'ich-401', courseCode: 'ICH 401', title: 'Chemical Plant Design, Economics & Optimization', description: 'Process equipment sizing, piping & instrumentation diagrams (P&ID), capital cost estimation and plant feasibility.', department_id: 'dept-ich', units: 3, level: 400, semester: '1st Semester' },
  { id: 'ich-403', courseCode: 'ICH 403', title: 'Industrial Catalysis & Green Chemistry', description: 'Heterogeneous and homogeneous catalysis, green metrics, atom economy and sustainable synthesis.', department_id: 'dept-ich', units: 3, level: 400, semester: '1st Semester' },
  { id: 'ich-405', courseCode: 'ICH 405', title: 'Corrosion Science & Material Protection', description: 'Electrochemical mechanisms of corrosion, inhibitors, cathodic protection and industrial protective coatings.', department_id: 'dept-ich', units: 3, level: 400, semester: '1st Semester' },
  { id: 'ich-407', courseCode: 'ICH 407', title: 'Fertilizer & Agrochemical Technology', description: 'Production of ammonia, urea, NPK fertilizers, pesticides, herbicides and emulsifiable concentrates.', department_id: 'dept-ich', units: 2, level: 400, semester: '1st Semester' },

  // 400 Level - 2nd Semester
  { id: 'ich-499', courseCode: 'ICH 499', title: 'Final Year Research Project & Defense', description: 'Supervised independent experimental research in applied or industrial chemistry culminating in a thesis defense.', department_id: 'dept-ich', units: 6, level: 400, semester: '2nd Semester' },
  { id: 'ich-402', courseCode: 'ICH 402', title: 'Industrial Waste Management & Environmental Chemistry', description: 'Effluent treatment, particulate emission control, hazardous waste remediation and environmental impact assessment.', department_id: 'dept-ich', units: 3, level: 400, semester: '2nd Semester' },
  { id: 'ich-404', courseCode: 'ICH 404', title: 'Chemical Entrepreneurship & Industrial Management', description: 'Small to medium scale chemical manufacturing enterprises, product formulation, marketing and regulatory compliance.', department_id: 'dept-ich', units: 2, level: 400, semester: '2nd Semester' },

  // ---------- PURE CHEMISTRY (dept-chm) ----------
  // 100 Level - 1st Semester
  { id: 'chm-101', courseCode: 'CHM 101', title: 'General Physical Chemistry I', description: 'States of matter, gas laws, chemical thermodynamics, kinetics and chemical equilibrium.', department_id: 'dept-chm', units: 3, level: 100, semester: '1st Semester' },
  { id: 'chm-phy101', courseCode: 'PHY 101', title: 'General Physics I', description: 'Mechanics, properties of matter, thermal physics and harmonic motion.', department_id: 'dept-chm', units: 3, level: 100, semester: '1st Semester' },
  { id: 'chm-mth101', courseCode: 'MTH 101', title: 'Elementary Mathematics I', description: 'Algebra, trigonometry, functions, sequences and series.', department_id: 'dept-chm', units: 3, level: 100, semester: '1st Semester' },
  { id: 'chm-bio101', courseCode: 'BIO 101', title: 'General Biology I', description: 'Cell biology, genetics, and ecology.', department_id: 'dept-chm', units: 3, level: 100, semester: '1st Semester' },
  { id: 'chm-gst101', courseCode: 'GST 101', title: 'Use of English & Communication', description: 'Grammar, sentence structure, academic reading and composition.', department_id: 'dept-chm', units: 2, level: 100, semester: '1st Semester' },

  // 100 Level - 2nd Semester
  { id: 'chm-102', courseCode: 'CHM 102', title: 'General Inorganic Chemistry I', description: 'Periodic properties, atomic theory, s and p block elements, and chemical bonding.', department_id: 'dept-chm', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'chm-104', courseCode: 'CHM 104', title: 'Practical Chemistry I', description: 'Laboratory titrations, qualitative inorganic cation and anion separation.', department_id: 'dept-chm', units: 2, level: 100, semester: '2nd Semester' },
  { id: 'chm-phy102', courseCode: 'PHY 102', title: 'Introductory Physics II', description: 'Electromagnetism, geometrical optics, wave motion and atomic physics.', department_id: 'dept-chm', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'chm-mth102', courseCode: 'MTH 102', title: 'Calculus & Coordinate Geometry', description: 'Differential and integral calculus with applications to rate laws.', department_id: 'dept-chm', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'chm-gst102', courseCode: 'GST 102', title: 'Philosophy and Logic', description: 'Arguments, truth tables, deduction and critical thinking.', department_id: 'dept-chm', units: 2, level: 100, semester: '2nd Semester' },

  // 200 Level - 1st Semester
  { id: 'chm-211', courseCode: 'CHM 211', title: 'Structure & Bonding in Organic Chemistry', description: 'Alkanes, alkenes, alkynes, aromaticity, and conformational analysis.', department_id: 'dept-chm', units: 3, level: 200, semester: '1st Semester' },
  { id: 'chm-221', courseCode: 'CHM 221', title: 'Coordination Chemistry & Transition Elements', description: 'Coordination complexes, Werner theory, crystal field theory and isomerism.', department_id: 'dept-chm', units: 3, level: 200, semester: '1st Semester' },
  { id: 'chm-231', courseCode: 'CHM 231', title: 'Chemical Thermodynamics & Equilibria', description: 'Entropy, Gibbs free energy, chemical potential and Maxwell relations.', department_id: 'dept-chm', units: 3, level: 200, semester: '1st Semester' },
  { id: 'chm-phy201', courseCode: 'PHY 201', title: 'Thermal Physics & Waves', description: 'Kinetic theory of gases, heat engines and wave propagation.', department_id: 'dept-chm', units: 3, level: 200, semester: '1st Semester' },

  // 200 Level - 2nd Semester
  { id: 'chm-212', courseCode: 'CHM 212', title: 'Reaction Mechanisms in Organic Chemistry', description: 'Electrophilic aromatic substitution, addition reactions, carbonyl chemistry and rearrangements.', department_id: 'dept-chm', units: 3, level: 200, semester: '2nd Semester' },
  { id: 'chm-232', courseCode: 'CHM 232', title: 'Electrochemistry & Solutions', description: 'Electrolytic conductance, Debye-Hückel theory, electrochemical cells and Nernst equation.', department_id: 'dept-chm', units: 3, level: 200, semester: '2nd Semester' },
  { id: 'chm-292', courseCode: 'CHM 292', title: 'Practical Physical & Analytical Chemistry', description: 'Calorimetry, conductometry, potentiometry and spectrophotometric titrations.', department_id: 'dept-chm', units: 2, level: 200, semester: '2nd Semester' },
  { id: 'chm-gst202', courseCode: 'GST 202', title: 'General Studies II (Peace & Conflict)', description: 'Peace studies and human development.', department_id: 'dept-chm', units: 2, level: 200, semester: '2nd Semester' },

  // 300 Level - 1st Semester
  { id: 'chm-311', courseCode: 'CHM 311', title: 'Advanced Synthetic Organic Chemistry', description: 'Stereoselective synthesis, retrosynthetic analysis, organometallic reagents in organic synthesis.', department_id: 'dept-chm', units: 3, level: 300, semester: '1st Semester' },
  { id: 'chm-321', courseCode: 'CHM 321', title: 'Organometallic Chemistry & Ligand Field Theory', description: '18-electron rule, metal carbonyls, oxidative addition, reductive elimination and insertion reactions.', department_id: 'dept-chm', units: 3, level: 300, semester: '1st Semester' },
  { id: 'chm-341', courseCode: 'CHM 341', title: 'Spectroscopic Methods of Structure Elucidation', description: 'UV-Vis, FT-IR, 1H and 13C NMR, and Mass Spectrometry interpretation.', department_id: 'dept-chm', units: 3, level: 300, semester: '1st Semester' },
  { id: 'chm-331', courseCode: 'CHM 331', title: 'Quantum Chemistry Fundamentals', description: 'Postulates of quantum mechanics, Schrödinger equation, particle in a box and hydrogen atom.', department_id: 'dept-chm', units: 3, level: 300, semester: '1st Semester' },

  // 300 Level - 2nd Semester
  { id: 'chm-399', courseCode: 'CHM 399', title: 'SIWES Industrial Practical Training', description: 'Six-month industrial attachment in an analytical, pharmaceutical or chemical laboratory.', department_id: 'dept-chm', units: 6, level: 300, semester: '2nd Semester' },

  // 400 Level - 1st Semester
  { id: 'chm-411', courseCode: 'CHM 411', title: 'Heterocyclic & Natural Products Chemistry', description: 'Five and six membered heterocycles, alkaloids, terpenes, steroids and biosynthesis pathways.', department_id: 'dept-chm', units: 3, level: 400, semester: '1st Semester' },
  { id: 'chm-421', courseCode: 'CHM 421', title: 'Advanced Inorganic Reaction Mechanisms', description: 'Ligand substitution reactions, electron transfer (inner sphere vs outer sphere) and photochemistry.', department_id: 'dept-chm', units: 3, level: 400, semester: '1st Semester' },
  { id: 'chm-441', courseCode: 'CHM 441', title: 'Advanced Chromatographic & Separation Techniques', description: 'GC-MS, LC-MS/MS, electrophoresis, solid phase extraction and supercritical fluid chromatography.', department_id: 'dept-chm', units: 3, level: 400, semester: '1st Semester' },
  { id: 'chm-451', courseCode: 'CHM 451', title: 'Radiochemistry & Nuclear Applications', description: 'Nuclear decay modes, radiotracers, nuclear activation analysis and radiation detection.', department_id: 'dept-chm', units: 2, level: 400, semester: '1st Semester' },

  // 400 Level - 2nd Semester
  { id: 'chm-499', courseCode: 'CHM 499', title: 'Senior Research Dissertation & Defense', description: 'Original research project in organic, inorganic, physical, analytical or environmental chemistry.', department_id: 'dept-chm', units: 6, level: 400, semester: '2nd Semester' },
  { id: 'chm-432', courseCode: 'CHM 432', title: 'Statistical Thermodynamics & Molecular Modeling', description: 'Partition functions, Boltzmann distribution and computational chemistry calculations.', department_id: 'dept-chm', units: 3, level: 400, semester: '2nd Semester' },
  { id: 'chm-412', courseCode: 'CHM 412', title: 'Polymer & Material Chemistry', description: 'Conducting polymers, nanomaterials, metal-organic frameworks (MOFs) and biomaterials.', department_id: 'dept-chm', units: 2, level: 400, semester: '2nd Semester' },

  // ---------- COMPUTER SCIENCE (dept-csc) ----------
  // 100 Level - 1st Semester
  { id: 'csc-101', courseCode: 'CSC 101', title: 'Introduction to Computer Science & Algorithms', description: 'History of computing, hardware/software, number systems, problem-solving algorithms and flowcharts.', department_id: 'dept-csc', units: 3, level: 100, semester: '1st Semester' },
  { id: 'csc-mth101', courseCode: 'MTH 101', title: 'Elementary Mathematics I', description: 'Algebra, trigonometry, functions and matrices.', department_id: 'dept-csc', units: 3, level: 100, semester: '1st Semester' },
  { id: 'csc-phy101', courseCode: 'PHY 101', title: 'General Physics I', description: 'Mechanics and properties of matter.', department_id: 'dept-csc', units: 3, level: 100, semester: '1st Semester' },
  { id: 'csc-gst101', courseCode: 'GST 101', title: 'Use of English', description: 'Communication skills and comprehension.', department_id: 'dept-csc', units: 2, level: 100, semester: '1st Semester' },

  // 100 Level - 2nd Semester
  { id: 'csc-102', courseCode: 'CSC 102', title: 'Introduction to Programming in Python & C', description: 'Control flow, loops, functions, lists, dictionaries, recursion and procedural problem solving.', department_id: 'dept-csc', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'csc-104', courseCode: 'CSC 104', title: 'Digital Logic & Boolean Algebra', description: 'Logic gates, truth tables, Karnaugh maps, combinational and sequential circuit design.', department_id: 'dept-csc', units: 2, level: 100, semester: '2nd Semester' },
  { id: 'csc-mth102', courseCode: 'MTH 102', title: 'Calculus & Linear Algebra', description: 'Differential and integral calculus, vectors and eigenvalues.', department_id: 'dept-csc', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'csc-phy102', courseCode: 'PHY 102', title: 'General Physics II', description: 'Electricity, circuits and electromagnetism.', department_id: 'dept-csc', units: 3, level: 100, semester: '2nd Semester' },
  { id: 'csc-gst102', courseCode: 'GST 102', title: 'Philosophy & Logic', description: 'Logic, valid reasoning and ethics.', department_id: 'dept-csc', units: 2, level: 100, semester: '2nd Semester' },

  // 200 Level - 1st Semester
  { id: 'csc-201', courseCode: 'CSC 201', title: 'Object-Oriented Programming & Java', description: 'Classes, inheritance, polymorphism, encapsulation, interfaces and GUI development.', department_id: 'dept-csc', units: 3, level: 200, semester: '1st Semester' },
  { id: 'csc-203', courseCode: 'CSC 203', title: 'Discrete Mathematical Structures', description: 'Sets, relations, graph theory, trees, combinatorics and proof techniques.', department_id: 'dept-csc', units: 3, level: 200, semester: '1st Semester' },
  { id: 'csc-205', courseCode: 'CSC 205', title: 'Computer Architecture & Assembly', description: 'Von Neumann model, CPU registers, instruction sets, memory hierarchy and assembly programming.', department_id: 'dept-csc', units: 3, level: 200, semester: '1st Semester' },
  { id: 'csc-mth201', courseCode: 'MTH 201', title: 'Mathematical Methods', description: 'Linear algebra, matrix operations and numerical analysis.', department_id: 'dept-csc', units: 3, level: 200, semester: '1st Semester' },

  // 200 Level - 2nd Semester
  { id: 'csc-202', courseCode: 'CSC 202', title: 'Data Structures & Algorithms', description: 'Stacks, queues, linked lists, binary search trees, hash tables, sorting and Big-O complexity.', department_id: 'dept-csc', units: 3, level: 200, semester: '2nd Semester' },
  { id: 'csc-204', courseCode: 'CSC 204', title: 'Database Design & Relational SQL Systems', description: 'Entity-Relationship models, normalization (1NF-3NF), SQL queries, transactions and ACID principles.', department_id: 'dept-csc', units: 3, level: 200, semester: '2nd Semester' },
  { id: 'csc-206', courseCode: 'CSC 206', title: 'Web Technologies & Architecture', description: 'HTML5, CSS3, JavaScript, HTTP protocols, RESTful APIs and modern frontend architectures.', department_id: 'dept-csc', units: 2, level: 200, semester: '2nd Semester' },
  { id: 'csc-gst202', courseCode: 'GST 202', title: 'Peace & Conflict Resolution', description: 'Peace studies and human rights.', department_id: 'dept-csc', units: 2, level: 200, semester: '2nd Semester' },

  // 300 Level - 1st Semester
  { id: 'csc-301', courseCode: 'CSC 301', title: 'Operating Systems & Concurrency', description: 'Process scheduling, threads, synchronization, deadlocks, virtual memory and file systems.', department_id: 'dept-csc', units: 3, level: 300, semester: '1st Semester' },
  { id: 'csc-303', courseCode: 'CSC 303', title: 'Software Engineering & Agile Methodologies', description: 'SDLC, Agile/Scrum, requirement analysis, UML modeling, testing, and CI/CD pipelines.', department_id: 'dept-csc', units: 3, level: 300, semester: '1st Semester' },
  { id: 'csc-305', courseCode: 'CSC 305', title: 'Automata Theory, Languages & Computation', description: 'Finite automata, regular expressions, context-free grammars, Turing machines and computability.', department_id: 'dept-csc', units: 3, level: 300, semester: '1st Semester' },
  { id: 'csc-307', courseCode: 'CSC 307', title: 'Data Communications & Computer Networks', description: 'OSI 7-layer model, TCP/IP, routing protocols, IP addressing, socket programming and network security.', department_id: 'dept-csc', units: 3, level: 300, semester: '1st Semester' },

  // 300 Level - 2nd Semester
  { id: 'csc-399', courseCode: 'CSC 399', title: 'SIWES 6-Month Industrial Attachment', description: 'Practical software engineering and systems administration internship in a technology enterprise.', department_id: 'dept-csc', units: 6, level: 300, semester: '2nd Semester' },

  // 400 Level - 1st Semester
  { id: 'csc-401', courseCode: 'CSC 401', title: 'Artificial Intelligence & Machine Learning', description: 'Supervised & unsupervised learning, neural networks, decision trees, NLP and computer vision.', department_id: 'dept-csc', units: 3, level: 400, semester: '1st Semester' },
  { id: 'csc-403', courseCode: 'CSC 403', title: 'Compiler Construction & Optimization', description: 'Lexical analysis, parsing, semantic analysis, intermediate representation and code generation.', department_id: 'dept-csc', units: 3, level: 400, semester: '1st Semester' },
  { id: 'csc-405', courseCode: 'CSC 405', title: 'Cloud Computing & Distributed Systems', description: 'Microservices, Docker, Kubernetes, distributed consensus and cloud virtualization.', department_id: 'dept-csc', units: 3, level: 400, semester: '1st Semester' },
  { id: 'csc-407', courseCode: 'CSC 407', title: 'Cybersecurity & Applied Cryptography', description: 'Symmetric & asymmetric encryption, RSA, AES, hashing, authentication and web security vulnerabilities.', department_id: 'dept-csc', units: 2, level: 400, semester: '1st Semester' },

  // 400 Level - 2nd Semester
  { id: 'csc-499', courseCode: 'CSC 499', title: 'Final Year Capstone Software Project', description: 'Full-stack software engineering design, development and empirical dissertation defense.', department_id: 'dept-csc', units: 6, level: 400, semester: '2nd Semester' },
  { id: 'csc-402', courseCode: 'CSC 402', title: 'Mobile Application Engineering', description: 'Cross-platform mobile apps, native SDKs, state management and offline persistence.', department_id: 'dept-csc', units: 3, level: 400, semester: '2nd Semester' },
  { id: 'csc-404', courseCode: 'CSC 404', title: 'IT Entrepreneurship & Professional Ethics', description: 'Tech startups, venture capital, intellectual property, software licensing and digital ethics.', department_id: 'dept-csc', units: 2, level: 400, semester: '2nd Semester' },
];

export async function fetchCourses(): Promise<CourseRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'courses'));
    if (!snap.empty) {
      return snap.docs.map((dSnap) => {
        const d = dSnap.data();
        return {
          id: dSnap.id,
          courseCode: d.courseCode || 'ICH 101',
          title: d.title || 'Course Title',
          description: d.description || '',
          department_id: d.department_id || 'dept-ich',
          units: d.units || 3,
          semester: d.semester || '1st Semester',
          pdfurl: d.pdfurl || undefined,
          level: d.level || 100,
          created_at: d.created_at || new Date().toISOString(),
        } as CourseRecord;
      });
    }

    // Seed comprehensive course offerings across departments, levels, and semesters
    for (const crs of COMPREHENSIVE_SEEDED_COURSES) {
      await setDoc(doc(db, 'courses', crs.id), {
        ...crs,
        created_at: new Date().toISOString(),
      });
    }
    return COMPREHENSIVE_SEEDED_COURSES;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'courses');
    return COMPREHENSIVE_SEEDED_COURSES;
  }
}

/**
 * Filter courses strictly matching a student's department, level, and semester.
 */
export function filterCoursesForStudent(
  courses: CourseRecord[],
  studentDeptIdentifier?: string, // Department ID (e.g. 'dept-ich'), code ('ICH'), or name
  studentLevel?: number | string, // e.g. 100 or '100 Level'
  semester?: string, // e.g. '1st Semester' or '2nd Semester' or 'all'
  availableDepartments: DepartmentRecord[] = cachedDepartmentsList
): CourseRecord[] {
  if (!courses || courses.length === 0) return [];

  // 1. Resolve student target department ID / code
  let targetDeptId = 'dept-ich';
  let targetDeptCode = 'ICH';

  if (studentDeptIdentifier) {
    const cleanIdent = studentDeptIdentifier.trim().toLowerCase();
    const upperIdent = studentDeptIdentifier.trim().toUpperCase();

    if (cleanIdent === 'dept-ich' || upperIdent === 'ICH' || cleanIdent.includes('industrial chemistry')) {
      targetDeptId = 'dept-ich';
      targetDeptCode = 'ICH';
    } else if (cleanIdent === 'dept-chm' || upperIdent === 'CHM' || (cleanIdent.includes('chemistry') && !cleanIdent.includes('industrial'))) {
      targetDeptId = 'dept-chm';
      targetDeptCode = 'CHM';
    } else if (cleanIdent === 'dept-csc' || upperIdent === 'CSC' || cleanIdent.includes('computer')) {
      targetDeptId = 'dept-csc';
      targetDeptCode = 'CSC';
    } else {
      const match = availableDepartments.find(
        (d) => d.id === studentDeptIdentifier || d.code?.toUpperCase() === upperIdent || d.name?.toLowerCase().includes(cleanIdent)
      );
      if (match) {
        targetDeptId = match.id;
        targetDeptCode = match.code?.toUpperCase() || 'DEPT';
      }
    }
  }

  // 2. Resolve student target level
  let targetLevelNum = 100;
  if (studentLevel) {
    if (typeof studentLevel === 'number') {
      targetLevelNum = studentLevel;
    } else {
      const parsed = parseInt(studentLevel.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 100) {
        targetLevelNum = parsed;
      }
    }
  }

  return courses.filter((c) => {
    // Check Department: Match either department_id or courseCode prefix or department_name
    const matchesDept =
      c.department_id === targetDeptId ||
      c.courseCode?.toUpperCase().startsWith(targetDeptCode) ||
      (targetDeptCode === 'ICH' && (c.department_id === 'dept-ich' || c.courseCode?.startsWith('ICH') || c.courseCode?.startsWith('CHM101') || c.courseCode?.startsWith('PHY102') || c.courseCode?.startsWith('MTH102') || c.courseCode?.startsWith('GST101') || c.courseCode?.startsWith('BIO101'))) ||
      (targetDeptCode === 'CHM' && (c.department_id === 'dept-chm' || c.courseCode?.startsWith('CHM'))) ||
      (targetDeptCode === 'CSC' && (c.department_id === 'dept-csc' || c.courseCode?.startsWith('CSC')));

    // Check Academic Level (100, 200, 300, 400, etc.)
    const courseLevelNum = c.level || parseInt(c.courseCode.replace(/\D/g, '').slice(0, 1) + '00', 10) || 100;
    const matchesLevel = courseLevelNum === targetLevelNum;

    // Check Semester (1st Semester, 2nd Semester, or all)
    let matchesSemester = true;
    if (semester && semester !== 'all') {
      const semA = c.semester?.toLowerCase().replace(/\s/g, '') || '1stsemester';
      const semB = semester.toLowerCase().replace(/\s/g, '');
      matchesSemester = semA.includes(semB) || semB.includes(semA) || semA.startsWith(semB.slice(0, 3));
    }

    return matchesDept && matchesLevel && matchesSemester;
  });
}

export async function createCourse(data: {
  courseCode: string;
  title: string;
  description?: string;
  department_id?: string;
  units?: number;
  semester?: string;
  pdfurl?: string;
  level?: number;
}): Promise<CourseRecord | null> {
  try {
    const deptId = data.department_id || (await getDefaultDepartmentId());
    const payload = {
      courseCode: data.courseCode.trim().toUpperCase(),
      title: data.title.trim(),
      description: data.description || '',
      department_id: deptId,
      units: data.units || 3,
      semester: data.semester || '1st Semester',
      pdfurl: data.pdfurl || '',
      level: data.level || 100,
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'courses'), payload);
    return { id: docRef.id, ...payload };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'courses');
    return null;
  }
}

export async function updateCourse(id: string, updates: Partial<CourseRecord>): Promise<CourseRecord | null> {
  try {
    const docRef = doc(db, 'courses', id);
    await updateDoc(docRef, updates);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      return { id: snap.id, ...snap.data() } as CourseRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `courses/${id}`);
    return null;
  }
}

export async function deleteCourse(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'courses', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `courses/${id}`);
    return false;
  }
}

// =================== 3. ACTIVITIES / TIMETABLE API ===================
export async function fetchScheduleActivities(): Promise<EventItem[]> {
  try {
    const snap = await getDocs(collection(db, 'activities'));
    if (!snap.empty) {
      return snap.docs.map((dSnap) => {
        const row = dSnap.data();
        const startTime = row.startTime || '08:00:00';
        const endTime = row.endTime || '10:00:00';
        const dayKey = mapDbDayToDayKey(row.day);
        const status = (row.status || 'active').toLowerCase();
        const isPostponed = status === 'postponed';

        return {
          id: dSnap.id,
          course: row.courseCode || 'GEN101',
          title: row.title || 'Lecture',
          time: formatTimeRange(startTime, endTime),
          location: row.venue || 'Lecture Hall',
          views: `${Math.floor(Math.random() * 40) + 15} views`,
          tags: [row.type || 'Lecture', 'Physical Class'],
          isPostponed,
          instructor: row.lecturer || 'Faculty Lecturer',
          dayKey,
          colorAccent: getCourseAccentColor(row.courseCode || 'GEN'),
          notes: row.notes || undefined,
          department_id: row.department_id,
          level: row.level || 100,
          semester: row.semester || '1st Semester',
        };
      });
    }

    const seeded: EventItem[] = [];
    for (const evt of INITIAL_EVENTS) {
      const { startTime, endTime } = parseTimeRange(evt.time);
      const day = mapDayKeyToDbDay(evt.dayKey);
      const actPayload = {
        courseCode: evt.course,
        title: evt.title,
        type: evt.tags?.[0] || 'Lecture',
        day,
        startTime,
        endTime,
        venue: evt.location,
        lecturer: evt.instructor || 'Faculty Lecturer',
        department_id: 'dept-cs-100',
        status: evt.isPostponed ? 'postponed' : 'active',
        notes: '',
        level: 100,
        semester: '1st Semester',
        created_at: new Date().toISOString(),
      };
      await setDoc(doc(db, 'activities', evt.id), actPayload);
      seeded.push(evt);
    }
    return seeded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'activities');
    return INITIAL_EVENTS;
  }
}

export async function createScheduleActivity(event: Omit<EventItem, 'id'> & { department_id?: string; level?: number; semester?: string }): Promise<EventItem | null> {
  try {
    const { startTime, endTime } = parseTimeRange(event.time);
    const day = mapDayKeyToDbDay(event.dayKey);
    const deptId = event.department_id || (await getDefaultDepartmentId());

    const payload = {
      courseCode: event.course.trim().toUpperCase(),
      title: event.title.trim(),
      type: event.tags?.[0] || 'Lecture',
      day,
      startTime,
      endTime,
      venue: event.location.trim(),
      lecturer: event.instructor || '',
      department_id: deptId,
      status: event.isPostponed ? 'postponed' : 'active',
      notes: event.notes || '',
      level: event.level || 100,
      semester: event.semester || '1st Semester',
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'activities'), payload);

    return {
      id: docRef.id,
      course: payload.courseCode,
      title: payload.title,
      time: formatTimeRange(payload.startTime, payload.endTime),
      location: payload.venue,
      views: '0 views',
      tags: [payload.type, 'Physical Class'],
      isPostponed: payload.status === 'postponed',
      instructor: payload.lecturer,
      dayKey: mapDbDayToDayKey(payload.day),
      colorAccent: getCourseAccentColor(payload.courseCode),
      notes: payload.notes,
      department_id: payload.department_id,
      level: payload.level,
      semester: payload.semester,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'activities');
    return null;
  }
}

export async function updateScheduleActivity(id: string, fields: Partial<EventItem> & { department_id?: string; level?: number; semester?: string }): Promise<boolean> {
  try {
    const payload: Record<string, any> = {};
    if (fields.course) payload.courseCode = fields.course.trim().toUpperCase();
    if (fields.title) payload.title = fields.title.trim();
    if (fields.location) payload.venue = fields.location.trim();
    if (fields.instructor !== undefined) payload.lecturer = fields.instructor;
    if (fields.isPostponed !== undefined) payload.status = fields.isPostponed ? 'postponed' : 'active';
    if (fields.notes !== undefined) payload.notes = fields.notes;
    if (fields.time) {
      const { startTime, endTime } = parseTimeRange(fields.time);
      payload.startTime = startTime;
      payload.endTime = endTime;
    }
    if (fields.dayKey) {
      payload.day = mapDayKeyToDbDay(fields.dayKey);
    }
    if (fields.tags && fields.tags.length > 0) {
      payload.type = fields.tags[0];
    }
    if (fields.level) payload.level = fields.level;
    if (fields.semester) payload.semester = fields.semester;

    await updateDoc(doc(db, 'activities', id), payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `activities/${id}`);
    return false;
  }
}

export async function deleteScheduleActivity(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'activities', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `activities/${id}`);
    return false;
  }
}

// =================== 4. DEADLINES / ASSIGNMENTS API ===================
export async function fetchAssignments(): Promise<AssignmentItem[]> {
  try {
    const snap = await getDocs(collection(db, 'deadlines'));
    if (!snap.empty) {
      return snap.docs.map((dSnap) => {
        const row = dSnap.data();
        return {
          id: dSnap.id,
          course: row.courseCode || 'GEN101',
          title: row.title || 'Assignment',
          dueDate: row.dueDate || 'Oct 24, 2026',
          dueTime: row.dueTime || '11:59 PM',
          priority: (row.priority as 'High' | 'Medium' | 'Low') || 'High',
          isCompleted: row.isCompleted ?? false,
          images: row.images || [],
          description: row.description || '',
          instructor: row.instructor || undefined,
          notes: row.notes || undefined,
        };
      });
    }

    const seeded: AssignmentItem[] = [];
    for (const asgn of INITIAL_ASSIGNMENTS) {
      const deadPayload = {
        courseCode: asgn.course,
        title: asgn.title,
        dueDate: asgn.dueDate,
        dueTime: asgn.dueTime || '11:59 PM',
        description: asgn.description || '',
        department_id: 'dept-cs-100',
        isCompleted: asgn.isCompleted,
        images: asgn.images || [],
        priority: asgn.priority,
        level: 100,
        semester: '1st Semester',
        created_at: new Date().toISOString(),
      };
      await setDoc(doc(db, 'deadlines', asgn.id), deadPayload);
      seeded.push(asgn);
    }
    return seeded;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'deadlines');
    return INITIAL_ASSIGNMENTS;
  }
}

export async function createAssignment(assignment: Omit<AssignmentItem, 'id'> & { department_id?: string; level?: number; semester?: string }): Promise<AssignmentItem | null> {
  try {
    const deptId = assignment.department_id || (await getDefaultDepartmentId());
    const payload = {
      courseCode: assignment.course.trim().toUpperCase(),
      title: assignment.title.trim(),
      dueDate: assignment.dueDate.trim(),
      dueTime: assignment.dueTime?.trim() || '11:59 PM',
      description: assignment.description || '',
      department_id: deptId,
      isCompleted: assignment.isCompleted || false,
      images: assignment.images || [],
      priority: assignment.priority || 'High',
      level: assignment.level || 100,
      semester: assignment.semester || '1st Semester',
      created_at: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'deadlines'), payload);

    return {
      id: docRef.id,
      course: payload.courseCode,
      title: payload.title,
      dueDate: payload.dueDate,
      dueTime: payload.dueTime,
      priority: payload.priority,
      isCompleted: payload.isCompleted,
      images: payload.images,
      description: payload.description,
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'deadlines');
    return null;
  }
}

export async function updateAssignment(id: string, fields: Partial<AssignmentItem> & { department_id?: string; level?: number; semester?: string }): Promise<boolean> {
  try {
    const payload: Record<string, any> = {};
    if (fields.course) payload.courseCode = fields.course.trim().toUpperCase();
    if (fields.title) payload.title = fields.title.trim();
    if (fields.dueDate) payload.dueDate = fields.dueDate.trim();
    if (fields.dueTime) payload.dueTime = fields.dueTime.trim();
    if (fields.description !== undefined) payload.description = fields.description;
    if (fields.isCompleted !== undefined) payload.isCompleted = fields.isCompleted;
    if (fields.images !== undefined) payload.images = fields.images;
    if (fields.priority !== undefined) payload.priority = fields.priority;
    if (fields.level) payload.level = fields.level;
    if (fields.semester) payload.semester = fields.semester;

    await updateDoc(doc(db, 'deadlines', id), payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `deadlines/${id}`);
    return false;
  }
}

export async function deleteAssignment(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'deadlines', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `deadlines/${id}`);
    return false;
  }
}

// =================== 5. ANNOUNCEMENTS & NOTIFICATIONS API ===================
export async function fetchAnnouncementsAndNotifications(): Promise<NotificationItem[]> {
  try {
    const [annSnap, notifSnap] = await Promise.all([
      getDocs(collection(db, 'announcements')),
      getDocs(collection(db, 'notifications')),
    ]);

    const items: NotificationItem[] = [];

    if (!annSnap.empty) {
      annSnap.forEach((dSnap) => {
        const d = dSnap.data();
        items.push({
          id: dSnap.id,
          title: d.title || 'Official Announcement',
          message: d.body || '',
          time: d.createdat ? new Date(d.createdat).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
          isUnread: true,
          type: d.priority === 'urgent' ? 'alert' : 'info',
          category: 'system',
        });
      });
    }

    if (!notifSnap.empty) {
      notifSnap.forEach((dSnap) => {
        const d = dSnap.data();
        items.push({
          id: dSnap.id,
          title: d.title || 'Notice',
          message: d.body || '',
          time: d.createdat ? new Date(d.createdat).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
          isUnread: d.isRead !== true,
          type: d.type === 'timetable' ? 'alert' : 'info',
          category: 'schedule',
        });
      });
    }

    if (items.length > 0) return items;

    for (const notif of NOTIFICATIONS) {
      await setDoc(doc(db, 'announcements', notif.id), {
        title: notif.title,
        body: notif.message,
        priority: notif.type === 'alert' ? 'urgent' : 'normal',
        author: 'Department of Computer Science',
        department_id: 'dept-cs-100',
        level: 100,
        semester: '1st Semester',
        createdat: new Date().toISOString(),
      });
    }
    return NOTIFICATIONS;
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'announcements');
    return NOTIFICATIONS;
  }
}

export async function createAnnouncement(data: {
  title: string;
  message: string;
  priority?: 'urgent' | 'normal';
  author?: string;
  department_id?: string;
  attachmentUrl?: string;
  level?: number;
  semester?: string;
}): Promise<NotificationItem | null> {
  try {
    const deptId = data.department_id || (await getDefaultDepartmentId());
    const payload = {
      title: data.title.trim(),
      body: data.message.trim(),
      priority: data.priority || 'normal',
      author: data.author || 'Department Admin',
      department_id: deptId,
      attachmentUrl: data.attachmentUrl || null,
      level: data.level || 100,
      semester: data.semester || '1st Semester',
      createdat: new Date().toISOString(),
    };

    const docRef = await addDoc(collection(db, 'announcements'), payload);

    return {
      id: docRef.id,
      title: payload.title,
      message: payload.body,
      time: 'Just now',
      isUnread: true,
      type: payload.priority === 'urgent' ? 'alert' : 'info',
      category: 'system',
    };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'announcements');
    return null;
  }
}

export async function updateAnnouncement(id: string, fields: Partial<{ title: string; message: string; priority: 'urgent' | 'normal'; category: string }>): Promise<boolean> {
  try {
    const payload: Record<string, any> = {};
    if (fields.title) payload.title = fields.title.trim();
    if (fields.message) payload.body = fields.message.trim();
    if (fields.priority) payload.priority = fields.priority;
    await updateDoc(doc(db, 'announcements', id), payload);
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `announcements/${id}`);
    return false;
  }
}

export async function deleteAnnouncement(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'announcements', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `announcements/${id}`);
    return false;
  }
}

// =================== 6. USERS / STUDENTS API ===================
export async function fetchStudents(): Promise<StudentProfileRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'users'));
    if (!snap.empty) {
      return snap.docs.map((dSnap) => {
        const d = dSnap.data();
        const rawMatric = d.matric_number || d.matricNumber || '2025/PS/ICH/0001';
        const detected = detectDepartmentFromMatric(rawMatric);
        const resolvedDept = (d.department && !d.department.toLowerCase().includes('computer'))
          ? d.department
          : detected.department;
        const resolvedDeptId = d.department_id || detected.department_id;

        return {
          id: dSnap.id,
          uid: dSnap.id,
          email: d.email || '',
          matric_number: rawMatric,
          matricNumber: rawMatric,
          full_name: d.full_name || d.fullName || d.name || 'Student',
          name: d.full_name || d.fullName || d.name || 'Student',
          department_id: resolvedDeptId,
          department: resolvedDept,
          level: d.level || 100,
          year_level: d.year_level || d.yearLevel || `${d.level || 100} Level`,
          yearLevel: d.year_level || d.yearLevel || `${d.level || 100} Level`,
          isadmin: Boolean(d.isadmin || d.isAdmin),
          isAdmin: Boolean(d.isadmin || d.isAdmin),
          iscourserep: Boolean(d.iscourserep || d.isCourseRep),
          isCourseRep: Boolean(d.iscourserep || d.isCourseRep),
          created_at: d.created_at || d.createdAt,
        } as StudentProfileRecord;
      });
    }

    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'users');
    return [];
  }
}

export async function fetchStudentByAuthUid(uid: string): Promise<StudentProfileRecord | null> {
  try {
    const docRef = doc(db, 'users', uid);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const d = snap.data();
      const rawMatric = d.matric_number || d.matricNumber || '';
      const detected = detectDepartmentFromMatric(rawMatric);
      const resolvedDept = (d.department && !d.department.toLowerCase().includes('computer'))
        ? d.department
        : detected.department;
      const resolvedDeptId = d.department_id || detected.department_id;

      return {
        id: snap.id,
        uid: snap.id,
        email: d.email || '',
        matric_number: rawMatric,
        matricNumber: rawMatric,
        full_name: d.full_name || d.fullName || d.name || 'Student',
        name: d.full_name || d.fullName || d.name || 'Student',
        department_id: resolvedDeptId,
        department: resolvedDept,
        level: d.level || 100,
        year_level: d.year_level || d.yearLevel || `${d.level || 100} Level`,
        yearLevel: d.year_level || d.yearLevel || `${d.level || 100} Level`,
        isadmin: Boolean(d.isadmin || d.isAdmin),
        isAdmin: Boolean(d.isadmin || d.isAdmin),
        iscourserep: Boolean(d.iscourserep || d.isCourseRep),
        isCourseRep: Boolean(d.iscourserep || d.isCourseRep),
        created_at: d.created_at || d.createdAt,
      } as StudentProfileRecord;
    }
    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/${uid}`);
    return null;
  }
}

export async function fetchStudentByEmailOrMatric(identifier: string): Promise<StudentProfileRecord | null> {
  try {
    const cleanId = identifier.trim().toLowerCase();
    const cleanMatric = identifier.trim().toUpperCase();

    // 1. Direct doc lookup by UID
    try {
      const directDoc = await getDoc(doc(db, 'users', identifier));
      if (directDoc.exists()) {
        const d = directDoc.data();
        const rawMatric = d.matric_number || d.matricNumber || cleanMatric;
        const detected = detectDepartmentFromMatric(rawMatric);
        const resolvedDept = (d.department && !d.department.toLowerCase().includes('computer'))
          ? d.department
          : detected.department;

        return {
          id: directDoc.id,
          uid: directDoc.id,
          email: d.email || '',
          matric_number: rawMatric,
          matricNumber: rawMatric,
          full_name: d.full_name || d.fullName || d.name || 'Student',
          department: resolvedDept,
          department_id: d.department_id || detected.department_id,
          year_level: d.year_level || d.yearLevel || '100 Level',
          level: d.level || 100,
          isadmin: Boolean(d.isadmin || d.isAdmin),
          iscourserep: Boolean(d.iscourserep || d.isCourseRep),
        } as StudentProfileRecord;
      }
    } catch {}

    // 2. Query by email
    const emailQuery = query(collection(db, 'users'), where('email', '==', cleanId));
    const emailSnap = await getDocs(emailQuery);
    if (!emailSnap.empty) {
      const dSnap = emailSnap.docs[0];
      const d = dSnap.data();
      const rawMatric = d.matric_number || d.matricNumber || cleanMatric;
      const detected = detectDepartmentFromMatric(rawMatric);
      const resolvedDept = (d.department && !d.department.toLowerCase().includes('computer'))
        ? d.department
        : detected.department;

      return {
        id: dSnap.id,
        uid: dSnap.id,
        email: d.email || '',
        matric_number: rawMatric,
        matricNumber: rawMatric,
        full_name: d.full_name || d.fullName || d.name || 'Student',
        department: resolvedDept,
        department_id: d.department_id || detected.department_id,
        year_level: d.year_level || d.yearLevel || '100 Level',
        level: d.level || 100,
        isadmin: Boolean(d.isadmin || d.isAdmin),
        iscourserep: Boolean(d.iscourserep || d.isCourseRep),
      } as StudentProfileRecord;
    }

    // 3. Query by matricNumber
    const matricQuery = query(collection(db, 'users'), where('matric_number', '==', cleanMatric));
    const matricSnap = await getDocs(matricQuery);
    if (!matricSnap.empty) {
      const dSnap = matricSnap.docs[0];
      const d = dSnap.data();
      const rawMatric = d.matric_number || d.matricNumber || cleanMatric;
      const detected = detectDepartmentFromMatric(rawMatric);
      const resolvedDept = (d.department && !d.department.toLowerCase().includes('computer'))
        ? d.department
        : detected.department;

      return {
        id: dSnap.id,
        uid: dSnap.id,
        email: d.email || '',
        matric_number: rawMatric,
        matricNumber: rawMatric,
        full_name: d.full_name || d.fullName || d.name || 'Student',
        department: resolvedDept,
        department_id: d.department_id || detected.department_id,
        year_level: d.year_level || d.yearLevel || '100 Level',
        level: d.level || 100,
        isadmin: Boolean(d.isadmin || d.isAdmin),
        iscourserep: Boolean(d.iscourserep || d.isCourseRep),
      } as StudentProfileRecord;
    }

    return null;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, `users/search/${identifier}`);
    return null;
  }
}

export async function createStudentUser(student: StudentProfileRecord): Promise<StudentProfileRecord | null> {
  try {
    const docId = student.id || student.uid || doc(collection(db, 'users')).id;
    const rawMatric = student.matric_number?.toUpperCase().trim() || student.matricNumber?.toUpperCase().trim() || '2025/PS/ICH/0001';
    const detected = detectDepartmentFromMatric(rawMatric);
    const resolvedDept = (student.department && !student.department.toLowerCase().includes('computer'))
      ? student.department
      : detected.department;
    const resolvedDeptId = student.department_id || detected.department_id;

    const payload = {
      id: docId,
      uid: docId,
      email: student.email.toLowerCase().trim(),
      matric_number: rawMatric,
      matricNumber: rawMatric,
      full_name: student.full_name?.trim() || student.fullName?.trim() || student.name?.trim() || 'Student',
      fullName: student.full_name?.trim() || student.fullName?.trim() || student.name?.trim() || 'Student',
      department: resolvedDept,
      department_id: resolvedDeptId,
      year_level: student.year_level || '100 Level',
      yearLevel: student.year_level || '100 Level',
      level: parseInt(student.year_level?.replace(/\D/g, '') || '100', 10) || 100,
      isadmin: Boolean(student.isadmin || student.isAdmin),
      isAdmin: Boolean(student.isadmin || student.isAdmin),
      iscourserep: Boolean(student.iscourserep || student.isCourseRep),
      isCourseRep: Boolean(student.iscourserep || student.isCourseRep),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await setDoc(doc(db, 'users', docId), payload);

    return { ...payload };
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'users');
    return null;
  }
}

export async function updateStudentUser(identifier: string, updates: Partial<StudentProfileRecord>): Promise<boolean> {
  try {
    // 1. Try by docId / UID
    try {
      const docRef = doc(db, 'users', identifier);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await updateDoc(docRef, { ...updates, updated_at: new Date().toISOString() });
        return true;
      }
    } catch {}

    // 2. Try by email query
    const q = query(collection(db, 'users'), where('email', '==', identifier.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      await updateDoc(doc(db, 'users', snap.docs[0].id), { ...updates, updated_at: new Date().toISOString() });
      return true;
    }

    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `users/${identifier}`);
    return false;
  }
}

export async function deleteStudentUser(identifier: string): Promise<boolean> {
  try {
    // 1. Try direct delete by docId / UID
    try {
      const docRef = doc(db, 'users', identifier);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        await deleteDoc(docRef);
        return true;
      }
    } catch {}

    // 2. Try query by email
    const q = query(collection(db, 'users'), where('email', '==', identifier.toLowerCase().trim()));
    const snap = await getDocs(q);
    if (!snap.empty) {
      for (const dSnap of snap.docs) {
        await deleteDoc(doc(db, 'users', dSnap.id));
      }
      return true;
    }

    return false;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `users/${identifier}`);
    return false;
  }
}


// =================== 7. FEEDBACK & CLASH REPORTS API ===================
export async function fetchFeedbackList(): Promise<FeedbackRecord[]> {
  try {
    const snap = await getDocs(collection(db, 'feedback'));
    if (!snap.empty) {
      return snap.docs.map((dSnap) => {
        const d = dSnap.data();
        return {
          id: dSnap.id,
          type: d.category || d.type || 'Clash Report',
          message: d.message || '',
          userEmail: d.user_email || d.userEmail || 'student@university.edu',
          createdat: d.createdat || new Date().toISOString(),
        } as FeedbackRecord;
      });
    }
    return [];
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, 'feedback');
    return [];
  }
}

export async function submitFeedback(payload: {
  user_email: string;
  category: string;
  message: string;
}): Promise<boolean> {
  try {
    await addDoc(collection(db, 'feedback'), {
      user_email: payload.user_email.trim(),
      category: payload.category,
      message: payload.message.trim(),
      status: 'pending',
      createdat: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, 'feedback');
    return false;
  }
}

export async function resolveFeedback(id: string, status: 'resolved' | 'dismissed'): Promise<boolean> {
  try {
    await updateDoc(doc(db, 'feedback', id), { status });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `feedback/${id}`);
    return false;
  }
}

export async function deleteFeedback(id: string): Promise<boolean> {
  try {
    await deleteDoc(doc(db, 'feedback', id));
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `feedback/${id}`);
    return false;
  }
}

export const deleteFeedbackItem = deleteFeedback;

// =================== 8. CURRENT SEMESTER API ===================
export async function fetchCurrentSemester(): Promise<CurrentSemesterRecord | null> {
  try {
    const snap = await getDocs(collection(db, 'current_semester'));
    if (!snap.empty) {
      const active = snap.docs.find((d) => d.data().is_active === true) || snap.docs[0];
      return {
        id: active.id,
        semester_code: active.data().semester_code || '1st Semester 2025/2026',
        is_active: active.data().is_active ?? true,
      };
    }
    const defaultSem: CurrentSemesterRecord = {
      id: 'sem-active',
      semester_code: '1st Semester 2025/2026',
      is_active: true,
    };
    await setDoc(doc(db, 'current_semester', defaultSem.id), defaultSem);
    return defaultSem;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'current_semester');
    return {
      id: 'sem-active',
      semester_code: '1st Semester 2025/2026',
      is_active: true,
    };
  }
}

export async function updateCurrentSemester(semester_code: string): Promise<boolean> {
  try {
    await setDoc(doc(db, 'current_semester', 'sem-active'), {
      semester_code,
      is_active: true,
      updated_at: new Date().toISOString(),
    });
    return true;
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'current_semester/sem-active');
    return false;
  }
}

// =================== 9. REAL-TIME FIRESTORE LISTENERS ===================
export interface RealtimeSubscriptionCallbacks {
  onEvents?: (events: EventItem[]) => void;
  onAssignments?: (assignments: AssignmentItem[]) => void;
  onNotifications?: (notifications: NotificationItem[]) => void;
  onStudents?: (students: StudentProfileRecord[]) => void;
  onDepartments?: (departments: DepartmentRecord[]) => void;
  onCourses?: (courses: CourseRecord[]) => void;
  onFeedback?: (feedback: FeedbackRecord[]) => void;
  onStatusChange?: (status: 'connected' | 'reconnecting' | 'error') => void;
}

export function subscribeToRealtimeDatabase(callbacks: RealtimeSubscriptionCallbacks): () => void {
  const unsubscribes: Unsubscribe[] = [];

  try {
    // 1. Activities / Schedule Timetable
    if (callbacks.onEvents) {
      unsubscribes.push(
        onSnapshot(
          collection(db, 'activities'),
          (snap) => {
            const events: EventItem[] = snap.docs.map((dSnap) => {
              const row = dSnap.data();
              const startTime = row.startTime || '08:00:00';
              const endTime = row.endTime || '10:00:00';
              const dayKey = mapDbDayToDayKey(row.day);
              const isPostponed = (row.status || 'active').toLowerCase() === 'postponed';

              return {
                id: dSnap.id,
                course: row.courseCode || 'GEN101',
                title: row.title || 'Lecture',
                time: formatTimeRange(startTime, endTime),
                location: row.venue || 'Lecture Hall',
                views: `${Math.floor(Math.random() * 40) + 15} views`,
                tags: [row.type || 'Lecture', 'Physical Class'],
                isPostponed,
                instructor: row.lecturer || 'Faculty Lecturer',
                dayKey,
                colorAccent: getCourseAccentColor(row.courseCode || 'GEN'),
                notes: row.notes || undefined,
                department_id: row.department_id,
                level: row.level || 100,
                semester: row.semester || '1st Semester',
              };
            });
            callbacks.onEvents?.(events);
            callbacks.onStatusChange?.('connected');
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, 'activities');
            callbacks.onStatusChange?.('error');
          }
        )
      );
    }

    // 2. Deadlines / Assignments
    if (callbacks.onAssignments) {
      unsubscribes.push(
        onSnapshot(
          collection(db, 'deadlines'),
          (snap) => {
            const assignments: AssignmentItem[] = snap.docs.map((dSnap) => {
              const row = dSnap.data();
              return {
                id: dSnap.id,
                course: row.courseCode || 'GEN101',
                title: row.title || 'Assignment',
                dueDate: row.dueDate || 'Oct 24, 2026',
                dueTime: row.dueTime || '11:59 PM',
                priority: (row.priority as 'High' | 'Medium' | 'Low') || 'High',
                isCompleted: row.isCompleted ?? false,
                images: row.images || [],
                description: row.description || '',
                instructor: row.instructor || undefined,
                notes: row.notes || undefined,
              };
            });
            callbacks.onAssignments?.(assignments);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, 'deadlines');
          }
        )
      );
    }

    // 3. Announcements & Notifications
    if (callbacks.onNotifications) {
      unsubscribes.push(
        onSnapshot(
          collection(db, 'announcements'),
          (snap) => {
            const notifications: NotificationItem[] = snap.docs.map((dSnap) => {
              const d = dSnap.data();
              return {
                id: dSnap.id,
                title: d.title || 'Official Announcement',
                message: d.body || '',
                time: d.createdat ? new Date(d.createdat).toLocaleDateString([], { month: 'short', day: 'numeric' }) : 'Recent',
                isUnread: true,
                type: d.priority === 'urgent' ? 'alert' : 'info',
                category: 'system',
              };
            });
            callbacks.onNotifications?.(notifications);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, 'announcements');
          }
        )
      );
    }

    // 4. Users / Students
    if (callbacks.onStudents) {
      unsubscribes.push(
        onSnapshot(
          collection(db, 'users'),
          (snap) => {
            const students: StudentProfileRecord[] = snap.docs.map((dSnap) => {
              const d = dSnap.data();
              const rawMatric = d.matric_number || d.matricNumber || '2025/PS/ICH/0001';
              const detected = detectDepartmentFromMatric(rawMatric);
              const resolvedDept = (d.department && !d.department.toLowerCase().includes('computer'))
                ? d.department
                : detected.department;
              const resolvedDeptId = d.department_id || detected.department_id;

              return {
                id: dSnap.id,
                uid: dSnap.id,
                email: d.email || '',
                matric_number: rawMatric,
                matricNumber: rawMatric,
                full_name: d.full_name || d.fullName || d.name || 'Student',
                name: d.full_name || d.fullName || d.name || 'Student',
                department_id: resolvedDeptId,
                department: resolvedDept,
                level: d.level || 100,
                year_level: d.year_level || d.yearLevel || `${d.level || 100} Level`,
                yearLevel: d.year_level || d.yearLevel || `${d.level || 100} Level`,
                isadmin: Boolean(d.isadmin || d.isAdmin),
                isAdmin: Boolean(d.isadmin || d.isAdmin),
                iscourserep: Boolean(d.iscourserep || d.isCourseRep),
                isCourseRep: Boolean(d.iscourserep || d.isCourseRep),
                created_at: d.created_at || d.createdAt,
              };
            });
            callbacks.onStudents?.(students);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, 'users');
          }
        )
      );
    }

    // 5. Departments
    if (callbacks.onDepartments) {
      unsubscribes.push(
        onSnapshot(
          collection(db, 'departments'),
          (snap) => {
            const depts: DepartmentRecord[] = snap.docs.map((dSnap) => {
              const d = dSnap.data();
              return {
                id: dSnap.id,
                name: d.name || 'Department of Industrial Chemistry',
                code: d.code || 'ICH',
                level: d.level || 100,
                created_at: d.created_at || new Date().toISOString(),
              };
            });
            callbacks.onDepartments?.(depts);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, 'departments');
          }
        )
      );
    }

    // 6. Courses
    if (callbacks.onCourses) {
      unsubscribes.push(
        onSnapshot(
          collection(db, 'courses'),
          (snap) => {
            const courses: CourseRecord[] = snap.docs.map((dSnap) => {
              const d = dSnap.data();
              return {
                id: dSnap.id,
                courseCode: d.courseCode || 'ICH101',
                title: d.title || 'Course Title',
                description: d.description || '',
                department_id: d.department_id || 'dept-ich',
                units: d.units || 3,
                semester: d.semester || '1st Semester',
                pdfurl: d.pdfurl || '',
                level: d.level || 100,
                created_at: d.created_at || new Date().toISOString(),
              };
            });
            callbacks.onCourses?.(courses);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, 'courses');
          }
        )
      );
    }

    // 7. Feedback
    if (callbacks.onFeedback) {
      unsubscribes.push(
        onSnapshot(
          collection(db, 'feedback'),
          (snap) => {
            const fbs: FeedbackRecord[] = snap.docs.map((dSnap) => {
              const d = dSnap.data();
              return {
                id: dSnap.id,
                type: d.category || d.type || 'Clash Report',
                message: d.message || '',
                userEmail: d.user_email || d.userEmail || 'student@university.edu',
                createdat: d.createdat || new Date().toISOString(),
              };
            });
            callbacks.onFeedback?.(fbs);
          },
          (err) => {
            handleFirestoreError(err, OperationType.GET, 'feedback');
          }
        )
      );
    }
  } catch (err) {
    console.warn('Realtime subscription setup notice:', err);
  }

  return () => {
    unsubscribes.forEach((unsub) => {
      try {
        unsub();
      } catch {}
    });
  };
}

export function subscribeToDatabaseChanges(onChanged: () => void): () => void {
  return subscribeToRealtimeDatabase({
    onEvents: () => onChanged(),
    onAssignments: () => onChanged(),
    onNotifications: () => onChanged(),
    onCourses: () => onChanged(),
  });
}

