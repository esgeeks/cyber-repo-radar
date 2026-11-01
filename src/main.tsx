import '@fontsource-variable/inter';
import '@fontsource-variable/jetbrains-mono';
import './index.css';
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { TranslationProvider } from './hooks/useTranslation';
import { I18nProvider, redirectToPreferredLocale } from './i18n';

if (!redirectToPreferredLocale()) {
  createRoot(document.getElementById('root')!).render(
    <StrictMode>
      <I18nProvider>
        <TranslationProvider>
          <App />
        </TranslationProvider>
      </I18nProvider>
    </StrictMode>,
  );
}
