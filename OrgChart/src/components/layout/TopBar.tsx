import React from 'react';
import { Church } from 'lucide-react';
import { cn } from '../../lib/utils';
import type { AppSettings, ActivePage } from '../../types';
import type { TranslationKeys } from '../../data/translations';

interface TopBarProps {
  settings: AppSettings;
  activePage: ActivePage;
  onPageChange: (page: ActivePage) => void;
  onLanguageChange: (lang: 'en' | 'fr') => void;
  t: TranslationKeys;
}

const NAV_PAGES: { key: ActivePage; labelKey: keyof TranslationKeys }[] = [
  { key: 'org-chart', labelKey: 'orgChart' },
  { key: 'export', labelKey: 'export' },
  { key: 'settings', labelKey: 'settings' },
];

export function TopBar({ settings, activePage, onPageChange, onLanguageChange, t }: TopBarProps) {
  return (
    <header className="flex h-14 items-center border-b border-slate-200 bg-white px-4 gap-4 flex-shrink-0 no-print">
      {/* Left: Church branding */}
      <div className="flex items-center gap-2.5 min-w-0 flex-shrink-0">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-slate-900 text-white flex-shrink-0">
          <Church className="h-4 w-4" />
        </div>
        <div className="min-w-0">
          <div className="text-xs font-semibold tracking-wide text-slate-900 truncate leading-tight">{settings.churchName}</div>
          <div className="text-[10px] text-slate-500 truncate leading-tight">{settings.appTitle}</div>
        </div>
      </div>

      {/* Center: Nav */}
      <nav className="flex items-center gap-1 flex-1 justify-center">
        {NAV_PAGES.map(({ key, labelKey }) => (
          <button
            key={key}
            onClick={() => onPageChange(key)}
            className={cn(
              'px-4 py-1.5 rounded-lg text-sm font-medium transition-colors',
              activePage === key
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-100',
            )}
          >
            {t[labelKey] as string}
          </button>
        ))}
      </nav>

      {/* Right: Language toggle */}
      <div className="flex items-center border border-slate-200 rounded-lg overflow-hidden flex-shrink-0">
        {(['en', 'fr'] as const).map(lang => (
          <button
            key={lang}
            onClick={() => onLanguageChange(lang)}
            className={cn(
              'px-3 py-1.5 text-xs font-semibold transition-colors',
              settings.language === lang
                ? 'bg-slate-900 text-white'
                : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50',
            )}
          >
            {lang.toUpperCase()}
          </button>
        ))}
      </div>
    </header>
  );
}
