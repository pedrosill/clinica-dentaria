import { createContext } from 'react';

export const LanguageContext = createContext({
  language: 'en',
  locale: 'en-GB',
  setLanguage: () => {},
  t: (value) => value,
});
