import { translations } from '../data/translations';
import type { TranslationKeys } from '../data/translations';

export function useTranslation(language: 'en' | 'fr'): TranslationKeys {
  return translations[language] as unknown as TranslationKeys;
}
