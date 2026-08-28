import { initializeApp } from 'firebase/app';
import { getFirestore, collection, getDocs } from 'firebase/firestore';

const targetFirebaseConfig = {
  apiKey: "AIzaSyBsibntRhgtNswlgjxlgKd50yLtdrk3_qw",
  authDomain: "schedulerapp-7f7ca.firebaseapp.com",
  projectId: "schedulerapp-7f7ca",
  storageBucket: "schedulerapp-7f7ca.firebasestorage.app",
  messagingSenderId: "997164861199",
  appId: "1:997164861199:web:99cd39b2925a97cda1a07a",
  measurementId: "G-CVNLW8T9GX"
};

async function checkTargetUsers() {
  const targetApp = initializeApp(targetFirebaseConfig, 'CheckTarget_' + Date.now());
  const targetDb = getFirestore(targetApp);

  const snap = await getDocs(collection(targetDb, 'users'));
  console.log(`========================================`);
  console.log(`Total migrated users in target database: ${snap.docs.length}`);
  console.log(`========================================`);
  snap.docs.slice(0, 10).forEach((d, i) => {
    const data = d.data();
    console.log(`[${i+1}] UID (doc.id): ${d.id} | Email: ${data.email} | Matric: ${data.matric_number || data.matricNumber} | Name: ${data.full_name || data.fullName}`);
  });
  process.exit(0);
}

checkTargetUsers().catch((e) => {
  console.error(e);
  process.exit(1);
});
