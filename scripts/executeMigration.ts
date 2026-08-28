import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs, doc, setDoc } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// 1. Source Firebase Configuration (Temporary project to migrate from)
const sourceFirebaseConfig = {
  apiKey: "AIzaSyDasXOCsqxwer5TJEkw8boKtnxk_KHCT0o",
  authDomain: "ich100l.firebaseapp.com",
  projectId: "ich100l",
  storageBucket: "ich100l.firebasestorage.app",
  messagingSenderId: "957173852676",
  appId: "1:957173852676:web:c87374af6a8e02afefa351",
  measurementId: "G-X7T2126SDY"
};
const sourceDatabaseId = "ai-studio-b2216e35-b400-4148-9fd9-9bc1d2ad5f38";

// 2. Target / Main App Firebase Configuration
const targetFirebaseConfig = {
  apiKey: "AIzaSyBsibntRhgtNswlgjxlgKd50yLtdrk3_qw",
  authDomain: "schedulerapp-7f7ca.firebaseapp.com",
  projectId: "schedulerapp-7f7ca",
  storageBucket: "schedulerapp-7f7ca.firebasestorage.app",
  messagingSenderId: "997164861199",
  appId: "1:997164861199:web:99cd39b2925a97cda1a07a",
  measurementId: "G-CVNLW8T9GX"
};

const DEFAULT_PASSWORD = "123456";

