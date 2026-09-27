import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';
import { ErrorBoundary } from './components/ErrorBoundary.tsx';

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary fallbackTitle="University Schedule Safe Mode">
    <App />
  </ErrorBoundary>
);
