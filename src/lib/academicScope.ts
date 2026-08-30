import { UserSession } from '../types';
import { StudentProfileRecord } from '../admin/types';

/**
 * Universal normalization for academic semester string.
 * Ensures consistent format: '1st Semester' | '2nd Semester'
 */
export function normalizeSemester(semStr?: string | null): '1st Semester' | '2nd Semester' {
  if (!semStr) return '1st Semester';
  const lower = semStr.toLowerCase().trim();
  if (lower.includes('2nd') || lower.includes('second') || lower === '2' || lower === 'sem2' || lower === 'rain') {
    return '2nd Semester';
  }
  return '1st Semester';
}

/**
 * Centralized, reliable level extraction for any student profile or session.
 * Correctly parses numeric level (100, 200, 300, 400, 500) and defaults to 100 Level.
 */
export function getStudentActiveLevel(
  session: UserSession | StudentProfileRecord | Record<string, any> | null | undefined
): number {
  if (!session) return 100;

  // 1. Direct numeric level check
  if (typeof session.level === 'number' && session.level >= 100 && session.level <= 600) {
    return session.level;
  }
  if (typeof (session as any).yearLevelNum === 'number' && (session as any).yearLevelNum >= 100) {
    return (session as any).yearLevelNum;
  }

  // 2. Parse from string fields: yearLevel, year_level, levelStr
  const candidates = [
    session.yearLevel,
    session.year_level,
    (session as any).yearLevelStr,
    typeof session.level === 'string' ? session.level : undefined,
  ];

  for (const cand of candidates) {
    if (typeof cand === 'string' && cand.trim().length > 0) {
      const parsed = parseInt(cand.replace(/\D/g, ''), 10);
      if (!isNaN(parsed) && parsed >= 100 && parsed <= 600) {
        return parsed;
      }
    }
  }

  // Default to 100 Level
  return 100;
}

/**
 * Centralized, reliable semester extraction for any student profile or session.
 * The global university semester from Firestore/admin configuration takes precedence
 * to keep all student devices, timetables, and admin dashboards perfectly synchronized.
 */
export function getStudentActiveSemester(
  session: UserSession | StudentProfileRecord | Record<string, any> | null | undefined,
  globalFallback: string = '1st Semester'
): '1st Semester' | '2nd Semester' {
  // If global university semester is specified, it is the master authoritative academic term
  if (globalFallback && (globalFallback.includes('1st') || globalFallback.includes('2nd') || globalFallback.includes('Semester'))) {
    return normalizeSemester(globalFallback);
  }

  if (!session) return normalizeSemester(globalFallback);

  const rawSem =
    session.semester ||
    (session as any).current_semester ||
    (session as any).academicSemester ||
    globalFallback;

  return normalizeSemester(rawSem);
}

/**
 * Returns complete academic scope descriptor for UI rendering.
 */
export function getStudentAcademicScope(
  session: UserSession | StudentProfileRecord | Record<string, any> | null | undefined,
  globalSemester: string = '1st Semester'
) {
  const activeLevel = getStudentActiveLevel(session);
  const activeSemester = getStudentActiveSemester(session, globalSemester);
  const activeSession = (session as any)?.session || (session as any)?.academic_session || '2025/2026';

  return {
    activeLevel,
    activeSemester,
    activeSession,
    levelDisplay: `${activeLevel}L`,
    levelFull: `${activeLevel} Level`,
    semesterDisplay: activeSemester,
    scopeBadge: `${activeLevel}L • ${activeSemester}`,
    fullAcademicTag: `${activeLevel} Level • ${activeSemester} (${activeSession})`,
  };
}

/**
 * Parses start and end calendar years from an academic session string (e.g. "2025/2026" -> { startYear: 2025, endYear: 2026 }).
 */
export function parseSessionYears(sessionStr?: string | null): { startYear: number; endYear: number } {
  if (!sessionStr) {
    const currentYear = new Date().getFullYear();
    return { startYear: currentYear - 1, endYear: currentYear };
  }
  const match = sessionStr.match(/(\d{4})\/(\d{4})/);
  if (match) {
    const startYear = parseInt(match[1], 10);
    const endYear = parseInt(match[2], 10);
    return { startYear, endYear };
  }
  const singleMatch = sessionStr.match(/(\d{4})/);
  if (singleMatch) {
    const startYear = parseInt(singleMatch[1], 10);
    return { startYear, endYear: startYear + 1 };
  }
  return { startYear: 2025, endYear: 2026 };
}

