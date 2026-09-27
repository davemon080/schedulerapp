import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';
import webPush from 'web-push';

dotenv.config();

// VAPID keys for native Web Push API (Android, Chrome, Edge, Safari/iOS)
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  'BHoy9tfmziOVOcP4VtTpaRDqZN_26K2a1pNrC_KxPBYQ_zsZknVGe3tqUgOFlSJkXLP95uTa5PIA2gDN5s02XBU';
const VAPID_PRIVATE_KEY =
  process.env.VAPID_PRIVATE_KEY || 'l65n7jj_glumLgp3ctPFxWndJnVccglcY1L441fi8Yc';
const VAPID_SUBJECT =
  process.env.VAPID_SUBJECT || 'mailto:support@schedulerapp.edu';

try {
  webPush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);
  console.log('[Web Push] VAPID details configured successfully');
} catch (vapidErr) {
  console.warn('[Web Push] VAPID configuration note:', vapidErr);
}

// In-memory + persistent cache for push notification subscriptions
interface PushSubscriptionRecord {
  endpoint: string;
  subscription?: webPush.PushSubscription;
  fcmToken?: string;
  userId?: string;
  matricNumber?: string;
  department?: string;
  level?: string | number;
  platform?: string;
  userAgent?: string;
  timestamp: number;
  active: boolean;
}

const pushSubscriptionsMap = new Map<string, PushSubscriptionRecord>();
const PUSH_STORAGE_FILE = path.join(process.cwd(), 'push_subscriptions_store.json');
// Helper to load persistent subscriptions on startup
function loadStoredPushSubscriptions() {
  try {
    if (fs.existsSync(PUSH_STORAGE_FILE)) {
      const raw = fs.readFileSync(PUSH_STORAGE_FILE, 'utf-8');
      const data = JSON.parse(raw);
      if (Array.isArray(data)) {
        for (const item of data) {
          if (item && item.endpoint) {
            pushSubscriptionsMap.set(item.endpoint, item);
          }
        }
        console.log(`[Web Push] Loaded ${pushSubscriptionsMap.size} active device subscriptions from storage`);
      }
    }
  } catch (err) {
    console.warn('[Web Push] Could not load stored subscriptions:', err);
  }
}

// Helper to persist push subscriptions
function savePushSubscriptionsToDisk() {
  try {
    const list = Array.from(pushSubscriptionsMap.values()).filter((s) => s.active !== false);
    fs.writeFileSync(PUSH_STORAGE_FILE, JSON.stringify(list, null, 2), 'utf-8');
  } catch (err) {
    console.warn('[Web Push] Could not save subscriptions to storage:', err);
  }
}

// Push delivery audit log
interface PushLogItem {
  id: string;
  title: string;
  body: string;
  target: string;
  sentCount: number;
  failureCount: number;
  targetedCount: number;
  timestamp: number;
}
const pushHistoryLogs: PushLogItem[] = [];

// Sync push subscriptions from Firestore push_subscriptions collection
async function syncPushSubscriptionsFromFirestore(): Promise<number> {
  try {
    const url = 'https://firestore.googleapis.com/v1/projects/schedulerapp-7f7ca/databases/(default)/documents/push_subscriptions?pageSize=300';
    const res = await fetch(url);
    if (!res.ok) {
      console.warn(`[Web Push] Firestore fetch error status: ${res.status}`);
      return pushSubscriptionsMap.size;
    }
    const data = await res.json();
    if (data && Array.isArray(data.documents)) {
      let imported = 0;
      for (const doc of data.documents) {
        const fields = doc.fields;
        if (!fields) continue;
        const fcmToken = fields.fcmToken?.stringValue || fields.token?.stringValue;
        const endpoint = fields.endpoint?.stringValue || (fcmToken ? `fcm_${fcmToken.slice(-32)}` : null);
        const active = fields.active?.booleanValue !== false;
        if (!endpoint || !active) continue;

        const subMap = fields.subscription?.mapValue?.fields;
        let subscription: webPush.PushSubscription | undefined = undefined;
        if (subMap) {
          const subEndpoint = subMap.endpoint?.stringValue || endpoint;
          const p256dh = subMap.keys?.mapValue?.fields?.p256dh?.stringValue;
          const auth = subMap.keys?.mapValue?.fields?.auth?.stringValue;
          if (p256dh && auth) {
            subscription = {
              endpoint: subEndpoint,
              keys: {
                p256dh,
                auth,
              },
            };
          }
        }

        const record: PushSubscriptionRecord = {
          endpoint,
          subscription,
          fcmToken: fcmToken || undefined,
          userId: fields.userId?.stringValue || '',
          matricNumber: (fields.matricNumber?.stringValue || '').toUpperCase().trim(),
          department: (fields.department?.stringValue || '').trim(),
          level: fields.level?.integerValue ? Number(fields.level.integerValue) : (fields.level?.stringValue || ''),
          platform: fields.platform?.stringValue || (fcmToken ? 'android' : 'web'),
          userAgent: fields.userAgent?.stringValue || '',
          timestamp: fields.timestamp?.integerValue ? Number(fields.timestamp.integerValue) : Date.now(),
          active: true,
        };

        pushSubscriptionsMap.set(endpoint, record);
        imported++;
      }
      savePushSubscriptionsToDisk();
      console.log(`[Push] Synced ${imported} active push subscriptions from Firestore (total active: ${pushSubscriptionsMap.size})`);
    }
  } catch (err) {
    console.warn('[Push] Error syncing push subscriptions from Firestore:', err);
  }
  return pushSubscriptionsMap.size;
}

