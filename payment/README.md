# Semester Access Payment Webpage

This directory is a complete, self-contained standalone webpage for processing university semester access fees via Paystack.

## Features
- **Standalone Web Application**: Complete with its own `index.html`, `main.tsx`, `PaymentApp.tsx`, and `styles.css`.
- **Paystack Integration**: Supports both standard redirect checkout (`authorization_url`) and inline popup modal (`PaystackPop.setup`).
- **Student Parameter Detection**: Automatically reads student matric, name, email, department, level, and return URL from query strings:
  `?student=2025/PS/ICH/0001&name=Adebayo+Ogunlesi&email=adebayo@university.edu&returnUrl=https://scheduler.app/`
- **Fallback Account Search**: Allows students without a direct session to search by matric number or email in real-time.
- **Access Activation**: Automatically updates Firestore `students`, `semester_access`, and `wallet_transactions` records upon verified transaction.
- **Digital Receipt Generator**: Generates verifiable PNG receipt, shareable link, and print version.
- **Automatic & Manual Redirect**: Returns students directly back to the specified `returnUrl` (or Scheduler App root) with payment confirmation.

## Hosting & Deployment
When deploying this page independently:
- Set your web server root, Vercel root, or Netlify publish directory to `payment/` (or build with `vite build payment`).
- The page will serve `index.html` as the root entry point.
