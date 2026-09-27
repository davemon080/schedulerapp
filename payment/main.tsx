import React from 'react';
import { createRoot } from 'react-dom/client';
import { PaymentApp } from './PaymentApp';
import './styles.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  createRoot(rootElement).render(<PaymentApp />);
}
