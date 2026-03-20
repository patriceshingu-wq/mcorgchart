import { useState, useEffect, useRef } from 'react';
import type { AppSettings } from '../types';
import { DEFAULT_SETTINGS } from '../data/seedData';
import {
  loadSettings as loadSettingsFromService,
  saveSettings as saveSettingsToService,
} from '../lib/dataService';

const DEBOUNCE_MS = 500;

export function useSettings() {
  const [settings, setSettings] = useState<AppSettings>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);
  const debounceTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const initialLoadDone = useRef(false);

  // Load settings on mount
  useEffect(() => {
    async function load() {
      try {
        const loaded = await loadSettingsFromService();
        setSettings(loaded);
        initialLoadDone.current = true;
      } catch (error) {
        console.error('Error loading settings:', error);
        setSettings(DEFAULT_SETTINGS);
        initialLoadDone.current = true;
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, []);

  // Debounced save
  useEffect(() => {
    // Don't save during initial load
    if (!initialLoadDone.current) return;

    if (debounceTimer.current) {
      clearTimeout(debounceTimer.current);
    }
    debounceTimer.current = setTimeout(() => {
      saveSettingsToService(settings).catch(err => {
        console.error('Error saving settings:', err);
      });
    }, DEBOUNCE_MS);

    return () => {
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
    };
  }, [settings]);

  function updateSettings(patch: Partial<AppSettings>) {
    setSettings(prev => ({ ...prev, ...patch }));
  }

  return { settings, updateSettings, isLoading };
}