// Department matching helper (normalizes ICH, CSC, CHM, full departmental names, and codes)
function matchesDepartment(subDept?: string, reqDept?: string): boolean {
  if (!reqDept || reqDept.trim().toLowerCase() === 'all') return true;
  if (!subDept || !subDept.trim()) return true; // Deliver to unassigned device subscriptions
  const s = subDept.toLowerCase().trim();
  const rawR = reqDept.toLowerCase().trim();
  // Strip dept- or dept_ prefix
  const r = rawR.replace(/^dept[-_]/i, '');
  if (s === r || s === rawR) return true;

  // Check code in string
  if (r.length >= 3 && s.includes(r)) return true;

  // ICH / Industrial Chemistry
  const isReqICH = r.includes('ich') || r.includes('industrial');
  const isSubICH = s.includes('ich') || s.includes('industrial');
  if (isReqICH && isSubICH) return true;

  // CSC / Computer Science
  const isReqCSC = r.includes('csc') || r.includes('computer');
  const isSubCSC = s.includes('csc') || s.includes('computer');
  if (isReqCSC && isSubCSC) return true;

  // CHM / Chemistry
  const isReqCHM = r.includes('chm') || r.includes('chemistry');
  const isSubCHM = s.includes('chm') || s.includes('chemistry');
  if (isReqCHM && isSubCHM) return true;

  // BCH / Biochemistry
  const isReqBCH = r.includes('bch') || r.includes('biochem');
  const isSubBCH = s.includes('bch') || s.includes('biochem');
  if (isReqBCH && isSubBCH) return true;

  // MCB / Microbiology
  const isReqMCB = r.includes('mcb') || r.includes('microbio');
  const isSubMCB = s.includes('mcb') || s.includes('microbio');
  if (isReqMCB && isSubMCB) return true;

  return s.includes(r) || r.includes(s);
}

// Academic level matching helper
function matchesLevel(subLevel?: string | number, reqLevel?: string | number): boolean {
  if (!reqLevel || String(reqLevel).toLowerCase() === 'all') return true;
  if (!subLevel) return true; // Deliver if device has not specified level
  const r = String(reqLevel).replace(/\D/g, '');
  const s = String(subLevel).replace(/\D/g, '');
  if (!r || !s) return true;
  return r === s;
}

loadStoredPushSubscriptions();
syncPushSubscriptionsFromFirestore().catch(() => {});

