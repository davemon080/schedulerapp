import express from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';

dotenv.config();

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
