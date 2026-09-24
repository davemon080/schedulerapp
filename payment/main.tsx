import React from 'react';
import ReactDOM from 'react-dom/client';
import { PaymentApp } from './PaymentApp';
import './styles.css';

const rootElement = document.getElementById('root');
if (rootElement) {
  ReactDOM.createRoot(rootElement).render(<PaymentApp />);
}
