import React, { Component, ErrorInfo, ReactNode, StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import './index.css';

interface ErrorBoundaryProps {
  children: ReactNode;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RootErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error in React application:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '24px', fontFamily: 'system-ui, -apple-system, sans-serif', textAlign: 'center', backgroundColor: '#F4F4F0', minHeight: '100dvh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <div style={{ maxWidth: '420px', width: '100%', background: '#ffffff', padding: '28px', borderRadius: '16px', border: '2px solid #000000', boxShadow: '4px 4px 0 #000000' }}>
            <h2 style={{ fontSize: '20px', fontWeight: '900', color: '#331A6F', marginBottom: '12px' }}>Notify App</h2>
            <p style={{ fontSize: '14px', color: '#4b5563', marginBottom: '20px', lineHeight: '1.5' }}>
              An unexpected issue occurred while rendering. Please reload the page.
            </p>
            <button
              onClick={() => window.location.reload()}
              style={{ padding: '10px 20px', backgroundColor: '#331A6F', color: '#ffffff', border: '2px solid #000000', borderRadius: '12px', fontWeight: '800', cursor: 'pointer', fontSize: '13px' }}
            >
              Reload Page
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

let isMounted = false;

function mountApp() {
  if (isMounted) return;
  const rootEl = document.getElementById('root');
  if (!rootEl) {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', mountApp, { once: true });
    } else {
      setTimeout(mountApp, 20);
    }
    return;
  }

  isMounted = true;
  createRoot(rootEl).render(
    <StrictMode>
      <RootErrorBoundary>
        <App />
      </RootErrorBoundary>
    </StrictMode>,
  );
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', mountApp, { once: true });
} else {
  mountApp();
}
