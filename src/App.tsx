import { useLayoutEffect } from 'react';
import { BuilderPage } from './pages/BuilderPage';
import { FeedbackProvider } from './components/FeedbackProvider';
import { useAppStore } from './store/appStore';
import { applyShellThemeToDocument } from './theme/shellTheme';

export default function App() {
  const theme = useAppStore((state) => state.theme);

  useLayoutEffect(() => {
    applyShellThemeToDocument(theme);
  }, [theme]);

  return (
    <div className="app-shell h-screen w-screen overflow-hidden">
      <FeedbackProvider>
        <BuilderPage />
      </FeedbackProvider>
    </div>
  );
}