// Helper to send 6-digit security PIN via email
async function dispatchEmailPin(
  recipientEmail: string,
  pin: string,
  studentName: string
): Promise<{ sent: boolean; provider: string; details?: string }> {
  const emailHtml = `
    <!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Password Reset Security PIN</title>
        <style>
          body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f4f5f7; margin: 0; padding: 24px; color: #1c1c1e; }
          .container { max-width: 480px; margin: 0 auto; background: #ffffff; border-radius: 20px; padding: 32px; box-shadow: 0 4px 20px rgba(0,0,0,0.06); border: 1px solid #e5e7eb; }
          .header { text-align: center; margin-bottom: 24px; }
          .title { font-size: 22px; font-weight: 800; color: #1c1c1e; margin: 12px 0 6px; }
          .subtitle { font-size: 14px; color: #6b7280; margin: 0; }
          .pin-box { background: #f0f7ff; border: 2px dashed #007aff; border-radius: 16px; padding: 20px; text-align: center; margin: 24px 0; }
          .pin-code { font-size: 38px; font-weight: 800; letter-spacing: 8px; color: #007aff; font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace; margin: 0; }
          .pin-expiry { font-size: 12px; color: #6b7280; margin-top: 8px; font-weight: 600; }
          .note { font-size: 13.5px; color: #4b5563; line-height: 1.6; margin: 16px 0; }
          .footer { text-align: center; font-size: 12px; color: #9ca3af; margin-top: 24px; border-top: 1px solid #f3f4f6; padding-top: 16px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h2 class="title">Password Reset Security PIN</h2>
            <p class="subtitle">Academic Timetable & Student Portal</p>
          </div>
          <p class="note">Hello <strong>${studentName || 'Student'}</strong>,</p>
          <p class="note">We received a request to reset your portal password. Please enter the following 6-digit security PIN in the application to verify your account and set your new password:</p>
          
          <div class="pin-box">
            <div class="pin-code">${pin}</div>
            <div class="pin-expiry">Valid for 15 minutes</div>
          </div>
          
          <p class="note">Enter this 6-digit PIN on the verification screen in your app. If you did not request a password reset, you can safely ignore this email.</p>
          
          <div class="footer">
            &copy; ${new Date().getFullYear()} University Student Portal. All rights reserved.
          </div>
        </div>
      </body>
    </html>
  `;

  // Helper to determine the safest 'from' address
  function resolveSenderEmail(isResend: boolean, defaultUser?: string): string {
    const customFrom = (process.env.RESEND_FROM || process.env.SMTP_FROM || '').trim();
    // Use onboarding@resend.dev by default unless a custom verified domain is provided
    if (!customFrom || customFrom.includes('university.edu') || customFrom.includes('example.com') || isResend) {
      if (isResend) {
        return 'University Portal <onboarding@resend.dev>';
      }
      if (defaultUser && defaultUser.includes('@') && !defaultUser.includes('university.edu')) {
        return `"University Portal" <${defaultUser}>`;
      }
      return 'University Portal <onboarding@resend.dev>';
    }
    return customFrom;
  }

  // 1. Try Resend API if API key provided
  const resendApiKey = process.env.RESEND_API_KEY;
  if (resendApiKey) {
    const fromAddress = 'University Portal <onboarding@resend.dev>';
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${resendApiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          from: fromAddress,
          to: [recipientEmail],
          subject: `${pin} is your portal password reset PIN`,
          html: emailHtml,
        }),
      });

      if (res.ok) {
        console.log(`[Email] Dispatched PIN to ${recipientEmail} via Resend API (from: ${fromAddress})`);
        return { sent: true, provider: 'Resend' };
      } else {
        const errorText = await res.text();
        // Silently log info rather than warning to prevent console errors when domains are pending verification
        console.info('[Email] Resend API notice (use native Firebase Auth for client password resets):', errorText);
      }
    } catch (e: any) {
      console.info('[Email] Resend API notice:', e?.message || e);
    }
  }

  // 2. Try SMTP Transport if SMTP parameters configured
  const smtpHost = process.env.SMTP_HOST;
  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;

  if (smtpHost && smtpUser && smtpPass && !smtpHost.includes('university.edu')) {
    const isResendSmtp = smtpHost.includes('resend.com');
    const fromAddress = isResendSmtp ? 'University Portal <onboarding@resend.dev>' : resolveSenderEmail(false, smtpUser);

    try {
      const transporter = nodemailer.createTransport({
        host: smtpHost,
        port: parseInt(process.env.SMTP_PORT || '587', 10),
        secure: process.env.SMTP_PORT === '465',
        auth: {
          user: smtpUser,
          pass: smtpPass,
        },
      });

      await transporter.sendMail({
        from: fromAddress,
        to: recipientEmail,
        subject: `${pin} is your portal password reset PIN`,
        html: emailHtml,
      });

      console.log(`[Email] Dispatched PIN to ${recipientEmail} via SMTP (from: ${fromAddress})`);
      return { sent: true, provider: 'SMTP' };
    } catch (e: any) {
      const errMessage = e?.message || String(e);
      console.info('[Email] SMTP notice (use native Firebase Auth for client password resets):', errMessage);
    }
  }

  // Fallback: logged in Node console
  console.log(`[Password Reset PIN] Security code for ${recipientEmail}: ${pin}`);
  return { sent: false, provider: 'Console/Firestore', details: 'No external email provider configured in environment' };
}

// Ensure uncaught exceptions or unhandled rejections do not crash the Node.js server
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Server] Unhandled Rejection:', reason);
});

