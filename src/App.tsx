import { useEffect, useLayoutEffect } from 'react';
import { BuilderPage } from './pages/BuilderPage';
import { FeedbackProvider } from './components/FeedbackProvider';
import { useAppStore } from './store/appStore';
import { useBuilderStore } from './store/builderStore';
import { applyShellThemeToDocument } from './theme/shellTheme';

export default function App() {
  const theme = useAppStore((state) => state.theme);

  useLayoutEffect(() => {
    applyShellThemeToDocument(theme);
  }, [theme]);

  useEffect(() => {
    if (!import.meta.env.DEV || typeof window === 'undefined') return;

    const handleError = (event: ErrorEvent) => {
      (window as any).__builderLastError = {
        type: 'error',
        message: event.message,
        stack: event.error?.stack ?? null,
        filename: event.filename ?? null,
        lineno: event.lineno ?? null,
        colno: event.colno ?? null,
        ts: Date.now(),
      };
    };

    const handleRejection = (event: PromiseRejectionEvent) => {
      const reason = event.reason;
      (window as any).__builderLastError = {
        type: 'unhandledrejection',
        message: reason instanceof Error ? reason.message : String(reason),
        stack: reason instanceof Error ? reason.stack : null,
        ts: Date.now(),
      };
    };

    (window as any).__builderStore = useBuilderStore;
    window.addEventListener('error', handleError);
    window.addEventListener('unhandledrejection', handleRejection);

    return () => {
      window.removeEventListener('error', handleError);
      window.removeEventListener('unhandledrejection', handleRejection);
    };
  }, []);

  return (
    <div className="app-shell h-screen w-screen overflow-hidden">
      <FeedbackProvider>
        <BuilderPage />
      </FeedbackProvider>
    </div>
  );
}