/**
 * Formats a start year into standard academic session notation (e.g. 2028 -> "2028/2029").
 */
export function formatAcademicSession(startYear: number): string {
  return `${startYear}/${startYear + 1}`;
}

/**
 * Returns the immediate next academic session (e.g. "2028/2029" -> "2029/2030").
 */
export function getNextAcademicSession(sessionStr?: string | null): string {
  const { startYear } = parseSessionYears(sessionStr);
  return formatAcademicSession(startYear + 1);
}

/**
 * Returns the immediate previous academic session (e.g. "2028/2029" -> "2027/2028").
 */
export function getPreviousAcademicSession(sessionStr?: string | null): string {
  const { startYear } = parseSessionYears(sessionStr);
  return formatAcademicSession(startYear - 1);
}

/**
 * Dynamic, self-generating academic session generator.
 * Automatically generates a continuous, chronological sequence of academic sessions.
 * As time moves forward or the administrator advances (e.g. after 2028/2029, 2029/2030, 2030/2031, etc.),
 * the timeline automatically extends and generates future sessions cleanly.
 */
export function generateAcademicSessions(
  activeSession?: string | null,
  options?: {
    startYear?: number;
    futureYearsCount?: number;
    customExtraSessions?: string[];
  }
): string[] {
  const currentCalendarYear = new Date().getFullYear();
  const { startYear: parsedActiveStart } = parseSessionYears(activeSession);

  // Determine earliest start year (minimum of configured startYear or active session)
  const initialBaseYear = options?.startYear ?? 2023;
  const effectiveStartYear = Math.min(initialBaseYear, parsedActiveStart);

  // Determine latest year to project forward (at least 5-7 years into future beyond current or active session)
  const futurePadding = options?.futureYearsCount ?? 6;
  const maxAnchorYear = Math.max(currentCalendarYear, parsedActiveStart);
  const targetEndStartYear = maxAnchorYear + futurePadding;

  const sessionsSet = new Set<string>();

  // Sequentially generate all sessions in the range
  for (let year = effectiveStartYear; year <= targetEndStartYear; year++) {
    sessionsSet.add(formatAcademicSession(year));
  }

  // Include active session if provided
  if (activeSession && activeSession.includes('/')) {
    sessionsSet.add(activeSession.trim());
  }

  // Include any custom extra sessions
  if (options?.customExtraSessions && Array.isArray(options.customExtraSessions)) {
    options.customExtraSessions.forEach((s) => {
      if (s && s.includes('/')) sessionsSet.add(s.trim());
    });
  }

  // Return sorted chronologically
  return Array.from(sessionsSet).sort((a, b) => {
    const yearA = parseSessionYears(a).startYear;
    const yearB = parseSessionYears(b).startYear;
    return yearA - yearB;
  });
}

/**
 * Accurately determines canonical department ID for any user session or profile.
 * Distinguishes Industrial Chemistry (dept-ich), Chemistry (dept-chm), Computer Science (dept-csc),
 * and dynamic departments cleanly.
 */