async function executeMigration() {
  console.log('================================================================');
  console.log('🚀 Starting User Migration: ich100l -> schedulerapp-7f7ca');
  console.log('================================================================');

  // Step 1: Connect to Source Database
  const sourceApp = initializeApp(sourceFirebaseConfig, 'SourceApp_' + Date.now());
  const sourceDb = getFirestore(sourceApp, sourceDatabaseId);

  console.log(`📡 Fetching users from source database "${sourceDatabaseId}"...`);
  const snap = await getDocs(collection(sourceDb, 'users'));
  console.log(`✅ Retrieved ${snap.docs.length} user documents from source.`);

  // Step 2: Initialize Target Database
  const targetApp = initializeApp(targetFirebaseConfig, 'TargetApp_' + Date.now());
  const targetDb = getFirestore(targetApp);
  const targetAuth = getAuth(targetApp);

  let successCount = 0;
  let skippedCount = 0;
  let errorCount = 0;
  const migratedUsersList: any[] = [];

  for (let i = 0; i < snap.docs.length; i++) {
    const docSnap = snap.docs[i];
    const sourceData = docSnap.data();
    const sourceDocId = docSnap.id;

    let email = (sourceData.email || '').trim().toLowerCase();
    
    // If no email or invalid placeholder, generate standard matric-based email
    if (!email || !email.includes('@') || email === 'undefined') {
      const cleanMatricId = sourceDocId.toLowerCase().replace(/[^a-z0-9]/g, '.');
      email = `student.${cleanMatricId}@student.university.edu`;
      console.log(`ℹ️ [${i+1}/${snap.docs.length}] Generated email for ${sourceDocId}: ${email}`);
    }

    const rawMatric = sourceData.matricNumber || sourceData.matric_number || sourceData.matric || sourceDocId.replace(/-/g, '/');
    const matricNumber = rawMatric.toUpperCase();
    const fullName = sourceData.name || sourceData.displayName || sourceData.fullName || sourceData.full_name || 'Student';
    const department = sourceData.department || (sourceDocId.includes('chm') ? 'Department of Chemistry' : 'Department of Industrial Chemistry');
    const departmentId = sourceData.departmentId || (sourceDocId.includes('chm') ? 'dept-ps-chm' : 'dept-ps-ich');
    const rawLevel = sourceData.level || sourceData.year_level || '100';
    const numLevel = parseInt(String(rawLevel).replace(/[^0-9]/g, '') || '100', 10) || 100;
    const yearLevel = `${numLevel} Level`;
    const isAdmin = Boolean(sourceData.isAdmin || sourceData.isadmin || sourceData.role === 'admin' || email === 'simonodavido@gmail.com' || email === 'admin@gmail.com');
    const isCourseRep = Boolean(sourceData.isCourseRep || sourceData.iscourserep);
    const password = DEFAULT_PASSWORD;

    console.log(`\n⏳ [${i+1}/${snap.docs.length}] Processing: ${email} (${fullName})`);

    let userUid: string | null = null;

    // Step 3: Create Auth User in target Firebase with default password (123456)
    try {
      const userCredential = await createUserWithEmailAndPassword(targetAuth, email, password);
      userUid = userCredential.user.uid;
      console.log(`   ✨ Auth user created! UID: ${userUid}`);
    } catch (authErr: any) {
      if (authErr.code === 'auth/email-already-in-use') {
        console.log(`   ⚠️ User already exists in Auth, signing in to retrieve UID...`);
        try {
          // Try signing in with default password or existing password
          let signinCred;
          try {
            signinCred = await signInWithEmailAndPassword(targetAuth, email, password);
          } catch {
            if (sourceData.password && sourceData.password !== password) {
              signinCred = await signInWithEmailAndPassword(targetAuth, email, sourceData.password);
            }
          }
          if (signinCred) {
            userUid = signinCred.user.uid;
            console.log(`   🔑 Retrieved existing Auth UID: ${userUid}`);
          }
        } catch (signInErr: any) {
          console.warn(`   ⚠️ Sign-in failed: ${signInErr.message}`);
        }
      } else {
        console.error(`   ❌ Auth creation error: ${authErr.code} - ${authErr.message}`);
      }
    }

    // If Auth creation could not return UID (e.g. rate limit or existing without known password),
    // fallback to a deterministic / UUID identifier
    if (!userUid) {
      userUid = 'usr_' + Buffer.from(email).toString('hex').substring(0, 24);
      console.log(`   ℹ️ Using student UID identifier: ${userUid}`);
    }

    // Step 4: Write to Firestore using UID as document ID
    const studentPayload = {
      id: userUid,
      uid: userUid,
      email: email,
      matric_number: matricNumber,
      matricNumber: matricNumber,
      full_name: fullName,
      fullName: fullName,
      department: department,
      department_id: departmentId,
      departmentId: departmentId,
      faculty: 'Physical Sciences',
      level: numLevel,
      year_level: yearLevel,
      yearLevel: yearLevel,
      isadmin: isAdmin,
      isAdmin: isAdmin,
      iscourserep: isCourseRep,
      isCourseRep: isCourseRep,
      seenBroadcasts: sourceData.seenBroadcasts || [],
      biometricsEnrolled: Boolean(sourceData.biometricsEnrolled),
      biometricsEnrolledAt: sourceData.biometricsEnrolledAt || null,
      sourceDocId: sourceDocId,
      migratedFrom: `ich100l/${sourceDatabaseId}`,
      createdAt: sourceData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    try {
      await setDoc(doc(targetDb, 'users', userUid), studentPayload);
      console.log(`   💾 Firestore document written at "users/${userUid}"`);
      successCount++;
      migratedUsersList.push({
        uid: userUid,
        email,
        matricNumber,
        fullName,
        isAdmin,
      });
    } catch (dbErr: any) {
      console.error(`   ❌ Firestore write error for ${userUid}:`, dbErr.message);
      errorCount++;
    }

    // Slight delay to avoid hitting auth rate limits
    await new Promise((res) => setTimeout(res, 80));
  }

  console.log('\n================================================================');
  console.log(`🎉 Migration Completed!`);
  console.log(`   Total Processed: ${snap.docs.length}`);
  console.log(`   Success in Firestore: ${successCount}`);
  console.log(`   Errors: ${errorCount}`);
  console.log('================================================================');

  try {
    await deleteApp(sourceApp);
    await deleteApp(targetApp);
  } catch (e) {}

  process.exit(0);
}

executeMigration().catch((err) => {
  console.error('Fatal migration error:', err);
  process.exit(1);
});
