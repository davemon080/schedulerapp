import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';

// Source Firebase Config provided by user
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

// Target / Main App Firebase Config
const targetFirebaseConfig = {
  apiKey: "AIzaSyBsibntRhgtNswlgjxlgKd50yLtdrk3_qw",
  authDomain: "schedulerapp-7f7ca.firebaseapp.com",
  projectId: "schedulerapp-7f7ca",
  storageBucket: "schedulerapp-7f7ca.firebasestorage.app",
  messagingSenderId: "997164861199",
  appId: "1:997164861199:web:99cd39b2925a97cda1a07a",
  measurementId: "G-CVNLW8T9GX"
};

async function runTestDiscovery() {
  console.log('--- Starting Migration Discovery ---');
  
  // 1. Try connecting to source named database
  console.log(`Connecting to source project "ich100l" with database "${sourceDatabaseId}"...`);
  const sourceApp = initializeApp(sourceFirebaseConfig, 'SourceApp_' + Date.now());
  
  let sourceDb;
  try {
    sourceDb = getFirestore(sourceApp, sourceDatabaseId);
    console.log('Successfully initialized Firestore with named database ID:', sourceDatabaseId);
  } catch (err) {
    console.warn('Failed to initialize with named database ID, trying default:', err);
    sourceDb = getFirestore(sourceApp);
  }

  // Check collections in source
  const possibleCollections = ['users', 'students', 'student_profiles', 'user_profiles', 'accounts'];
  const results: Record<string, any[]> = {};

  for (const colName of possibleCollections) {
    try {
      console.log(`Checking collection "${colName}" in database "${sourceDatabaseId}"...`);
      const snap = await getDocs(collection(sourceDb, colName));
      console.log(`Found ${snap.docs.length} documents in "${colName}"`);
      if (!snap.empty) {
        results[colName] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      }
    } catch (err: any) {
      console.log(`Error checking collection "${colName}" on named database:`, err.message);
    }
  }

  // Also check default database just in case
  console.log('Checking default database "(default)" on ich100l...');
  try {
    const defaultDb = getFirestore(sourceApp);
    for (const colName of possibleCollections) {
      try {
        const snap = await getDocs(collection(defaultDb, colName));
        console.log(`[default db] Found ${snap.docs.length} documents in "${colName}"`);
        if (!snap.empty && (!results[colName] || results[colName].length === 0)) {
          results[`(default)_${colName}`] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        }
      } catch (e: any) {
        console.log(`[default db] Error checking collection "${colName}":`, e.message);
      }
    }
  } catch (e: any) {
    console.log('Default db initialization error:', e.message);
  }

  console.log('Discovery Results summary:', JSON.stringify(results, null, 2));

  await deleteApp(sourceApp);
}

runTestDiscovery().catch(console.error);