let portFromArg = 3000;
const portArgIndex = process.argv.indexOf('--port');
if (portArgIndex !== -1 && process.argv[portArgIndex + 1]) {
  portFromArg = parseInt(process.argv[portArgIndex + 1], 10) || 3000;
} else {
  const portArgEqual = process.argv.find((arg) => arg.startsWith('--port='));
  if (portArgEqual) {
    portFromArg = parseInt(portArgEqual.split('=')[1], 10) || 3000;
  }
}
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : portFromArg;
const FIREBASE_PROJECT_ID = process.env.FIREBASE_PROJECT_ID || 'schedulerapp-7f7ca';

async function startServer() {
  const app = express();
  app.use(express.json());

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'ok',
      service: 'Academic Scheduler & Unified Admin Control Center',
      firebaseProjectId: FIREBASE_PROJECT_ID,
      timestamp: new Date().toISOString(),
    });
  });

  // Firebase connection & status endpoint
  app.get('/api/firebase/status', async (req, res) => {
    res.json({
      status: 'connected',
      projectId: FIREBASE_PROJECT_ID,
      authDomain: 'schedulerapp-7f7ca.firebaseapp.com',
      storageBucket: 'schedulerapp-7f7ca.firebasestorage.app',
      database: 'Cloud Firestore',
      collections: [
        'departments',
        'courses',
        'activities',
        'deadlines',
        'announcements',
        'notifications',
        'users',
        'wallet_transactions',
        'semester_access',
        'feedback',
        'current_semester'
      ]
    });
  });

  // ================= PAYSTACK PAYMENT GATEWAY INTEGRATION =================
  const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || 'sk_test_8f484608f17f460fc8ffb7265f8019cdff7fe892';
  const PAYSTACK_PUBLIC_KEY = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_e9672a354a3fbf8d3e696c1265b29355181a3e11';

  // Get Paystack public config for client-side checkout
  app.get('/api/paystack/config', (req, res) => {
    res.json({
      publicKey: PAYSTACK_PUBLIC_KEY,
      status: 'active',
      currency: 'NGN',
    });
  });

  // Initialize Paystack payment session
  app.post('/api/paystack/initialize', async (req, res) => {
    try {
      const { email, amount, metadata, reference, callback_url } = req.body;
      if (!email || !amount) {
        return res.status(400).json({ status: false, message: 'Email and amount are required' });
      }

      const amountInKobo = Math.round(Number(amount) * 100);
      const generatedRef = reference || `PS_${Date.now()}_${Math.floor(1000 + Math.random() * 9000)}`;

      const paystackRes = await fetch('https://api.paystack.co/transaction/initialize', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: String(email).trim().toLowerCase(),
          amount: amountInKobo,
          reference: generatedRef,
          metadata: metadata || {},
          callback_url: callback_url || undefined,
        }),
      });

      const data = await paystackRes.json();
      if (!data.status) {
        return res.status(400).json({
          status: false,
          message: data.message || 'Paystack initialization failed',
          error: data,
        });
      }

      return res.json({
        status: true,
        message: 'Authorization URL created',
        data: {
          authorization_url: data.data.authorization_url,
          access_code: data.data.access_code,
          reference: data.data.reference || generatedRef,
          publicKey: PAYSTACK_PUBLIC_KEY,
        },
      });
    } catch (err: any) {
      console.error('Paystack initialization error:', err);
      res.status(500).json({ status: false, message: err?.message || 'Server error during Paystack initialization' });
    }
  });

  // Verify Paystack transaction
  app.get('/api/paystack/verify/:reference', async (req, res) => {
    try {
      const { reference } = req.params;
      if (!reference) {
        return res.status(400).json({ status: false, message: 'Transaction reference is required' });
      }

      const verifyRes = await fetch(`https://api.paystack.co/transaction/verify/${encodeURIComponent(reference)}`, {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
          'Content-Type': 'application/json',
        },
      });

      const data = await verifyRes.json();
      if (!data.status) {
        return res.status(400).json({
          status: false,
          message: data.message || 'Transaction verification failed',
        });
      }

      const tx = data.data;
      const isSuccess = tx.status === 'success';

      return res.json({
        status: true,
        success: isSuccess,
        data: {
          id: tx.id,
          reference: tx.reference,
          amount: tx.amount / 100, // converted back from kobo
          currency: tx.currency,
          status: tx.status,
          paid_at: tx.paid_at,
          channel: tx.channel,
          customer: tx.customer,
          gateway_response: tx.gateway_response,
        },
      });
    } catch (err: any) {
      console.error('Paystack verification error:', err);
      res.status(500).json({ status: false, message: err?.message || 'Server error during verification' });
    }
  });

  // ================= ADMIN AUTHENTICATION & ACCESS CONTROL =================
  app.post('/api/admin/auth/login', async (req, res) => {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    try {
      const cleanEmail = String(email).toLowerCase().trim();
      const cleanPass = String(password).trim();
      
      // 1. Primary designated Super Admin check
      if (cleanEmail === 'davemon080@gmail.com' && cleanPass === 'Eroll@12') {
        return res.json({
          success: true,
          user: {
            id: 'admin_davemon080',
            email: 'davemon080@gmail.com',
            fullName: 'David Mon (Super Admin)',
            role: 'Super Administrator',
            isAdmin: true,
            isadmin: true,
            isSuperAdmin: true,
            permissions: [
              'manage_schedule',
              'manage_deadlines',
              'broadcast_notices',
              'manage_students',
              'manage_departments',
              'manage_courses',
              'system_admin'
            ],
            lastLogin: new Date().toISOString(),
          },
          message: 'Admin authentication verified successfully',
        });
      }

      // 2. Reject unauthorized accounts or incorrect password
      return res.status(401).json({
        success: false,
        message: 'Access denied. Account is not authorized as an administrator or password is incorrect.',
      });
    } catch (err: any) {
      console.error('Admin login error:', err);
      res.status(500).json({ success: false, message: err?.message || 'Login failed' });
    }
  });

  // In-memory / server cache for password reset OTP pins
  const activeResetPins: Map<string, { pin: string; expiresAt: number; studentId: string; email: string }> = new Map();

  // Endpoint to send 6-digit password reset PIN to email
  app.post('/api/auth/send-reset-pin', async (req, res) => {
    try {
      const { email, studentId, studentName } = req.body;
      if (!email) {
        return res.status(400).json({ success: false, message: 'Email is required' });
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const pin = req.body.pin ? String(req.body.pin).trim() : Math.floor(100000 + Math.random() * 900000).toString();
      const expiresAt = Date.now() + 15 * 60 * 1000; // 15 minutes

      activeResetPins.set(cleanEmail, {
        pin,
        expiresAt,
        studentId: studentId || cleanEmail,
        email: cleanEmail,
      });

      console.log(`[Password Reset] 6-Digit PIN generated for ${cleanEmail} (${studentName || 'Student'}): ${pin}`);

      // Send email using configured SMTP or Resend provider (with safe fallback)
      const dispatchResult = await dispatchEmailPin(cleanEmail, pin, studentName || 'Student');

      return res.json({
        success: true,
        message: `A 6-digit security PIN has been sent to ${cleanEmail}.`,
        email: cleanEmail,
        pin: pin, // Returned for verification in dev / demo
        dispatched: dispatchResult.sent,
        provider: dispatchResult.provider,
        expiresInMinutes: 15,
      });
    } catch (err: any) {
      console.error('Send reset pin error:', err);
      res.status(500).json({ success: false, message: err?.message || 'Failed to dispatch reset pin' });
    }
  });

  // Endpoint to verify reset PIN
  app.post('/api/auth/verify-reset-pin', (req, res) => {
    try {
      const { email, pin } = req.body;
      if (!email || !pin) {
        return res.status(400).json({ success: false, message: 'Email and PIN are required' });
      }

      const cleanEmail = String(email).toLowerCase().trim();
      const cleanPin = String(pin).trim();
      const record = activeResetPins.get(cleanEmail);

      if (!record) {
        return res.status(400).json({ success: false, message: 'No active reset request found for this email. Please request a new PIN.' });
      }

      if (Date.now() > record.expiresAt) {
        activeResetPins.delete(cleanEmail);
        return res.status(400).json({ success: false, message: 'Reset PIN has expired. Please request a new PIN.' });
      }

      if (record.pin !== cleanPin) {
        return res.status(400).json({ success: false, message: 'Incorrect 6-digit PIN. Please verify the code.' });
      }

      return res.json({
        success: true,
        message: 'PIN verified successfully. You may now set your new password.',
      });
    } catch (err: any) {
      console.error('Verify reset pin error:', err);
      res.status(500).json({ success: false, message: err?.message || 'Failed to verify PIN' });
    }
  });

  // ================= NATIVE PUSH NOTIFICATION API =================

  // 1. Get VAPID public key for Web Push subscription
  app.get('/api/push/config', (_req, res) => {
    res.json({
      vapidPublicKey: VAPID_PUBLIC_KEY,
      status: true,
    });
  });

  // 2. Register native device push subscription
  app.post('/api/push/register', (req, res) => {
    try {
      const {
        subscription,
        endpoint,
        fcmToken,
        token,
        userId,
        matricNumber,
        department,
        level,
        platform,
        userAgent,
      } = req.body;

      const effectiveToken = fcmToken || token;
      const subEndpoint = endpoint || subscription?.endpoint || (effectiveToken ? `fcm_${effectiveToken.slice(-32)}` : null);
      if (!subEndpoint) {
        return res.status(400).json({ success: false, message: 'Valid subscription, FCM token, or endpoint required' });
      }

      const cleanSub = subscription ? (subscription as webPush.PushSubscription) : undefined;
      const record: PushSubscriptionRecord = {
        endpoint: subEndpoint,
        subscription: cleanSub,
        fcmToken: effectiveToken || undefined,
        userId: userId || 'anonymous',
        matricNumber: (matricNumber || '').toUpperCase().trim(),
        department: (department || '').trim(),
        level: level || '',
        platform: platform || (effectiveToken ? 'android' : 'web'),
        userAgent: userAgent || '',
        timestamp: Date.now(),
        active: true,
      };

      pushSubscriptionsMap.set(subEndpoint, record);
      savePushSubscriptionsToDisk();

      console.log(
        `[Web Push] Registered push subscription for ${record.matricNumber || record.userId} (${record.platform}, Dept: ${record.department || 'All'})`
      );

      return res.json({
        success: true,
        message: 'Push subscription registered successfully',
        endpoint: subEndpoint,
        totalSubscribers: pushSubscriptionsMap.size,
      });
    } catch (err: any) {
      console.error('[Web Push] Registration error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Registration failed' });
    }
  });

  // 3. Unregister push subscription (e.g. on user logout)
  app.post('/api/push/unregister', (req, res) => {
    try {
      const { endpoint } = req.body;
      if (endpoint && pushSubscriptionsMap.has(endpoint)) {
        const record = pushSubscriptionsMap.get(endpoint);
        if (record) {
          record.active = false;
        }
        pushSubscriptionsMap.delete(endpoint);
        savePushSubscriptionsToDisk();
        console.log(`[Web Push] Unregistered subscription for endpoint: ${endpoint.slice(-20)}`);
      }
      return res.json({ success: true, message: 'Unregistered successfully' });
    } catch (err: any) {
      console.error('[Web Push] Unregister error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Unregister failed' });
    }
  });

  // 4. Dispatch native push notifications to department students / devices
  app.post('/api/push/send', async (req, res) => {
    try {
      const {
        title,
        body,
        department,
        level,
        url = '/',
        targetMatric,
        targetUserId,
        category = 'schedule',
        priority = 'high',
        broadcastAll,
      } = req.body;

      if (!title || !body) {
        return res.status(400).json({ success: false, message: 'Notification title and body are required' });
      }

      // Always sync fresh subscriptions from Firestore so newly registered student devices receive alerts immediately
      try {
        await syncPushSubscriptionsFromFirestore();
      } catch (syncErr) {
        console.warn('[Web Push] Auto-sync note before dispatch:', syncErr);
      }

      const activeSubscribers = Array.from(pushSubscriptionsMap.values()).filter(
        (s) => s.active !== false && (s.endpoint || s.fcmToken)
      );

      // Filter matching recipients using normalized matching
      let targets = activeSubscribers.filter((s) => {
        // If target matric specified (normalizes slashes, dashes, spaces)
        if (targetMatric) {
          const cleanTarget = targetMatric.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          const cleanSub = (s.matricNumber || '').replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          return cleanSub === cleanTarget;
        }
        // If target user ID specified
        if (targetUserId) {
          return s.userId === targetUserId;
        }
        // If broad broadcast requested or no department specified, deliver to all registered devices
        if (broadcastAll || !department || department.trim().toLowerCase() === 'all') {
          return true;
        }
        // Department filtering (normalizes codes and full names)
        if (!matchesDepartment(s.department, department)) {
          return false;
        }
        // Level filtering
        if (level && !matchesLevel(s.level, level)) {
          return false;
        }
        return true;
      });

      // Fallback: If targeted filtering finds 0 devices (e.g. slight department spelling discrepancy or unassigned student level),
      // fallback to delivering to all active device subscribers so no student misses alerts when app is closed!
      if (targets.length === 0 && activeSubscribers.length > 0 && !targetMatric && !targetUserId) {
        console.log(
          `[Web Push] Department filter (${department || 'None'}) returned 0 targets, falling back to all ${activeSubscribers.length} active device subscribers.`
        );
        targets = activeSubscribers;
      }

      console.log(
        `[Web Push] Dispatching notification "${title}" to ${targets.length} target devices (total pool: ${activeSubscribers.length})`
      );

      const pushPayload = JSON.stringify({
        title: title.trim(),
        body: body.trim(),
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: `activity-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        renotify: true,
        requireInteraction: true,
        data: {
          url,
          category,
          timestamp: Date.now(),
        },
      });

      let sentCount = 0;
      let failureCount = 0;
      const endpointsToPrune: string[] = [];

      await Promise.all(
        targets.map(async (target) => {
          try {
            if (target.subscription?.keys?.p256dh && target.subscription?.keys?.auth) {
              await webPush.sendNotification(target.subscription, pushPayload, {
                TTL: 60 * 60 * 24, // 24 hours
                urgency: priority === 'high' || priority === 'urgent' ? 'high' : 'normal',
              });
            }
            sentCount++;
          } catch (err: any) {
            failureCount++;
            // HTTP 404 or 410 indicates the subscription has expired or is unsubscribed
            if (err.statusCode === 404 || err.statusCode === 410) {
              endpointsToPrune.push(target.endpoint);
            } else {
              console.warn(`[Push] Delivery warning for ${target.matricNumber || 'device'}:`, err?.message || err);
            }
          }
        })
      );

      // Clean up dead subscriptions
      if (endpointsToPrune.length > 0) {
        for (const ep of endpointsToPrune) {
          pushSubscriptionsMap.delete(ep);
        }
        savePushSubscriptionsToDisk();
        console.log(`[Web Push] Pruned ${endpointsToPrune.length} expired subscriptions`);
      }

      // Record to audit logs
      const logEntry: PushLogItem = {
        id: `push_${Date.now()}`,
        title: title.trim(),
        body: body.trim(),
        target: targetMatric ? `Student: ${targetMatric}` : department ? `Dept: ${department} (Lvl: ${level || 'All'})` : 'All Devices',
        sentCount,
        failureCount,
        targetedCount: targets.length,
        timestamp: Date.now(),
      };
      pushHistoryLogs.unshift(logEntry);
      if (pushHistoryLogs.length > 50) pushHistoryLogs.pop();

      return res.json({
        success: true,
        sentCount,
        failureCount,
        targetedCount: targets.length,
        message: `Push delivered to ${sentCount} devices`,
      });
    } catch (err: any) {
      console.error('[Web Push] Send error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Failed to dispatch push' });
    }
  });

  // 5. Query all registered device push subscriptions (for Admin Control Center)
  app.get('/api/push/subscriptions', async (_req, res) => {
    try {
      await syncPushSubscriptionsFromFirestore().catch(() => {});
      const activeSubscribers = Array.from(pushSubscriptionsMap.values()).filter(
        (s) => s.active !== false && (s.endpoint || s.fcmToken)
      );

      const byDept: Record<string, number> = {};
      const byLevel: Record<string, number> = {};
      const byPlatform: Record<string, number> = {};

      for (const s of activeSubscribers) {
        const d = (s.department || 'Unassigned').trim();
        byDept[d] = (byDept[d] || 0) + 1;
        const l = s.level ? `${s.level}L` : 'Unassigned';
        byLevel[l] = (byLevel[l] || 0) + 1;
        const p = s.platform || 'web';
        byPlatform[p] = (byPlatform[p] || 0) + 1;
      }

      return res.json({
        success: true,
        total: activeSubscribers.length,
        devices: activeSubscribers.map((s) => ({
          endpoint: s.endpoint,
          userId: s.userId || '',
          matricNumber: s.matricNumber || '',
          department: s.department || '',
          level: s.level || '',
          platform: s.platform || 'web',
          userAgent: s.userAgent || '',
          timestamp: s.timestamp || Date.now(),
          active: s.active !== false,
        })),
        byDepartment: byDept,
        byLevel: byLevel,
        byPlatform: byPlatform,
      });
    } catch (err: any) {
      console.error('[Web Push] Subscriptions query error:', err);
      return res.status(500).json({ success: false, message: err?.message });
    }
  });

  // 6. Send test push notification to a specific device or the latest registered device
  app.post('/api/push/test', async (req, res) => {
    try {
      const { endpoint } = req.body;
      let target: PushSubscriptionRecord | undefined;

      if (endpoint && pushSubscriptionsMap.has(endpoint)) {
        target = pushSubscriptionsMap.get(endpoint);
      } else {
        // Pick the latest registered active subscriber
        const list = Array.from(pushSubscriptionsMap.values()).filter((s) => s.active !== false);
        list.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));
        target = list[0];
      }

      if (!target || !target.subscription) {
        return res.status(404).json({
          success: false,
          message: 'No registered devices found. Enable notifications in the app first to register your device.',
        });
      }

      const testPayload = JSON.stringify({
        title: '🔔 Test Push Notification',
        body: `Test alert received at ${new Date().toLocaleTimeString()} on ${target.platform || 'device'}. Push delivery verified!`,
        icon: '/logo-192.png',
        badge: '/logo-192.png',
        tag: `test-${Date.now()}`,
        renotify: true,
        data: {
          url: '/',
          category: 'system',
          timestamp: Date.now(),
        },
      });

      await webPush.sendNotification(target.subscription, testPayload, {
        TTL: 60,
        urgency: 'high',
      });

      return res.json({
        success: true,
        message: `Test push sent successfully to ${target.matricNumber || target.platform || 'device'}!`,
        targetDevice: target.matricNumber || target.userId,
      });
    } catch (err: any) {
      console.error('[Web Push] Test push error:', err);
      return res.status(500).json({ success: false, message: err?.message || 'Failed to dispatch test push' });
    }
  });

  // 7. Get push dispatch history logs
  app.get('/api/push/history', (_req, res) => {
    res.json({
      success: true,
      logs: pushHistoryLogs,
      totalDispatched: pushHistoryLogs.reduce((acc, l) => acc + l.sentCount, 0),
    });
  });

  // Alias compatibility route for legacy broadcast push dispatch
  app.post('/api/send-broadcast-push', async (req, res) => {
    try {
      req.url = '/api/push/send';
      // Forward to /api/push/send
      const sendHandler = (app as any)._router.stack.find(
        (s: any) => s.route && s.route.path === '/api/push/send' && s.route.methods.post
      );
      if (sendHandler) {
        return sendHandler.handle(req, res);
      }
      return res.json({ success: true, message: 'Processed via push dispatcher' });
    } catch (e: any) {
      return res.status(500).json({ success: false, message: e?.message });
    }
  });

  // Serve static assets from public/ folder directly
  app.use(express.static(path.join(process.cwd(), 'public')));

  // Vite middleware for development & SPA routing
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for SPA reloads on any client route (e.g. /adminschedulerapp, /payment/)
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      try {
        const isPayment = 
          req.path === '/payment' || 
          req.path.startsWith('/payment/') ||
          req.path === '/payment-checkout' ||
          req.path.startsWith('/payment-checkout/') ||
          req.path === '/pay' ||
          req.path.startsWith('/pay/');
        const targetHtml = isPayment
          ? path.resolve(process.cwd(), 'payment/index.html')
          : path.resolve(process.cwd(), 'index.html');
        const fileToUse = fs.existsSync(targetHtml) ? targetHtml : path.resolve(process.cwd(), 'index.html');

        if (fs.existsSync(fileToUse)) {
          let template = fs.readFileSync(fileToUse, 'utf-8');
          const transformUrl = isPayment ? '/payment/index.html' : req.originalUrl;
          template = await vite.transformIndexHtml(transformUrl, template);
          res.status(200).set({
            'Content-Type': 'text/html',
            'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
            'Pragma': 'no-cache',
            'Expires': '0',
          }).end(template);
        } else {
          next();
        }
      } catch (e) {
        vite.ssrFixStacktrace(e as Error);
        next(e);
      }
    });
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      const isPayment = 
        req.originalUrl.startsWith('/payment') ||
        req.originalUrl.startsWith('/payment-checkout') ||
        req.originalUrl.startsWith('/pay');
      const paymentPath = path.join(distPath, 'payment', 'index.html');
      const indexPath = path.join(distPath, 'index.html');
      res.set({
        'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0',
      });
      if (isPayment && fs.existsSync(paymentPath)) {
        res.sendFile(paymentPath);
      } else if (fs.existsSync(indexPath)) {
        res.sendFile(indexPath);
      } else {
        res.status(200).send('<!DOCTYPE html><html><head><title>Scheduler</title></head><body><div id="root"></div><script type="module" src="/src/main.tsx"></script></body></html>');
      }
    });
  }

  // Global express error handler so nothing crashes
  app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
    console.error('[Server Error Handler]:', err);
    if (res.headersSent) {
      return next(err);
    }
    res.status(500).json({ error: 'Internal Server Error', message: err?.message || 'Server error' });
  });

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Firebase Firestore-connected Server running on http://0.0.0.0:${PORT} (Project: ${FIREBASE_PROJECT_ID})`);
  });
}

startServer();
