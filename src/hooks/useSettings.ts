import { useState, useEffect } from 'react';
import type { AppSettings } from '../types';
import { SEED_SETTINGS } from '../data/seedData';

const SETTINGS_KEY = 'mont-carmel-settings-v1';

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(() => {
    try {
      const raw = localStorage.getItem(SETTINGS_KEY);
      if (raw) return { ...SEED_SETTINGS, ...JSON.parse(raw) };
    } catch {
      // ignore
    }
    return SEED_SETTINGS;
  });

  useEffect(() => {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
  }, [settings]);

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings(prev => ({ ...prev, ...patch }));
  }

  return { settings, updateSettings };
}
