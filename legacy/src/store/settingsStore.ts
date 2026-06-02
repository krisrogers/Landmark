import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type UnitsSystem = 'metric' | 'imperial';
export type DateFormat = 'iso' | 'local' | 'relative';

interface SettingsState {
  unitsSystem: UnitsSystem;
  dateFormat: DateFormat;
  showTutorial: boolean;
  hapticFeedback: boolean;
  highContrast: boolean;

  // Actions
  setUnitsSystem: (system: UnitsSystem) => void;
  setDateFormat: (format: DateFormat) => void;
  setShowTutorial: (show: boolean) => void;
  setHapticFeedback: (enabled: boolean) => void;
  setHighContrast: (enabled: boolean) => void;
}

export const useSettingsStore = create<SettingsState>()(
  persist(
    (set) => ({
      unitsSystem: 'metric',
      dateFormat: 'relative',
      showTutorial: true,
      hapticFeedback: true,
      highContrast: false,

      setUnitsSystem: (unitsSystem) => set({ unitsSystem }),
      setDateFormat: (dateFormat) => set({ dateFormat }),
      setShowTutorial: (showTutorial) => set({ showTutorial }),
      setHapticFeedback: (hapticFeedback) => set({ hapticFeedback }),
      setHighContrast: (highContrast) => set({ highContrast }),
    }),
    {
      name: 'landmark-settings',
    }
  )
);
