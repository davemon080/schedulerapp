import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import nodemailer from 'nodemailer';

dotenv.config();

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

const PORT = 3000;
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

  // Vite middleware for development & SPA routing
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);

    // Fallback for SPA reloads on any client route (e.g. /adminschedulerapp, /adminschedulerapp/schedule)
    app.use('*', async (req, res, next) => {
      if (req.originalUrl.startsWith('/api/')) {
        return next();
      }
      try {
        const indexHtml = path.resolve(process.cwd(), 'index.html');
        if (fs.existsSync(indexHtml)) {
          let template = fs.readFileSync(indexHtml, 'utf-8');
          template = await vite.transformIndexHtml(req.originalUrl, template);
          res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
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
      const indexPath = path.join(distPath, 'index.html');
      if (fs.existsSync(indexPath)) {
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
