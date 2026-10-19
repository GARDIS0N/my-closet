import {createRoot} from 'react-dom/client';
import App from './App.tsx';
import { AppErrorBoundary } from './components/common/AppErrorBoundary.tsx';
import { registerServiceWorker } from './serviceWorkerRegistration.ts';
import './index.css';

registerServiceWorker();

createRoot(document.getElementById('root')!).render(
  <AppErrorBoundary>
    <App />
  </AppErrorBoundary>
);
