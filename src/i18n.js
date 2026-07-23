// i18n setup. All user-facing strings live in locales/*.json and are read via
// t()/useTranslation — no hardcoded copy in components. Add a locale by importing
// its JSON here and registering it under resources.
import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en.json';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
  },
  lng: 'en',
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

export default i18n;
