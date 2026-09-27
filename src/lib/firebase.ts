import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  persistentSingleTabManager,
  memoryLocalCache,
  getFirestore,
  Firestore,
  doc,
  getDocFromServer,
} from 'firebase/firestore';
import { getAuth, Auth } from 'firebase/auth';
import { getStorage, FirebaseStorage } from 'firebase/storage';
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

// Helper to check if running inside a native mobile app container (Capacitor/Android APK)
export const isNativeMobileApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const isCapacitorNative = Boolean((window as any).Capacitor?.isNativePlatform?.());
  const isCapScheme = window.location.protocol === 'capacitor:' || window.location.protocol === 'ionic:';
  const isCapHost = window.location.hostname === 'localhost' && /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  const isAndroidWebView = /wv|Android.*Version\/[0-9.]+/i.test(navigator.userAgent);
  return isCapacitorNative || isCapScheme || isCapHost || isAndroidWebView;
};

// Initialize Firestore with robust mobile and web configuration
// Uses single tab manager and forced long polling for native mobile / Android WebView containers
// to guarantee instant real-time data connection without hanging on WebSockets.
export const db: Firestore = (() => {
  if (typeof window !== 'undefined') {
    const isMobileNative = isNativeMobileApp();
    try {
      if ('indexedDB' in window) {
        return initializeFirestore(app, {
          localCache: persistentLocalCache({
            tabManager: isMobileNative ? persistentSingleTabManager(undefined) : persistentMultipleTabManager(),
          }),
          experimentalForceLongPolling: isMobileNative,
          experimentalAutoDetectLongPolling: !isMobileNative,
        });
      }
    } catch (cacheErr) {
      console.warn('[Firebase] IndexedDB localCache notice, using fallback cache:', cacheErr);
      try {
        return initializeFirestore(app, {
          localCache: memoryLocalCache(),
          experimentalForceLongPolling: isMobileNative,
          experimentalAutoDetectLongPolling: !isMobileNative,
        });
      } catch {
        return getFirestore(app);
      }
    }
  }
  return getFirestore(app);
})();

// Validate connection to Firestore on initial boot
if (typeof window !== 'undefined') {
  (async () => {
    try {
      await getDocFromServer(doc(db, 'test', 'connection'));
    } catch (error) {
      if (error instanceof Error && error.message.includes('the client is offline')) {
        console.warn('[Firebase] Client offline or connecting in background.');
      }
    }
  })();
}

// Initialize Firebase Auth
export const auth: Auth = getAuth(app);

// Initialize Firebase Cloud Storage
export const storage: FirebaseStorage = getStorage(app);

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
