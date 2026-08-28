import { initializeApp, deleteApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

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

async function inspectSourceUsers() {
  const sourceApp = initializeApp(sourceFirebaseConfig, 'InspectApp_' + Date.now());
  const sourceDb = getFirestore(sourceApp, sourceDatabaseId);

  const snap = await getDocs(collection(sourceDb, 'users'));
  console.log(`Total user records found: ${snap.docs.length}`);
  
  const userList = snap.docs.map(doc => ({
    sourceDocId: doc.id,
    ...(doc.data() as any)
  }));

  console.log('Users list:');
  userList.forEach((u: any, i) => {
    console.log(`[${i+1}] DocID: ${u.sourceDocId} | Email: ${u.email} | Matric: ${u.matricNumber || u.matric_number || u.matric} | Name: ${u.name || u.displayName || u.fullName || u.full_name} | isAdmin: ${u.isAdmin || u.isadmin} | Level: ${u.level || u.year_level}`);
  });

  await deleteApp(sourceApp);
  process.exit(0);
}


inspectSourceUsers().catch(console.error);
