import { initializeApp, getApps, getApp } from 'firebase/app';
import { getFirestore, Firestore } from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getAnalytics, isSupported, Analytics } from 'firebase/analytics';

// Your web app's Firebase configuration from the user request
export const firebaseConfig = {
  apiKey: "AIzaSyBsibntRhgtNswlgjxlgKd50yLtdrk3_qw",
  authDomain: "schedulerapp-7f7ca.firebaseapp.com",
  projectId: "schedulerapp-7f7ca",
  storageBucket: "schedulerapp-7f7ca.firebasestorage.app",
  messagingSenderId: "997164861199",
  appId: "1:997164861199:web:99cd39b2925a97cda1a07a",
  measurementId: "G-CVNLW8T9GX"
};

// Initialize Firebase App singleton
export const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Initialize Firestore
export const db: Firestore = getFirestore(app);

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Initialize Analytics conditionally (safely works in browser/SSR)
let analyticsInstance: Analytics | null = null;
if (typeof window !== 'undefined') {
  isSupported().then((supported) => {
    if (supported) {
      analyticsInstance = getAnalytics(app);
    }
  }).catch(() => {
    // Analytics fallback
  });
}
export const analytics = analyticsInstance;