export function resolveStudentDepartmentId(
  session: UserSession | StudentProfileRecord | Record<string, any> | null | undefined,
  availableDepartments: any[] = []
): { id: string; name: string; code: string } {
  if (!session) {
    return { id: 'dept-ich', name: 'Department of Industrial Chemistry', code: 'ICH' };
  }

  const deptId = (session.department_id || (session as any).departmentId || '').trim();
  const deptName = (session.department || (session as any).department_name || (session as any).departmentName || '').trim();
  const matric = (session.matricNumber || (session as any).matric_number || '').trim().toUpperCase();
  const upperDept = deptName.toUpperCase();

  // 1. Industrial Chemistry (ICH)
  if (
    deptId === 'dept-ich' ||
    matric.includes('ICH') ||
    matric.includes('INDUSTRIAL') ||
    upperDept.includes('INDUSTRIAL') ||
    upperDept === 'ICH'
  ) {
    const matched = availableDepartments.find(
      (d) => d.id === 'dept-ich' || d.code?.toUpperCase() === 'ICH' || d.name?.toUpperCase().includes('INDUSTRIAL')
    );
    return {
      id: matched?.id || 'dept-ich',
      name: matched?.name || 'Department of Industrial Chemistry',
      code: matched?.code || 'ICH',
    };
  }

  // 2. Chemistry (CHM) - Pure/General Chemistry
  if (
    deptId === 'dept-chm' ||
    ((matric.includes('CHM') || upperDept.includes('CHEMISTRY') || upperDept === 'CHM') && !upperDept.includes('INDUSTRIAL') && !matric.includes('ICH'))
  ) {
    const matched = availableDepartments.find(
      (d) => d.id === 'dept-chm' || (d.code?.toUpperCase() === 'CHM' && !d.code?.toUpperCase().includes('ICH')) ||
        (d.name?.toUpperCase().includes('CHEMISTRY') && !d.name?.toUpperCase().includes('INDUSTRIAL'))
    );
    return {
      id: matched?.id || 'dept-chm',
      name: matched?.name || 'Department of Chemistry',
      code: matched?.code || 'CHM',
    };
  }

  // 3. Computer Science (CSC)
  if (
    deptId === 'dept-csc' ||
    matric.includes('CSC') ||
    matric.includes('COMPUTER') ||
    upperDept.includes('COMPUTER') ||
    upperDept === 'CSC'
  ) {
    const matched = availableDepartments.find(
      (d) => d.id === 'dept-csc' || d.code?.toUpperCase() === 'CSC' || d.name?.toUpperCase().includes('COMPUTER')
    );
    return {
      id: matched?.id || 'dept-csc',
      name: matched?.name || 'Department of Computer Science',
      code: matched?.code || 'CSC',
    };
  }

  // 4. Match against any available departments
  for (const d of availableDepartments) {
    if (deptId && d.id === deptId) {
      return { id: d.id, name: d.name, code: d.code || 'DEPT' };
    }
    const dCode = d.code?.trim().toUpperCase();
    if (dCode && (matric.includes(dCode) || upperDept === dCode || upperDept.includes(d.name.toUpperCase()))) {
      return { id: d.id, name: d.name, code: d.code || 'DEPT' };
    }
  }

  if (deptId) {
    return { id: deptId, name: deptName || 'Department', code: 'DEPT' };
  }

  return { id: 'dept-ich', name: deptName || 'Department of Industrial Chemistry', code: 'ICH' };
}

/**
 * Centralized, strict filter for course records based on student's department, level, and semester.
 * Guarantees that:
 * 1. Courses added in Industrial Chemistry (dept-ich) ONLY appear in Industrial Chemistry.
 * 2. Courses added in Pure Chemistry (dept-chm) ONLY appear in Pure Chemistry.
 * 3. Courses added in Computer Science (dept-csc) ONLY appear in Computer Science.
 * 4. Level is strictly matched (100L only shows 100L courses, 200L only 200L, etc.).
 * 5. Semester is strictly matched (1st Semester only shows 1st Semester, 2nd Semester only 2nd Semester).
 */
export function filterCoursesForStudentScope(
  courses: any[],
  targetDepartmentId: string,
  targetLevel: number,
  targetSemester: string
): any[] {
  if (!courses || !Array.isArray(courses)) return [];
  const normalizedSem = normalizeSemester(targetSemester);
  const cleanTargetDeptId = (targetDepartmentId || 'dept-ich').trim().toLowerCase();

  return courses.filter((crs: any) => {
    // 1. Department match: Strict department ID comparison
    const crsDeptId = (crs.department_id || crs.departmentId || '').trim().toLowerCase();
    
    let matchesDept = false;
    if (crsDeptId) {
      matchesDept = crsDeptId === cleanTargetDeptId;
    } else {
      // Strict fallback for legacy items missing department_id
      const cCode = (crs.courseCode || crs.code || '').trim().toUpperCase();
      if (cleanTargetDeptId === 'dept-ich') {
        matchesDept = cCode.startsWith('ICH');
      } else if (cleanTargetDeptId === 'dept-chm') {
        matchesDept = cCode.startsWith('CHM') && !cCode.startsWith('ICH');
      } else if (cleanTargetDeptId === 'dept-csc') {
        matchesDept = cCode.startsWith('CSC');
      } else {
        matchesDept = false;
      }
    }

    if (!matchesDept) return false;

    // 2. Level match: Strict level comparison
    const cCode = (crs.courseCode || crs.code || '').trim().toUpperCase();
    const crsLevel = typeof crs.level === 'number' 
      ? crs.level 
      : parseInt(String(crs.level || cCode.replace(/\D/g, '').slice(0, 1) + '00'), 10) || 100;
    
    if (crsLevel !== targetLevel) return false;

    // 3. Semester match: Strict semester comparison
    const crsSem = normalizeSemester(crs.semester);
    if (crsSem !== normalizedSem) return false;

    return true;
  });
}

